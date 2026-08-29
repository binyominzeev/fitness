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
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "Az AI szolgáltatás még nincs beállítva." : "Az AI-edző most nem elérhető.");
  }

  const data = (await response.json()) as CoachResponse;
  if (typeof data.message !== "string" || data.message.length === 0) {
    throw new Error("Az AI válasza nem értelmezhető.");
  }

  return data;
}
