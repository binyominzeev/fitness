import { useState } from "react";
import { useStoredValue } from "../context/UserDataContext";
import { saveData } from "../lib/dataApi";
import { sendCoachMessage } from "../lib/aiCoachClient";
import { derivePlanFromCoachText } from "../lib/planFromCoachText";
import type { AICoachMemory, AICoachProfile, AIMessage, AIPlanProposal, Exercise, WorkoutLogEntry } from "../types";

const emptyProfile: AICoachProfile = {
  displayName: "",
  goal: "",
  level: "",
  weeklyFrequency: "",
  availableMinutes: "",
  location: "",
  limitations: "",
  notes: "",
};

function createMessage(role: AIMessage["role"], content: string): AIMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

function localCoachReply(content: string): string {
  const normalized = content.toLocaleLowerCase("hu-HU");
  if (normalized.includes("terv") || normalized.includes("edzést")) {
    return "**Nem sikerült elérni az AI-szervert**, ezért most nem tudok valódi tervet összeállítani. Ellenőrizd, hogy fut-e a `npm run server` parancs, és hogy be van-e állítva az `OPENAI_API_KEY`. Utána próbáld újra ugyanezt az üzenetet.";
  }

  return "**Nem sikerült elérni az AI-szervert.** A profilodat és a beszélgetésedet elmentettem, de a válasz most helyi tartalék szöveg, nem valódi AI-válasz. Indítsd el a `npm run server` parancsot, és próbáld újra.";
}

export function useAICoach(exercises: Exercise[]) {
  const storedProfile = useStoredValue("aiProfile");
  const storedMemory = useStoredValue("aiMemory");
  const storedMessages = useStoredValue("aiMessages");
  const storedLog = useStoredValue("workoutLog");
  const [profile, setProfile] = useState<AICoachProfile>(() => ({ ...emptyProfile, ...(storedProfile as Partial<AICoachProfile> | undefined) }));
  const [memory, setMemory] = useState<AICoachMemory>(() => (storedMemory as AICoachMemory | undefined) ?? { summary: "", updatedAt: "" });
  const [messages, setMessages] = useState<AIMessage[]>(() => (storedMessages as AIMessage[] | undefined) ?? []);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [planProposal, setPlanProposal] = useState<AIPlanProposal | undefined>(undefined);

  const saveProfile = (nextProfile: AICoachProfile) => {
    setProfile(nextProfile);
    saveData("aiProfile", nextProfile);
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    saveData("aiMessages", nextMessages);
    setError("");
    setPlanProposal(undefined);
    setIsSending(true);

    try {
      const response = await sendCoachMessage({
        profile,
        memory,
        messages: nextMessages,
        workoutLog: (storedLog as WorkoutLogEntry[] | undefined) ?? [],
        exercises: exercises.map(({ id, exerciseNameHu, exerciseNameEn, category }) => ({
          id,
          exerciseNameHu,
          exerciseNameEn,
          category,
        })),
      });
      const finalMessages = [...nextMessages, createMessage("assistant", response.message)];
      setMessages(finalMessages);
      saveData("aiMessages", finalMessages);
      if (response.memory) {
        setMemory(response.memory);
        saveData("aiMemory", response.memory);
      }
      const validProposal = response.planProposal
        ? {
            ...response.planProposal,
            items: response.planProposal.items.filter((item) => exercises.some((exercise) => exercise.id === item.exerciseId)),
          }
        : undefined;
      setPlanProposal(
        validProposal?.items.length
          ? validProposal
          : derivePlanFromCoachText(response.message, exercises),
      );
    } catch (requestError) {
      const fallbackMessage = createMessage("assistant", localCoachReply(trimmed));
      const finalMessages = [...nextMessages, fallbackMessage];
      setMessages(finalMessages);
      saveData("aiMessages", finalMessages);
      setError(requestError instanceof Error ? requestError.message : "Az AI-edző nem érhető el.");
    } finally {
      setIsSending(false);
    }
  };

  const dismissPlanProposal = () => setPlanProposal(undefined);

  const clearConversation = () => {
    setMessages([]);
    setMemory({ summary: "", updatedAt: "" });
    setPlanProposal(undefined);
    saveData("aiMessages", []);
    saveData("aiMemory", { summary: "", updatedAt: "" });
  };

  return {
    profile,
    memory,
    messages,
    isSending,
    error,
    planProposal,
    saveProfile,
    sendMessage,
    dismissPlanProposal,
    clearConversation,
    emptyProfile,
  };
}
