import type { WorkoutLogEntry } from "../types";

export type CalendarDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
};

export type WorkoutStats = {
  count: number;
  durationSeconds: number;
};

export const WEEKDAY_LABELS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((leadingDays + dayCount) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(year, month, index - leadingDays + 1);
    return { date, dateKey: getDateKey(date), isCurrentMonth: date.getMonth() === month };
  });
}

export function getEntriesForDate(entries: WorkoutLogEntry[], date: Date): WorkoutLogEntry[] {
  const dateKey = getDateKey(date);
  return entries
    .filter((entry) => getDateKey(new Date(entry.completedAt)) === dateKey)
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

export function getMonthEntries(entries: WorkoutLogEntry[], year: number, month: number): WorkoutLogEntry[] {
  return entries.filter((entry) => {
    const date = new Date(entry.completedAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function getCurrentWeekEntries(entries: WorkoutLogEntry[], now = new Date()): WorkoutLogEntry[] {
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);

  return entries.filter((entry) => {
    const date = new Date(entry.completedAt);
    return date >= weekStart && date < weekEnd;
  });
}

export function getWorkoutStats(entries: WorkoutLogEntry[]): WorkoutStats {
  return entries.reduce(
    (stats, entry) => ({ count: stats.count + 1, durationSeconds: stats.durationSeconds + entry.durationSeconds }),
    { count: 0, durationSeconds: 0 },
  );
}

export function getWeekdayCounts(entries: WorkoutLogEntry[]): number[] {
  return entries.reduce<number[]>(
    (counts, entry) => {
      const weekday = (new Date(entry.completedAt).getDay() + 6) % 7;
      return counts.map((count, index) => (index === weekday ? count + 1 : count));
    },
    [0, 0, 0, 0, 0, 0, 0],
  );
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} mp`;
  if (seconds === 0) return `${minutes} perc`;
  return `${minutes} perc ${seconds} mp`;
}