import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAiChatRequest } from "./aiChat.mjs";

const PORT = Number(process.env.PORT) || 8787;
const MAX_BODY_BYTES = 200_000;
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

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
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
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
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

async function handleAiChatHttp(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "POST") {
    response.writeHead(405);
    response.end(JSON.stringify({ error: "Csak POST kérés engedélyezett." }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    response.writeHead(400);
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Hibás kérés." }));
    return;
  }

  const { status, payload } = await handleAiChatRequest(body);
  response.writeHead(status);
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");

  if (pathname === "/api/ai/chat") {
    await handleAiChatHttp(request, response);
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
  console.log(`Fitness app fut: http://localhost:${PORT} (API: /api/ai/chat)`);
});
