import { apiFetch } from "./auth";
import type {
  AICoachMemory,
  AICoachProfile,
  AIMessage,
  AIPlanProposal,
  Exercise,
  WorkoutLogEntry,
} from "../types";

type CoachRequest = {
  profile: AICoachProfile;
  memory: AICoachMemory;
  messages: AIMessage[];
  workoutLog: WorkoutLogEntry[];
  exercises: Pick<Exercise, "id" | "exerciseNameHu" | "exerciseNameEn" | "category">[];
};

export type CoachResponse = {
  message: string;
  memory?: AICoachMemory;
  planProposal?: AIPlanProposal;
};

export async function sendCoachMessage(request: CoachRequest): Promise<CoachResponse> {
  const response = await apiFetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Az AI-edzőhöz be kell jelentkezned.");
    if (response.status === 429) throw new Error("Túl sok kérés, próbáld később.");
    throw new Error(response.status === 404 ? "Az AI szolgáltatás még nincs beállítva." : "Az AI-edző most nem elérhető.");
  }

  const data = (await response.json()) as CoachResponse;
  if (typeof data.message !== "string" || data.message.length === 0) {
    throw new Error("Az AI válasza nem értelmezhető.");
  }

  return data;
}

export async function suggestPlanNames(exerciseNames: string[]): Promise<string[]> {
  const response = await apiFetch("/api/ai/plan-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercises: exerciseNames }),
  });
  if (!response.ok) throw new Error("Az AI névjavaslat most nem elérhető.");

  const data = (await response.json()) as { names?: unknown };
  return Array.isArray(data.names) ? data.names.filter((name): name is string => typeof name === "string") : [];
}
