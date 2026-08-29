import type { AICoachMemory, AICoachProfile, AIMessage, WorkoutItem, WorkoutLogEntry } from "../types";

const STORAGE_KEY = "fitness-workout-plan-v1";
const AI_PROFILE_KEY = "fitness-ai-profile-v1";
const AI_MESSAGES_KEY = "fitness-ai-messages-v1";
const AI_MEMORY_KEY = "fitness-ai-memory-v1";
const WORKOUT_LOG_KEY = "fitness-workout-log-v1";

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

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadAICoachProfile(): AICoachProfile {
  return loadJson<AICoachProfile>(AI_PROFILE_KEY, {
    displayName: "",
    goal: "",
    level: "",
    weeklyFrequency: "",
    availableMinutes: "",
    location: "",
    limitations: "",
    notes: "",
  });
}

export function persistAICoachProfile(profile: AICoachProfile): void {
  persistJson(AI_PROFILE_KEY, profile);
}

export function loadAIMessages(): AIMessage[] {
  return loadJson<AIMessage[]>(AI_MESSAGES_KEY, []);
}

export function persistAIMessages(messages: AIMessage[]): void {
  persistJson(AI_MESSAGES_KEY, messages.slice(-50));
}

export function loadAICoachMemory(): AICoachMemory {
  return loadJson<AICoachMemory>(AI_MEMORY_KEY, { summary: "", updatedAt: "" });
}

export function persistAICoachMemory(memory: AICoachMemory): void {
  persistJson(AI_MEMORY_KEY, memory);
}

export function loadWorkoutLog(): WorkoutLogEntry[] {
  return loadJson<WorkoutLogEntry[]>(WORKOUT_LOG_KEY, []);
}

export function persistWorkoutLog(entries: WorkoutLogEntry[]): void {
  persistJson(WORKOUT_LOG_KEY, entries.slice(-100));
}
