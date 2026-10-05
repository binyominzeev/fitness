import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAiChatRequest } from "./aiChat.mjs";
import { authenticate, handleAuthRefresh, handleAuthToken } from "./auth.mjs";
import { isDataKey, loadUserData, saveUserData } from "./db.mjs";
import { checkAiRateLimit } from "./rateLimit.mjs";

const PORT = Number(process.env.PORT) || 8787;
const MAX_BODY_BYTES = 200_000;
const MAX_DATA_BODY_BYTES = 400_000;
const DIST_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// JSON és application/x-www-form-urlencoded törzset is olvas (az auth végpontok űrlapot kapnak).
function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("A kérés túl nagy."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if ((request.headers["content-type"] || "").startsWith("application/x-www-form-urlencoded")) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("A kérés törzse nem érvényes JSON."));
      }
    });

    request.on("error", reject);
  });
}

async function sendFile(response, filePath) {
  const fileStat = await stat(filePath);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
    "Content-Length": fileStat.size,
  });
  createReadStream(filePath).pipe(response);
}

async function serveStatic(request, response, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  // path.normalize eltávolítja a "../" szegmenseket, az startsWith ellenőrzés a maradék path traversal ellen véd
  const safeRelativePath = path.normalize(decodedPath).replace(/^([/\\]?\.\.[/\\])+/, "");
  const requestedPath = path.join(DIST_DIR, safeRelativePath);

  if (requestedPath !== DIST_DIR && !requestedPath.startsWith(DIST_DIR + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(requestedPath);
    await sendFile(response, fileStat.isDirectory() ? path.join(requestedPath, "index.html") : requestedPath);
  } catch {
    try {
      // SPA fallback: ismeretlen útvonalakhoz (kliensoldali routing) az index.html-t adjuk vissza
      await sendFile(response, path.join(DIST_DIR, "index.html"));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  }
}

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  response.end(JSON.stringify(payload));
}

async function readBodyOrFail(request, response, maxBytes) {
  try {
    return await readJsonBody(request, maxBytes);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Hibás kérés." });
    return undefined;
  }
}

async function requireUser(request, response) {
  const auth = await authenticate(request);
  if (!auth.userId) {
    sendJson(response, auth.status, { error: auth.error });
    return undefined;
  }
  return auth.userId;
}

async function handleAiChatHttp(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Csak POST kérés engedélyezett." });
    return;
  }

  const userId = await requireUser(request, response);
  if (!userId) return;

  const limit = checkAiRateLimit(userId);
  if (!limit.allowed) {
    sendJson(response, 429, { error: "Túl sok AI-kérés, próbáld később." }, { "Retry-After": String(limit.retryAfterSeconds) });
    return;
  }

  const body = await readBodyOrFail(request, response);
  if (body === undefined) return;

  const { status, payload } = await handleAiChatRequest(body);
  sendJson(response, status, payload);
}

async function handleAuthHttp(request, response, handler) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Csak POST kérés engedélyezett." });
    return;
  }

  const body = await readBodyOrFail(request, response);
  if (body === undefined) return;

  const { status, body: payload } = await handler(body);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(payload);
}

async function handleDataHttp(request, response, pathname) {
  const userId = await requireUser(request, response);
  if (!userId) return;

  if (pathname === "/api/data" && request.method === "GET") {
    sendJson(response, 200, { data: loadUserData(userId) });
    return;
  }

  const key = pathname.startsWith("/api/data/") ? pathname.slice("/api/data/".length) : "";
  if (request.method === "PUT" && isDataKey(key)) {
    const body = await readBodyOrFail(request, response, MAX_DATA_BODY_BYTES);
    if (body === undefined) return;

    if (!saveUserData(userId, key, body.value)) {
      sendJson(response, 400, { error: "Érvénytelen adat." });
      return;
    }
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, isDataKey(key) || pathname === "/api/data" ? 405 : 404, { error: "Ismeretlen végpont." });
}

const server = http.createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");

  try {
    if (pathname === "/api/ai/chat") {
      await handleAiChatHttp(request, response);
      return;
    }

    if (pathname === "/api/auth/token") {
      await handleAuthHttp(request, response, handleAuthToken);
      return;
    }

    if (pathname === "/api/auth/refresh") {
      await handleAuthHttp(request, response, handleAuthRefresh);
      return;
    }

    if (pathname === "/api/data" || pathname.startsWith("/api/data/")) {
      await handleDataHttp(request, response, pathname);
      return;
    }
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: "Szerverhiba." });
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response, pathname);
    return;
  }

  response.writeHead(404);
  response.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Fitness app fut: http://localhost:${PORT} (API: /api/ai/chat, /api/auth/*, /api/data)`);
});
