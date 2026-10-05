const issuer = String(import.meta.env.VITE_OIDC_ISSUER ?? "").replace(/\/$/, "");
const clientId = String(import.meta.env.VITE_OIDC_CLIENT_ID ?? "");

const TOKEN_KEY = "fitness.accessToken";
const REFRESH_KEY = "fitness.refreshToken";
const USER_NAME_KEY = "fitness.userName";
const VERIFIER_KEY = "fitness.pkceVerifier";
const RETURN_PATH_KEY = "fitness.returnPath";

export type AuthState = {
  authenticated: boolean;
  userId: string;
  userName: string;
  error: string;
};

type Claims = { sub?: string; exp?: number; name?: string; preferred_username?: string; email?: string; nickname?: string };

type TokenResponse = { access_token?: string; refresh_token?: string; id_token?: string };

let accessToken = localStorage.getItem(TOKEN_KEY);
let refreshToken = localStorage.getItem(REFRESH_KEY);
let refreshTimer: number | undefined;
let refreshInFlight: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;

let state: AuthState = { authenticated: false, userId: "", userName: "", error: "" };
const listeners = new Set<() => void>();

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthState(): AuthState {
  return state;
}

function decodeJwtPayload(token: string): Claims {
  try {
    const normalized = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as Claims;
  } catch {
    return {};
  }
}

function displayName(claims: Claims): string {
  return claims.name || claims.preferred_username || claims.email || claims.nickname || "felhasználó";
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// Pontosan egyeznie kell a backend OIDC_REDIRECT_URI értékével és a Pocket ID-ban regisztrálttal.
function redirectUri(): string {
  return `${window.location.origin}/`;
}

function applyTokens(tokens: TokenResponse) {
  if (!tokens.access_token) throw new Error("A bejelentkezés nem adott hozzáférési tokent.");

  accessToken = tokens.access_token;
  if (tokens.refresh_token) refreshToken = tokens.refresh_token;
  const claims = decodeJwtPayload(tokens.id_token || accessToken);
  const accessClaims = decodeJwtPayload(accessToken);
  const userId = accessClaims.sub || claims.sub || "";
  if (!userId) throw new Error("A token nem tartalmaz felhasználóazonosítót.");

  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_NAME_KEY, displayName(claims));
  scheduleRefresh(accessClaims.exp);
  setState({ authenticated: true, userId, userName: displayName(claims), error: "" });
}

function scheduleRefresh(exp: number | undefined) {
  window.clearTimeout(refreshTimer);
  if (!exp || !refreshToken) return;
  // 60 mp-cel lejárat előtt frissítünk, hogy az API sose lásson lejárt tokent.
  const delay = Math.max(exp * 1000 - Date.now() - 60_000, 5_000);
  refreshTimer = window.setTimeout(() => {
    refreshAccessToken().catch(() => undefined);
  }, delay);
}

function refreshAccessToken(): Promise<void> {
  if (!refreshToken) return Promise.reject(new Error("Nincs refresh token."));
  if (refreshInFlight) return refreshInFlight;

  const token = refreshToken;
  refreshInFlight = (async () => {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: token }),
    });
    if (!response.ok) throw new Error(`A token frissítése sikertelen (${response.status}).`);
    applyTokens((await response.json()) as TokenResponse);
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function login(): Promise<void> {
  try {
    if (!issuer || !clientId) throw new Error("A bejelentkezés nincs beállítva (VITE_OIDC_*).");

    const discovery = await fetch(`${issuer}/.well-known/openid-configuration`);
    if (!discovery.ok) throw new Error("Az OIDC discovery sikertelen.");
    const metadata = (await discovery.json()) as { authorization_endpoint: string };

    const verifier = createVerifier();
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(RETURN_PATH_KEY, `${window.location.pathname}${window.location.search}`);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri(),
      // offline_access nélkül nem érkezik refresh token.
      scope: "openid profile email offline_access",
      state: verifier,
      code_challenge: await createCodeChallenge(verifier),
      code_challenge_method: "S256",
    });
    window.location.assign(`${metadata.authorization_endpoint}?${params}`);
  } catch (error) {
    setState({ error: error instanceof Error ? error.message : "A bejelentkezés sikertelen." });
  }
}

export function logout(): void {
  accessToken = null;
  refreshToken = null;
  window.clearTimeout(refreshTimer);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  setState({ authenticated: false, userId: "", userName: "", error: "" });
}

async function handleCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const callbackError = params.get("error");
  const code = params.get("code");
  if (!callbackError && !code) return;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const returnPath = sessionStorage.getItem(RETURN_PATH_KEY) || "/";
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
  // A code egyszer használható; az URL-t előbb tisztítjuk, hogy újratöltés ne próbálja újra.
  window.history.replaceState(null, "", returnPath);

  if (callbackError) throw new Error(`A bejelentkezés sikertelen: ${callbackError}`);
  if (!code || !verifier || params.get("state") !== verifier) throw new Error("Érvénytelen bejelentkezési állapot.");

  const response = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, code_verifier: verifier, redirect_uri: redirectUri() }),
  });
  if (!response.ok) throw new Error(`A token csere sikertelen (${response.status}).`);
  applyTokens((await response.json()) as TokenResponse);
}

async function initialize(): Promise<void> {
  try {
    await handleCallback();
    if (state.authenticated || !accessToken) return;

    const claims = decodeJwtPayload(accessToken);
    const expiringSoon = !claims.exp || claims.exp * 1000 - Date.now() < 60_000;
    if (!expiringSoon) {
      setState({ authenticated: true, userId: claims.sub || "", userName: localStorage.getItem(USER_NAME_KEY) || displayName(claims) });
      scheduleRefresh(claims.exp);
    } else if (refreshToken) {
      await refreshAccessToken();
    } else {
      logout();
    }
  } catch (error) {
    logout();
    setState({ error: error instanceof Error ? error.message : "A bejelentkezés sikertelen." });
  }
}

// Egyszer fut; a StrictMode dupla mountja miatt is biztonságos.
export function initAuth(): Promise<void> {
  initPromise ??= initialize();
  return initPromise;
}

// Háttérfülön a setTimeout szünetelhet, ezért előtérbe érkezéskor is ellenőrzünk.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !accessToken || !state.authenticated) return;
  const claims = decodeJwtPayload(accessToken);
  if (claims.exp && claims.exp * 1000 - Date.now() < 60_000) {
    refreshAccessToken().catch(() => logout());
  }
});

/** Bearer tokenes fetch; 401-nél pontosan egyszer frissít és újrapróbál, utána kilépteti a felhasználót. */
export async function apiFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(path, { ...init, headers });

  if (response.status !== 401 || !state.authenticated) return response;

  if (!retried && refreshToken) {
    try {
      await refreshAccessToken();
      return apiFetch(path, init, true);
    } catch {
      // a kijelentkeztetés lent történik
    }
  }
  logout();
  return response;
}
