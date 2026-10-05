const WINDOW_MS = 60 * 60 * 1000;
const hitsByUser = new Map();

/** @returns {{ allowed: true } | { allowed: false, retryAfterSeconds: number }} */
export function checkAiRateLimit(userId) {
  const limit = Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 60);
  if (!Number.isFinite(limit) || limit <= 0) return { allowed: true };

  const now = Date.now();
  const hits = (hitsByUser.get(userId) || []).filter((time) => now - time < WINDOW_MS);
  if (hits.length >= limit) {
    hitsByUser.set(userId, hits);
    return { allowed: false, retryAfterSeconds: Math.ceil((hits[0] + WINDOW_MS - now) / 1000) };
  }

  hits.push(now);
  hitsByUser.set(userId, hits);
  return { allowed: true };
}
