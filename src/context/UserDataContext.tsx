import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { cancelPendingSaves, loadAllData } from "../lib/dataApi";
import type { DataKey } from "../lib/dataApi";

type UserData = Partial<Record<DataKey, unknown>>;

const EMPTY: UserData = {};
const UserDataContext = createContext<UserData>(EMPTY);

type LoadResult = { data: UserData } | { error: string };

function UserDataLoader({ userId, children }: { userId: string; children: ReactNode }) {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadAllData()
      .then((data) => {
        if (!cancelled) setResult({ data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ error: error instanceof Error ? error.message : "Az adatok betöltése sikertelen." });
      });
    return () => {
      cancelled = true;
      cancelPendingSaves();
    };
  }, [userId]);

  if (userId && !result) {
    return <p className="p-6 text-center text-sm text-brand-muted">Betöltés…</p>;
  }

  if (result && "error" in result) {
    return <p className="p-6 text-center text-sm text-red-700">{result.error}</p>;
  }

  return <UserDataContext.Provider value={result?.data ?? EMPTY}>{children}</UserDataContext.Provider>;
}

/** A gyermekeket felhasználónként újramountolja, így az állapot kijelentkezéskor és fióccserekor nullázódik. */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const { authenticated, userId } = useAuth();
  const activeUserId = authenticated ? userId : "";

  return (
    <UserDataLoader key={activeUserId || "anonymous"} userId={activeUserId}>
      {children}
    </UserDataLoader>
  );
}

export function useStoredValue(key: DataKey): unknown {
  return useContext(UserDataContext)[key];
}
