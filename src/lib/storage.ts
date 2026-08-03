import type { WorkoutItem } from "../types";

const STORAGE_KEY = "fitness-workout-plan-v1";

type PersistedPlan = {
  items: WorkoutItem[];
};

export function loadPersistedPlan(): WorkoutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PersistedPlan;
    if (!Array.isArray(parsed.items)) {
      return [];
    }

    return parsed.items;
  } catch {
    return [];
  }
}

export function persistPlan(items: WorkoutItem[]): void {
  const payload: PersistedPlan = { items };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
