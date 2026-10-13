import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AIPlanProposalCard } from "../components/AIPlanProposalCard";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { useAICoach } from "../hooks/useAICoach";
import { renderCoachMarkdown } from "../lib/markdown";
import type { AICoachProfile, Exercise } from "../types";

type AICoachPageProps = { exercises: Exercise[]; exercisesById: Record<string, Exercise> };

const profileFields: Array<{ key: keyof AICoachProfile; label: string; placeholder: string }> = [
  { key: "displayName", label: "Hogy szólítsalak?", placeholder: "Pl. Anna" },
  { key: "goal", label: "Mi a fő célod?", placeholder: "Pl. erősödés, jobb közérzet" },
  { key: "level", label: "Hol tartasz?", placeholder: "Pl. újrakezdő" },
  { key: "weeklyFrequency", label: "Heti hányszor?", placeholder: "Pl. heti 3 alkalom" },
  { key: "availableMinutes", label: "Mennyi időd van?", placeholder: "Pl. 20 perc" },
  { key: "location", label: "Hol és milyen eszközzel?", placeholder: "Pl. otthon, eszköz nélkül" },
];

export function AICoachPage({ exercises, exercisesById }: AICoachPageProps) {
  const {
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
  } = useAICoach(exercises);
  const { items, replaceItems, createPlan, canCreatePlan } = useWorkoutPlan();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | undefined>();
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [newConversationName, setNewConversationName] = useState("");
  const [renamingConversationId, setRenamingConversationId] = useState<string | undefined>();
  const [renamedConversationName, setRenamedConversationName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    const node = event.target;
    // Resetting the height to "auto" shrinks the page and makes the browser clamp the scroll position.
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 240)}px`;
    window.scrollTo(scrollX, scrollY);
  };

  const handleProfileChange = (key: keyof AICoachProfile, value: string) => {
    saveProfile({ ...profile, [key]: value });
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    const value = draft;
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const messageId = editingMessageId;
    setEditingMessageId(undefined);
    await sendMessage(value, messageId);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setDraft(content);
    setEditingMessageId(messageId);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
    textareaRef.current?.focus();
  };

  const handleClearConversation = () => {
    clearConversation();
    setDraft("");
    setEditingMessageId(undefined);
  };

  const handleCreateConversation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createNewConversation(newConversationName)) return;
    setNewConversationName("");
    setCreatingConversation(false);
    setDraft("");
    setEditingMessageId(undefined);
  };

  const handleRenameConversation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingConversationId || !renameConversation(renamingConversationId, renamedConversationName)) return;
    setRenamingConversationId(undefined);
    setRenamedConversationName("");
  };

  const handleAcceptPlan = (mode: "new" | "replace" | "append") => {
    if (!planProposal) return;
    const generatedItems = planProposal.items
      .filter((item) => Boolean(exercisesById[item.exerciseId]))
      .map((item) => ({
        id: crypto.randomUUID(),
        exerciseId: item.exerciseId,
        workSeconds: item.workSeconds,
        restSeconds: item.restSeconds,
      }));

    if (generatedItems.length === 0) return;

    if (mode === "new") {
      createPlan(planProposal.title, generatedItems);
    } else {
      replaceItems(mode === "append" ? [...items, ...generatedItems] : generatedItems);
    }
    dismissPlanProposal();
    navigate("/terv");
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-brand-ink bg-brand-ink p-5 text-brand-paper shadow-[0_12px_30px_rgba(31,41,51,0.16)]">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-soft">Személyes edző</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Beszéljük át, hogy állsz.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-line">
              Mondd el, mi működik, mi akadt el, és milyen edzést szeretnél. A jóváhagyott terv később bekerülhet az edzéstervedbe.
            </p>
          </div>
          <button type="button" onClick={() => setShowProfile((value) => !value)} className="shrink-0 rounded-xl bg-brand-paper px-3 py-2 text-xs font-semibold text-brand-ink">
            {showProfile ? "Profil bezárása" : "Profilom"}
          </button>
        </div>
      </div>

      {showProfile ? (
        <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Amit az edzőnek tudnia érdemes</h3>
              <p className="mt-1 text-xs text-brand-muted">Ezeket az adatokat a későbbi beszélgetésekhez használjuk.</p>
            </div>
            <span className="rounded-full bg-brand-soft px-2 py-1 text-xs text-brand-teal">helyben mentve</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {profileFields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs font-semibold text-brand-muted">{field.label}</span>
                <input value={profile[field.key]} onChange={(event) => handleProfileChange(field.key, event.target.value)} placeholder={field.placeholder} className="w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none focus:border-brand-teal" />
              </label>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-brand-muted">Korlátozások, fájdalmak, megjegyzések</span>
            <textarea value={`${profile.limitations}${profile.notes ? `\n${profile.notes}` : ""}`} onChange={(event) => saveProfile({ ...profile, limitations: event.target.value, notes: "" })} placeholder="Pl. kerüljük az ugrálást, érzékeny a térdem" className="min-h-20 w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none focus:border-brand-teal" />
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">{activeConversation.name}</h3>
            <button type="button" onClick={handleClearConversation} className="text-xs text-brand-muted underline underline-offset-2">Beszélgetés ürítése</button>
          </div>
          <div className="min-h-64 space-y-3">
            {messages.length === 0 ? <p className="rounded-xl bg-brand-soft p-3 text-sm leading-6 text-brand-muted">Kezdd például így: „Két hete próbálok rendszeresen edzeni, de mindig elfogy a lendületem.”</p> : null}
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-auto flex max-w-[92%] flex-col items-end" : "max-w-[92%]"}>
                <div className={`rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-brand-ink text-white" : "bg-brand-soft text-brand-ink"}`}>
                  {message.role === "assistant" ? (
                    <div
                      className="space-y-2 [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-sm [&_ol]:pl-5 [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: renderCoachMarkdown(message.content) }}
                    />
                  ) : (
                    message.content
                  )}
                </div>
                {message.role === "user" ? (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleEditMessage(message.id, message.content)}
                    className="mt-1 text-xs text-brand-muted underline underline-offset-2 disabled:opacity-50"
                  >
                    Kérdés szerkesztése
                  </button>
                ) : null}
              </div>
            ))}
            {isSending ? <p className="text-xs text-brand-muted">Az edző gondolkodik...</p> : null}
          </div>
          {error ? <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-brand-coral">{error} Helyi edző-módra váltottam.</p> : null}

          {planProposal ? (
            <div className="mt-4">
              <AIPlanProposalCard
                proposal={planProposal}
                exercisesById={exercisesById}
                onSaveNew={canCreatePlan ? () => handleAcceptPlan("new") : undefined}
                onReplace={() => handleAcceptPlan("replace")}
                onAppend={() => handleAcceptPlan("append")}
                onDismiss={dismissPlanProposal}
              />
            </div>
          ) : null}

          {editingMessageId ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-muted">
              <span>A kérdés újraküldése lecseréli az utána következő üzeneteket.</span>
              <button type="button" onClick={() => { setEditingMessageId(undefined); setDraft(""); }} className="shrink-0 underline underline-offset-2">Mégse</button>
            </div>
          ) : null}
          <div className="mt-4 flex gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={editingMessageId ? "Írd át a kérdésed..." : "Írd le, mi foglalkoztat..."}
              rows={1}
              className="max-h-60 min-h-12 flex-1 resize-none overflow-y-auto rounded-xl border border-brand-line px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
            <button type="button" onClick={() => void handleSend()} disabled={isSending || !draft.trim()} className="self-end rounded-xl bg-brand-teal px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Küldés</button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Korábbi beszélgetések</p>
                <p className="mt-1 text-xs text-brand-muted">{conversations.length} / 30 mentett beszélgetés</p>
              </div>
              <button
                type="button"
                disabled={conversations.length >= 30 || isSending}
                onClick={() => {
                  setCreatingConversation(true);
                  setRenamingConversationId(undefined);
                }}
                className="rounded-lg bg-brand-teal px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Új
              </button>
            </div>
            {creatingConversation ? (
              <form onSubmit={handleCreateConversation} className="mb-3 space-y-2">
                <label className="block text-xs font-semibold text-brand-muted" htmlFor="new-conversation-name">Új beszélgetés neve</label>
                <input
                  id="new-conversation-name"
                  autoFocus
                  required
                  maxLength={80}
                  value={newConversationName}
                  onChange={(event) => setNewConversationName(event.target.value)}
                  placeholder="Pl. Kezdő erősítő edzésterv"
                  className="w-full rounded-lg border border-brand-line px-2.5 py-2 text-sm outline-none focus:border-brand-teal"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={!newConversationName.trim()} className="rounded-lg bg-brand-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Létrehozás</button>
                  <button type="button" onClick={() => setCreatingConversation(false)} className="px-2 py-1.5 text-xs text-brand-muted">Mégse</button>
                </div>
              </form>
            ) : null}
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {conversations.map((conversation) => (
                <li key={conversation.id} className={`rounded-xl p-2 ${conversation.id === activeConversationId ? "bg-brand-soft" : ""}`}>
                  {renamingConversationId === conversation.id ? (
                    <form onSubmit={handleRenameConversation} className="space-y-2">
                      <label className="sr-only" htmlFor={`rename-${conversation.id}`}>Beszélgetés átnevezése</label>
                      <input
                        id={`rename-${conversation.id}`}
                        autoFocus
                        required
                        maxLength={80}
                        value={renamedConversationName}
                        onChange={(event) => setRenamedConversationName(event.target.value)}
                        className="w-full rounded-lg border border-brand-line px-2 py-1.5 text-sm outline-none focus:border-brand-teal"
                      />
                      <div className="flex gap-2">
                        <button type="submit" disabled={!renamedConversationName.trim()} className="text-xs font-semibold text-brand-teal">Mentés</button>
                        <button type="button" onClick={() => setRenamingConversationId(undefined)} className="text-xs text-brand-muted">Mégse</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-pressed={conversation.id === activeConversationId}
                        disabled={isSending}
                        onClick={() => {
                          selectConversation(conversation.id);
                          setDraft("");
                          setEditingMessageId(undefined);
                        }}
                        className="w-full truncate text-left text-sm font-medium text-brand-ink disabled:opacity-50"
                      >
                        {conversation.name}
                      </button>
                      <p className="mt-1 truncate text-xs text-brand-muted">
                        {conversation.messages.find((message) => message.role === "user")?.content || "Még nincs üzenet"}
                      </p>
                      <div className="mt-1 flex gap-3">
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => {
                            setRenamingConversationId(conversation.id);
                            setRenamedConversationName(conversation.name);
                            setCreatingConversation(false);
                          }}
                          className="text-xs text-brand-muted underline underline-offset-2 disabled:opacity-50"
                        >
                          Átnevezés
                        </button>
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => {
                            if (window.confirm(`Biztosan törlöd ezt a beszélgetést: „${conversation.name}”?`)) {
                              deleteConversation(conversation.id);
                              setDraft("");
                              setEditingMessageId(undefined);
                            }
                          }}
                          className="text-xs text-brand-coral underline underline-offset-2 disabled:opacity-50"
                        >
                          Törlés
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-line bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Beszélgetés emlékezete</p>
            <p className="mt-2 text-sm leading-6 text-brand-ink">{memory.summary || "Még nincs mentett összefoglaló."}</p>
          </div>
          <div className="rounded-2xl border border-brand-line bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Következő jó kérdés</p>
            <p className="mt-2 text-sm leading-6 text-brand-muted">Mióta edzel, és mi az, ami most a leginkább akadályoz?</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
