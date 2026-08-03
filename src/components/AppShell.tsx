import { NavLink, Outlet } from "react-router-dom";
import { useWorkoutPlan } from "../context/WorkoutContext";

const navItems = [
  { to: "/", label: "Gyakorlatok" },
  { to: "/terv", label: "Edzésterv", withCount: true },
  { to: "/lejatszas", label: "Lejátszás" },
];

export function AppShell() {
  const { items } = useWorkoutPlan();

  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">
      <header className="sticky top-0 z-20 border-b border-brand-line bg-brand-paper/95 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-muted">Interval Trainer</p>
        <h1 className="font-display text-xl font-semibold">Intervallum Edzés MVP</h1>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-line bg-brand-paper/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-sm">
        <ul className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
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
