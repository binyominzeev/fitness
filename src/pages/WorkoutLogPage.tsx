import { useMemo, useState } from "react";
import { useWorkoutLog } from "../context/WorkoutLogContext";
import {
  formatDuration,
  getCalendarDays,
  getCurrentWeekEntries,
  getDateKey,
  getEntriesForDate,
  getMonthEntries,
  getWeekdayCounts,
  getWorkoutStats,
  WEEKDAY_LABELS,
} from "../lib/workoutLog";

const MONTH_FORMATTER = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long" });
const DATE_FORMATTER = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" });
const TIME_FORMATTER = new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit" });

function changeMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function WorkoutLogPage() {
  const { entries } = useWorkoutLog();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const calendarDays = useMemo(() => getCalendarDays(month.getFullYear(), month.getMonth()), [month]);
  const monthEntries = useMemo(() => getMonthEntries(entries, month.getFullYear(), month.getMonth()), [entries, month]);
  const currentWeekEntries = useMemo(() => getCurrentWeekEntries(entries), [entries]);
  const monthStats = useMemo(() => getWorkoutStats(monthEntries), [monthEntries]);
  const weekStats = useMemo(() => getWorkoutStats(currentWeekEntries), [currentWeekEntries]);
  const weekdayCounts = useMemo(() => getWeekdayCounts(monthEntries), [monthEntries]);
  const selectedEntries = useMemo(() => getEntriesForDate(entries, selectedDate), [entries, selectedDate]);
  const entriesByDate = useMemo(
    () => monthEntries.reduce<Record<string, number>>((counts, entry) => {
      const key = getDateKey(new Date(entry.completedAt));
      return { ...counts, [key]: (counts[key] ?? 0) + 1 };
    }, {}),
    [monthEntries],
  );

  function navigateMonth(amount: number) {
    const nextMonth = changeMonth(month, amount);
    setMonth(nextMonth);
    setSelectedDate(nextMonth);
  }

  return (
    <section className="space-y-4" aria-labelledby="workout-log-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="workout-log-title" className="font-display text-xl font-semibold">Edzésnapló</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            aria-label="Előző hónap"
            className="grid h-10 w-10 place-items-center rounded-lg border border-brand-line bg-white text-lg"
          >
            ‹
          </button>
          <h3 className="min-w-32 text-center font-semibold capitalize">{MONTH_FORMATTER.format(month)}</h3>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            aria-label="Következő hónap"
            className="grid h-10 w-10 place-items-center rounded-lg border border-brand-line bg-white text-lg"
          >
            ›
          </button>
        </div>
      </div>

      <section aria-label="Havi naptár" className="rounded-xl border border-brand-line bg-white p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-brand-muted">
          {WEEKDAY_LABELS.map((label) => <span key={label} className="py-2">{label}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, dateKey, isCurrentMonth }) => {
            const count = entriesByDate[dateKey] ?? 0;
            const isSelected = getDateKey(selectedDate) === dateKey;
            const isToday = getDateKey(new Date()) === dateKey;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  if (!isCurrentMonth) setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  setSelectedDate(date);
                }}
                aria-pressed={isSelected}
                aria-label={`${DATE_FORMATTER.format(date)}${count ? `, ${count} edzés` : ""}`}
                className={`relative grid aspect-square min-h-9 place-items-center rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
                  isSelected ? "bg-brand-ink font-semibold text-white" : isCurrentMonth ? "hover:bg-brand-soft" : "text-brand-muted/40 hover:bg-brand-soft/60"
                } ${isToday && !isSelected ? "ring-1 ring-brand-teal" : ""}`}
              >
                {date.getDate()}
                {count > 0 ? (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-brand-coral"}`} />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Edzésstatisztikák" className="grid grid-cols-2 gap-3">
        <article className="rounded-xl border border-brand-line bg-white p-4">
          <h3 className="text-xs font-semibold uppercase text-brand-muted">Ezen a héten</h3>
          <p className="mt-2 font-display text-2xl font-semibold">{weekStats.count} <span className="text-sm font-normal">edzés</span></p>
          <p className="mt-1 text-sm text-brand-muted">{formatDuration(weekStats.durationSeconds)}</p>
        </article>
        <article className="rounded-xl border border-brand-line bg-white p-4">
          <h3 className="text-xs font-semibold uppercase text-brand-muted">Ebben a hónapban</h3>
          <p className="mt-2 font-display text-2xl font-semibold">{monthStats.count} <span className="text-sm font-normal">edzés</span></p>
          <p className="mt-1 text-sm text-brand-muted">{formatDuration(monthStats.durationSeconds)}</p>
        </article>
      </section>

      <section aria-labelledby="weekday-title" className="rounded-xl border border-brand-line bg-white p-4">
        <h3 id="weekday-title" className="mb-3 text-sm font-semibold">Edzések a hét napjai szerint</h3>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((label, index) => {
            const maxCount = Math.max(...weekdayCounts, 1);
            const count = weekdayCounts[index];
            return (
              <div key={label} className="min-w-0 text-center">
                <div className="mb-1 flex h-14 items-end justify-center">
                  <span
                    className="w-full max-w-8 rounded-t-sm bg-brand-teal/80"
                    style={{ height: `${Math.max(count > 0 ? 6 : 0, (count / maxCount) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-brand-muted sm:text-xs">{label}</p>
                <p className="text-xs font-semibold">{count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="selected-day-title" className="space-y-2">
        <h3 id="selected-day-title" className="font-display text-lg font-semibold capitalize">
          {DATE_FORMATTER.format(selectedDate)}
        </h3>
        {selectedEntries.length === 0 ? (
          <p className="rounded-xl bg-brand-soft p-4 text-sm text-brand-muted">Erre a napra nincs rögzített edzés.</p>
        ) : (
          <ul className="divide-y divide-brand-line rounded-xl border border-brand-line bg-white px-4">
            {selectedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{TIME_FORMATTER.format(new Date(entry.completedAt))}</p>
                  <p className="text-xs text-brand-muted">{entry.exerciseCount} gyakorlat{entry.completed ? " · befejezve" : " · részleges"}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{formatDuration(entry.durationSeconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {entries.length === 0 ? (
        <p className="text-center text-xs text-brand-muted">Az első legalább egyperces lejátszásod után itt jelenik meg az edzésnaplód.</p>
      ) : null}
    </section>
  );
}