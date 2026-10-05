import type { WorkoutItem } from "../types";

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

/** A szerverről érkező tervet olvassa be; érvénytelen vagy hiányzó adatnál üres tervet ad. */
export function parseStoredPlan(value: unknown): WorkoutItem[] {
  try {
    return normalizePlanItems(value);
  } catch {
    return [];
  }
}

export function importPlanFromJson(raw: string): WorkoutItem[] {
  const parsed = JSON.parse(raw) as unknown;
  return normalizePlanItems(parsed);
}

export function exportPlanToJson(items: WorkoutItem[]): string {
  const payload: PersistedPlan = { items };
  return JSON.stringify(payload, null, 2);
}
