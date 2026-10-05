import { useMemo, useState } from "react";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { suggestPlanNames } from "../lib/aiCoachClient";
import { MAX_PLAN_NAME } from "../lib/storage";
import type { Exercise, SavedPlan } from "../types";

type PlanSwitcherProps = {
  exercisesById: Record<string, Exercise>;
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return "";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "most";
  if (minutes < 60) return `${minutes} perce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} napja`;
  return new Date(iso).toLocaleDateString("hu-HU");
}

function planMinutes(plan: SavedPlan): number {
  const seconds = plan.items.reduce((sum, item, index) => sum + item.workSeconds + (index < plan.items.length - 1 ? item.restSeconds : 0), 0);
  return Math.max(0, Math.round(seconds / 60));
}

export function PlanSwitcher({ exercisesById }: PlanSwitcherProps) {
  const { plans, activePlan, canCreatePlan, createPlan, switchPlan, renamePlan, duplicatePlan, deletePlan } = useWorkoutPlan();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)), [plans]);
  const lastUsedId = sortedPlans[0]?.id;

  const startEditing = (plan: SavedPlan) => {
    setEditingId(plan.id);
    setDraft(plan.name);
    setSuggestions([]);
    setSuggestError("");
  };

  const finishEditing = () => {
    if (editingId) renamePlan(editingId, draft);
    setEditingId(null);
  };

  const handleCreate = () => {
    const id = createPlan(`Új terv ${plans.length + 1}`);
    setEditingId(id);
    setDraft(`Új terv ${plans.length + 1}`);
    setSuggestions([]);
    setSuggestError("");
  };

  const handleSuggest = async (plan: SavedPlan) => {
    const names = plan.items.map((item) => exercisesById[item.exerciseId]?.exerciseNameHu).filter((name): name is string => Boolean(name));
    setIsSuggesting(true);
    setSuggestError("");
    try {
      setSuggestions(await suggestPlanNames(names));
    } catch (error) {
      setSuggestError(error instanceof Error ? error.message : "Az AI névjavaslat most nem elérhető.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleDelete = (plan: SavedPlan) => {
    if (window.confirm(`Biztosan törlöd ezt a tervet: „${plan.name}"?`)) deletePlan(plan.id);
  };

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Edzésterveim ({plans.length})</p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreatePlan}
          className="rounded-xl bg-brand-teal px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Új terv
        </button>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {sortedPlans.map((plan) => {
          const isActive = plan.id === activePlan.id;
          const isEditing = plan.id === editingId;
          return (
            <li key={plan.id} className={`rounded-xl border p-3 ${isActive ? "border-brand-teal bg-brand-soft" : "border-brand-line bg-white"}`}>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={draft}
                    maxLength={MAX_PLAN_NAME}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") finishEditing();
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded-lg border border-brand-line bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-teal"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={finishEditing} className="rounded-lg bg-brand-ink px-2 py-1 text-xs font-semibold text-white">
                      Mentés
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSuggest(plan)}
                      disabled={isSuggesting || plan.items.length === 0}
                      className="rounded-lg border border-brand-line px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {isSuggesting ? "Gondolkodom..." : "AI névjavaslat"}
                    </button>
                  </div>
                  {suggestions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {suggestions.map((name) => (
                        <button key={name} type="button" onClick={() => setDraft(name)} className="rounded-full bg-white px-2 py-1 text-xs text-brand-teal ring-1 ring-brand-teal">
                          {name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {suggestError ? <p className="text-xs text-brand-coral">{suggestError}</p> : null}
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-semibold">{plan.name}</p>
                    <div className="flex shrink-0 gap-1">
                      {isActive ? <span className="rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-semibold text-white">Aktív</span> : null}
                      {plan.id === lastUsedId ? <span className="rounded-full bg-brand-ink px-2 py-0.5 text-[10px] font-semibold text-white">Legutóbb használt</span> : null}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-brand-muted">
                    {plan.items.length} gyakorlat · ~{planMinutes(plan)} perc · használva: {formatRelative(plan.lastUsedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {isActive ? null : (
                      <button type="button" onClick={() => switchPlan(plan.id)} className="rounded-lg bg-brand-ink px-2 py-1 font-semibold text-white">
                        Betöltés
                      </button>
                    )}
                    <button type="button" onClick={() => startEditing(plan)} className="rounded-lg border border-brand-line px-2 py-1">
                      Átnevezés
                    </button>
                    <button type="button" onClick={() => duplicatePlan(plan.id)} disabled={!canCreatePlan} className="rounded-lg border border-brand-line px-2 py-1 disabled:opacity-50">
                      Duplikálás
                    </button>
                    <button type="button" onClick={() => handleDelete(plan)} disabled={plans.length <= 1} className="rounded-lg border border-brand-line px-2 py-1 text-brand-coral disabled:opacity-50">
                      Törlés
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {canCreatePlan ? null : <p className="mt-2 text-xs text-brand-muted">Elérted a tervek maximális számát.</p>}
    </div>
  );
}
