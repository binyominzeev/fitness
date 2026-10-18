import type { PlansState, SavedPlan, WorkoutItem, WorkoutLoop } from "../types";
import { normalizeLoops } from "./workout";

export const MAX_PLANS = 30;
export const MAX_PLAN_NAME = 60;
export const DEFAULT_PLAN_NAME = "Az első tervem";

export type PersistedPlan = {
  items: WorkoutItem[];
  loops?: WorkoutLoop[];
};

function isWorkoutLoop(value: unknown): value is WorkoutLoop {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<WorkoutLoop>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.startItemId === "string" &&
    typeof candidate.endItemId === "string" &&
    typeof candidate.repeats === "number" &&
    Number.isFinite(candidate.repeats)
  );
}

function parseLoops(items: WorkoutItem[], value: unknown): WorkoutLoop[] {
  return Array.isArray(value) ? normalizeLoops(items, value.filter(isWorkoutLoop)) : [];
}

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

export function createSavedPlan(name: string, items: WorkoutItem[], loops: WorkoutLoop[] = []): SavedPlan {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: normalizePlanName(name) || DEFAULT_PLAN_NAME, items, loops, createdAt: now, updatedAt: now, lastUsedAt: now };
}

export function normalizePlanName(name: string): string {
  return name.trim().slice(0, MAX_PLAN_NAME);
}

function parseSavedPlan(value: unknown): SavedPlan | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Partial<SavedPlan>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return undefined;
  const items = parseStoredPlan({ items: candidate.items });
  const now = new Date().toISOString();
  return {
    id: candidate.id,
    name: normalizePlanName(candidate.name) || DEFAULT_PLAN_NAME,
    items,
    loops: parseLoops(items, candidate.loops),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    lastUsedAt: typeof candidate.lastUsedAt === "string" ? candidate.lastUsedAt : now,
  };
}

/** A tárolt tervgyűjteményt olvassa be; ha nincs, a régi egyetlen tervből (`plan`) migrál. */
export function parseStoredPlans(plansValue: unknown, legacyPlanValue: unknown): PlansState {
  const stored = plansValue as Partial<PlansState> | undefined;
  if (stored && Array.isArray(stored.plans)) {
    const plans = stored.plans.map(parseSavedPlan).filter((plan): plan is SavedPlan => plan !== undefined).slice(0, MAX_PLANS);
    if (plans.length > 0) {
      const activeId = plans.some((plan) => plan.id === stored.activeId) ? (stored.activeId as string) : plans[0].id;
      return { activeId, plans };
    }
  }

  const plan = createSavedPlan(DEFAULT_PLAN_NAME, parseStoredPlan(legacyPlanValue));
  return { activeId: plan.id, plans: [plan] };
}

export function importPlanFromJson(raw: string): { items: WorkoutItem[]; loops: WorkoutLoop[] } {
  const parsed = JSON.parse(raw) as unknown;
  const items = normalizePlanItems(parsed);
  const loops = typeof parsed === "object" && parsed !== null ? parseLoops(items, (parsed as Partial<PersistedPlan>).loops) : [];
  return { items, loops };
}

export function exportPlanToJson(items: WorkoutItem[], loops: WorkoutLoop[] = []): string {
  const payload: PersistedPlan = { items, loops };
  return JSON.stringify(payload, null, 2);
}
