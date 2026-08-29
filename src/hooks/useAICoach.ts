import { useState } from "react";
import {
  loadAICoachMemory,
  loadAICoachProfile,
  loadAIMessages,
  loadWorkoutLog,
  persistAICoachMemory,
  persistAICoachProfile,
  persistAIMessages,
} from "../lib/storage";
import { sendCoachMessage } from "../lib/aiCoachClient";
import type { AICoachMemory, AICoachProfile, AIMessage, AIPlanProposal, Exercise } from "../types";

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
  const [profile, setProfile] = useState<AICoachProfile>(() => loadAICoachProfile());
  const [memory, setMemory] = useState<AICoachMemory>(() => loadAICoachMemory());
  const [messages, setMessages] = useState<AIMessage[]>(() => loadAIMessages());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [planProposal, setPlanProposal] = useState<AIPlanProposal | undefined>(undefined);

  const saveProfile = (nextProfile: AICoachProfile) => {
    setProfile(nextProfile);
    persistAICoachProfile(nextProfile);
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    persistAIMessages(nextMessages);
    setError("");
    setPlanProposal(undefined);
    setIsSending(true);

    try {
      const response = await sendCoachMessage({
        profile,
        memory,
        messages: nextMessages,
        workoutLog: loadWorkoutLog(),
        exercises: exercises.map(({ id, exerciseNameHu, exerciseNameEn, category }) => ({
          id,
          exerciseNameHu,
          exerciseNameEn,
          category,
        })),
      });
      const finalMessages = [...nextMessages, createMessage("assistant", response.message)];
      setMessages(finalMessages);
      persistAIMessages(finalMessages);
      if (response.memory) {
        setMemory(response.memory);
        persistAICoachMemory(response.memory);
      }
      setPlanProposal(response.planProposal);
    } catch (requestError) {
      const fallbackMessage = createMessage("assistant", localCoachReply(trimmed));
      const finalMessages = [...nextMessages, fallbackMessage];
      setMessages(finalMessages);
      persistAIMessages(finalMessages);
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
    persistAIMessages([]);
    persistAICoachMemory({ summary: "", updatedAt: "" });
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
