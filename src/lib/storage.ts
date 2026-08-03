import type { WorkoutItem } from "../types";

const STORAGE_KEY = "fitness-workout-plan-v1";

export type PersistedPlan = {
  items: WorkoutItem[];
};

function isWorkoutItem(value: unknown): value is WorkoutItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<WorkoutItem>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.exerciseId === "string" &&
    typeof candidate.workSeconds === "number" &&
    Number.isFinite(candidate.workSeconds) &&
    candidate.workSeconds > 0 &&
    typeof candidate.restSeconds === "number" &&
    Number.isFinite(candidate.restSeconds) &&
    candidate.restSeconds > 0
  );
}

function normalizePlanItems(value: unknown): WorkoutItem[] {
  if (Array.isArray(value)) {
    if (value.some((item) => !isWorkoutItem(item))) {
      throw new Error("A JSON fájl formátuma nem megfelelő.");
    }

    return value as WorkoutItem[];
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as Partial<PersistedPlan>;
    if (Array.isArray(candidate.items)) {
      if (candidate.items.some((item) => !isWorkoutItem(item))) {
        throw new Error("A JSON fájl formátuma nem megfelelő.");
      }

      return candidate.items as WorkoutItem[];
    }
  }

  throw new Error("A JSON fájl formátuma nem megfelelő.");
}

export function loadPersistedPlan(): WorkoutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return normalizePlanItems(parsed);
  } catch {
    return [];
  }
}

export function persistPlan(items: WorkoutItem[]): void {
  const payload: PersistedPlan = { items };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function importPlanFromJson(raw: string): WorkoutItem[] {
  const parsed = JSON.parse(raw) as unknown;
  return normalizePlanItems(parsed);
}

export function exportPlanToJson(items: WorkoutItem[]): string {
  const payload: PersistedPlan = { items };
  return JSON.stringify(payload, null, 2);
}
