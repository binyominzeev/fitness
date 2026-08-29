import http from "node:http";
import { handleAiChatRequest } from "./aiChat.mjs";

const PORT = Number(process.env.PORT) || 8787;
const MAX_BODY_BYTES = 200_000;

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

const server = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.url !== "/api/ai/chat") {
    response.writeHead(404);
    response.end(JSON.stringify({ error: "Ismeretlen végpont." }));
    return;
  }

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
});

server.listen(PORT, () => {
  console.log(`AI edző API szerver fut: http://localhost:${PORT}/api/ai/chat`);
});
