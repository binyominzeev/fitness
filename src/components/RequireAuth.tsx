import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export function RequireAuth({ children, reason }: { children: ReactNode; reason: string }) {
  const { authenticated, login, error } = useAuth();

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-brand-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold">Bejelentkezés szükséges</h2>
      <p className="text-sm text-brand-muted">{reason}</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="button" onClick={() => void login()} className="rounded-xl bg-brand-ink px-4 py-3 text-sm font-semibold text-brand-paper">
        Belépés
      </button>
    </section>
  );
}
