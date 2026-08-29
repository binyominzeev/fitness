import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
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
  const { profile, memory, messages, isSending, error, planProposal, saveProfile, sendMessage, dismissPlanProposal, clearConversation } =
    useAICoach(exercises);
  const { items, replaceItems } = useWorkoutPlan();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    const node = event.target;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 240)}px`;
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
    await sendMessage(value);
  };

  const handleAcceptPlan = (mode: "replace" | "append") => {
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

    replaceItems(mode === "append" ? [...items, ...generatedItems] : generatedItems);
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
            <h3 className="font-semibold">Beszélgetés</h3>
            <button type="button" onClick={clearConversation} className="text-xs text-brand-muted underline underline-offset-2">Előzmények törlése</button>
          </div>
          <div className="min-h-64 space-y-3">
            {messages.length === 0 ? <p className="rounded-xl bg-brand-soft p-3 text-sm leading-6 text-brand-muted">Kezdd például így: „Két hete próbálok rendszeresen edzeni, de mindig elfogy a lendületem.”</p> : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-brand-ink text-white" : "bg-brand-soft text-brand-ink"}`}
              >
                {message.role === "assistant" ? (
                  <div
                    className="space-y-2 [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-sm [&_ol]:pl-5 [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: renderCoachMarkdown(message.content) }}
                  />
                ) : (
                  message.content
                )}
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
                onReplace={() => handleAcceptPlan("replace")}
                onAppend={() => handleAcceptPlan("append")}
                onDismiss={dismissPlanProposal}
              />
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
              placeholder="Írd le, mi foglalkoztat..."
              rows={1}
              className="max-h-60 min-h-12 flex-1 resize-none overflow-y-auto rounded-xl border border-brand-line px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
            <button type="button" onClick={() => void handleSend()} disabled={isSending || !draft.trim()} className="self-end rounded-xl bg-brand-teal px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Küldés</button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand-line bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Hosszú távú emlékezet</p>
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
