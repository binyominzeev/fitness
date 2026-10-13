import { useEffect, useRef, useState } from "react";
import { useStoredValue } from "../context/UserDataContext";
import { saveData } from "../lib/dataApi";
import { sendCoachMessage } from "../lib/aiCoachClient";
import { derivePlanFromCoachText } from "../lib/planFromCoachText";
import type { AICoachMemory, AICoachProfile, AIConversation, AIMessage, AIPlanProposal, Exercise, WorkoutLogEntry } from "../types";

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

function createConversation(name = "Új beszélgetés", messages: AIMessage[] = [], memory?: AICoachMemory): AIConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    messages,
    memory: memory ?? { summary: "", updatedAt: "" },
    createdAt: now,
    updatedAt: now,
  };
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
  const storedConversations = useStoredValue("aiConversations");
  const storedLog = useStoredValue("workoutLog");
  const [profile, setProfile] = useState<AICoachProfile>(() => ({ ...emptyProfile, ...(storedProfile as Partial<AICoachProfile> | undefined) }));
  const [conversations, setConversations] = useState<AIConversation[]>(() => {
    const saved = storedConversations as { conversations?: AIConversation[] } | undefined;
    if (saved?.conversations?.length) return saved.conversations;
    const legacyMessages = (storedMessages as AIMessage[] | undefined) ?? [];
    if (legacyMessages.length) {
      const firstQuestion = legacyMessages.find((message) => message.role === "user")?.content;
      return [
        createConversation(
          firstQuestion?.slice(0, 80) || "Korábbi beszélgetés",
          legacyMessages,
          (storedMemory as AICoachMemory | undefined) ?? undefined,
        ),
      ];
    }
    return [createConversation()];
  });
  const conversationsRef = useRef(conversations);
  const savedConversations = storedConversations as { activeId?: string } | undefined;
  const [activeConversationId, setActiveConversationId] = useState(
    () => conversations.find((conversation) => conversation.id === savedConversations?.activeId)?.id ?? conversations[0].id,
  );
  const activeConversationIdRef = useRef(activeConversationId);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [planProposal, setPlanProposal] = useState<AIPlanProposal | undefined>(undefined);
  const didMigrateLegacyRef = useRef(false);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];
  const messages = activeConversation.messages;
  const memory = activeConversation.memory;

  useEffect(() => {
    if (didMigrateLegacyRef.current) return;
    didMigrateLegacyRef.current = true;
    if (!storedConversations && (storedMessages as AIMessage[] | undefined)?.length) {
      saveData("aiConversations", { activeId: activeConversationIdRef.current, conversations: conversationsRef.current });
    }
  }, [storedConversations, storedMessages]);

  const persistConversations = (next: AIConversation[], activeId = activeConversationIdRef.current) => {
    const ordered = [...next].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    conversationsRef.current = ordered;
    setConversations(ordered);
    saveData("aiConversations", { activeId, conversations: ordered });
  };

  const selectConversation = (id: string) => {
    if (!conversationsRef.current.some((conversation) => conversation.id === id)) return;
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
    saveData("aiConversations", { activeId: id, conversations: conversationsRef.current });
    setPlanProposal(undefined);
    setError("");
  };

  const createNewConversation = (name: string) => {
    const trimmedName = name.trim().slice(0, 80);
    if (!trimmedName || conversationsRef.current.length >= 30) return false;
    const nextConversation = createConversation(trimmedName);
    const next = [nextConversation, ...conversationsRef.current];
    activeConversationIdRef.current = nextConversation.id;
    setActiveConversationId(nextConversation.id);
    persistConversations(next, nextConversation.id);
    setPlanProposal(undefined);
    setError("");
    return true;
  };

  const renameConversation = (id: string, name: string) => {
    const trimmedName = name.trim().slice(0, 80);
    if (!trimmedName) return false;
    const next = conversationsRef.current.map((conversation) =>
      conversation.id === id ? { ...conversation, name: trimmedName, updatedAt: new Date().toISOString() } : conversation,
    );
    persistConversations(next);
    return true;
  };

  const deleteConversation = (id: string) => {
    const current = conversationsRef.current;
    let next = current.filter((conversation) => conversation.id !== id);
    if (next.length === current.length) return;
    let nextActiveId = activeConversationIdRef.current;
    if (nextActiveId === id) {
      if (next.length === 0) next = [createConversation()];
      nextActiveId = next[0].id;
      activeConversationIdRef.current = nextActiveId;
      setActiveConversationId(nextActiveId);
    }
    persistConversations(next, nextActiveId);
    setPlanProposal(undefined);
    setError("");
  };

  const saveProfile = (nextProfile: AICoachProfile) => {
    setProfile(nextProfile);
    saveData("aiProfile", nextProfile);
  };

  const sendMessage = async (content: string, editMessageId?: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) {
      return;
    }

    const currentConversation = conversationsRef.current.find((conversation) => conversation.id === activeConversationIdRef.current);
    if (!currentConversation) return;
    const editIndex = editMessageId ? currentConversation.messages.findIndex((message) => message.id === editMessageId && message.role === "user") : -1;
    if (editMessageId && editIndex < 0) return;
    const userMessage =
      editIndex >= 0
        ? { ...currentConversation.messages[editIndex], content: trimmed, createdAt: new Date().toISOString() }
        : createMessage("user", trimmed);
    const nextMessages = [...(editIndex >= 0 ? currentConversation.messages.slice(0, editIndex) : currentConversation.messages), userMessage];
    const nextConversation = {
      ...currentConversation,
      name: currentConversation.messages.length === 0 && currentConversation.name === "Új beszélgetés" ? trimmed.slice(0, 80) : currentConversation.name,
      messages: nextMessages.slice(-50),
      memory: editIndex >= 0 ? { summary: "", updatedAt: "" } : currentConversation.memory,
      updatedAt: new Date().toISOString(),
    };
    const nextConversations = conversationsRef.current.map((conversation) =>
      conversation.id === nextConversation.id ? nextConversation : conversation,
    );
    persistConversations(nextConversations);
    setError("");
    setPlanProposal(undefined);
    setIsSending(true);

    try {
      const response = await sendCoachMessage({
        profile,
        memory: nextConversation.memory,
        messages: nextMessages.slice(-50),
        workoutLog: (storedLog as WorkoutLogEntry[] | undefined) ?? [],
        exercises: exercises.map(
          ({
            id,
            exerciseNameHu,
            exerciseNameEn,
            category,
            phase,
            intensity,
            primaryMuscles,
            impact,
            difficulty,
          }) => ({
            id,
            exerciseNameHu,
            exerciseNameEn,
            category,
            phase,
            intensity,
            primaryMuscles,
            impact,
            difficulty,
          }),
        ),
      });
      const finalConversation = {
        ...nextConversation,
        messages: [...nextConversation.messages, createMessage("assistant", response.message)].slice(-50),
        memory: response.memory ?? nextConversation.memory,
        updatedAt: new Date().toISOString(),
      };
      persistConversations(
        conversationsRef.current.map((conversation) => (conversation.id === finalConversation.id ? finalConversation : conversation)),
      );
      const validProposal = response.planProposal
        ? {
            ...response.planProposal,
            items: response.planProposal.items.filter((item) => exercises.some((exercise) => exercise.id === item.exerciseId)),
          }
        : undefined;
      if (activeConversationIdRef.current === currentConversation.id) {
        setPlanProposal(validProposal?.items.length ? validProposal : derivePlanFromCoachText(response.message, exercises));
      }
    } catch (requestError) {
      const fallbackMessage = createMessage("assistant", localCoachReply(trimmed));
      const finalConversation = {
        ...nextConversation,
        messages: [...nextConversation.messages, fallbackMessage].slice(-50),
        updatedAt: new Date().toISOString(),
      };
      persistConversations(
        conversationsRef.current.map((conversation) => (conversation.id === finalConversation.id ? finalConversation : conversation)),
      );
      if (activeConversationIdRef.current === currentConversation.id) {
        setError(requestError instanceof Error ? requestError.message : "Az AI-edző nem érhető el.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const dismissPlanProposal = () => setPlanProposal(undefined);

  const clearConversation = () => {
    const cleared = { ...activeConversation, messages: [], memory: { summary: "", updatedAt: "" }, updatedAt: new Date().toISOString() };
    persistConversations(
      conversationsRef.current.map((conversation) => (conversation.id === activeConversation.id ? cleared : conversation)),
    );
    setPlanProposal(undefined);
  };

  return {
    profile,
    memory,
    messages,
    conversations,
    activeConversation,
    activeConversationId,
    isSending,
    error,
    planProposal,
    saveProfile,
    sendMessage,
    selectConversation,
    createNewConversation,
    renameConversation,
    deleteConversation,
    dismissPlanProposal,
    clearConversation,
    emptyProfile,
  };
}
