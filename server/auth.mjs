import { createRemoteJWKSet, jwtVerify } from "jose";

function issuer() {
  return process.env.OIDC_ISSUER?.replace(/\/$/, "");
}

let cachedJwks = null;
let cachedJwksIssuer = null;

function getJwks() {
  const current = issuer();
  if (!current) return null;
  if (cachedJwksIssuer !== current) {
    cachedJwks = createRemoteJWKSet(new URL(`${current}/.well-known/jwks.json`));
    cachedJwksIssuer = current;
  }
  return cachedJwks;
}

function logAuthEvent(event, details) {
  console.log(`[auth] ${new Date().toISOString()} ${event}`, JSON.stringify(details));
}

/** Visszaad { userId } objektumot, vagy { status, error } hibát. */
export async function authenticate(request) {
  const jwks = getJwks();
  if (!jwks) return { status: 503, error: "A bejelentkezés nincs beállítva." };

  const match = (request.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return { status: 401, error: "Bejelentkezés szükséges." };

  try {
    const audience = process.env.OIDC_AUDIENCE || undefined;
    const { payload } = await jwtVerify(match[1], jwks, { issuer: issuer(), ...(audience ? { audience } : {}) });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return { status: 401, error: "Érvénytelen token." };
    }
    return { userId: payload.sub };
  } catch {
    return { status: 401, error: "Érvénytelen vagy lejárt token." };
  }
}

async function exchangeWithPocketId(grantParams) {
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  if (!issuer() || !clientId || !clientSecret) {
    return { status: 503, body: JSON.stringify({ error: "A bejelentkezés nincs beállítva." }) };
  }

  const response = await fetch(`${issuer()}/api/oidc/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...grantParams }),
  });
  return { status: response.status, body: await response.text() };
}

export async function handleAuthToken(body) {
  const configuredRedirectUri = process.env.OIDC_REDIRECT_URI;
  if (!configuredRedirectUri) {
    logAuthEvent("token.config_missing", {});
    return { status: 503, body: JSON.stringify({ error: "A bejelentkezés nincs beállítva." }) };
  }

  const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = body;
  if (typeof code !== "string" || typeof codeVerifier !== "string" || redirectUri !== configuredRedirectUri) {
    logAuthEvent("token.invalid_request", { hasCode: typeof code === "string", redirectUriMatches: redirectUri === configuredRedirectUri });
    return { status: 400, body: JSON.stringify({ error: "Érvénytelen token kérés." }) };
  }

  try {
    const result = await exchangeWithPocketId({
      grant_type: "authorization_code",
      code,
      redirect_uri: configuredRedirectUri,
      code_verifier: codeVerifier,
    });
    logAuthEvent(result.status === 200 ? "token.success" : "token.failed", { status: result.status });
    return result;
  } catch (error) {
    logAuthEvent("token.error", { message: error.message });
    return { status: 502, body: JSON.stringify({ error: "A bejelentkezési szerver nem érhető el." }) };
  }
}

export async function handleAuthRefresh(body) {
  const refreshToken = body.refresh_token;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    logAuthEvent("refresh.invalid_request", {});
    return { status: 400, body: JSON.stringify({ error: "Érvénytelen frissítési kérés." }) };
  }

  try {
    const result = await exchangeWithPocketId({ grant_type: "refresh_token", refresh_token: refreshToken });
    logAuthEvent(result.status === 200 ? "refresh.success" : "refresh.failed", { status: result.status });
    return result;
  } catch (error) {
    logAuthEvent("refresh.error", { message: error.message });
    return { status: 502, body: JSON.stringify({ error: "A bejelentkezési szerver nem érhető el." }) };
  }
}
