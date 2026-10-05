import { useSyncExternalStore } from "react";
import { getAuthState, login, logout, subscribeAuth } from "../lib/auth";
import type { AuthState } from "../lib/auth";

export function useAuth(): AuthState & { login: () => Promise<void>; logout: () => void } {
  const state = useSyncExternalStore(subscribeAuth, getAuthState);
  return { ...state, login, logout };
}
