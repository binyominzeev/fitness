import { NavLink, Outlet } from "react-router-dom";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/", label: "Gyakorlatok" },
  { to: "/terv", label: "Edzésterv", withCount: true },
  { to: "/ai-edzo", label: "AI edző" },
  { to: "/lejatszas", label: "Lejátszás" },
];

export function AppShell() {
  const { items } = useWorkoutPlan();
  const { authenticated, userName, error, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-brand-line bg-brand-paper/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-muted">Interval Trainer</p>
          <h1 className="break-words font-display text-xl font-semibold">Intervallum Edzés MVP</h1>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 text-sm sm:justify-end">
          {authenticated && <span className="min-w-0 max-w-64 break-words text-brand-muted [overflow-wrap:anywhere]">{userName}</span>}
          <button
            type="button"
            onClick={() => (authenticated ? logout() : void login())}
            className="rounded-xl bg-brand-ink px-3 py-2 text-xs font-semibold text-brand-paper"
          >
            {authenticated ? "Kilépés" : "Belépés"}
          </button>
        </div>
      </header>
      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-line bg-brand-paper/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-sm">
        <ul className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-2 py-3 text-center text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-ink text-brand-paper"
                      : "bg-white text-brand-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]"
                  }`
                }
              >
                {item.withCount ? `${item.label} (${items.length})` : item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
