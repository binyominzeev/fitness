import type { AIPlanProposal, Exercise } from "../types";

type AIPlanProposalCardProps = {
  proposal: AIPlanProposal;
  exercisesById: Record<string, Exercise>;
  onReplace: () => void;
  onAppend: () => void;
  onDismiss: () => void;
};

export function AIPlanProposalCard({ proposal, exercisesById, onReplace, onAppend, onDismiss }: AIPlanProposalCardProps) {
  const knownItems = proposal.items.filter((item) => Boolean(exercisesById[item.exerciseId]));

  return (
    <div className="rounded-2xl border border-brand-teal bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
      <p className="text-xs uppercase tracking-[0.16em] text-brand-teal">AI edzésterv javaslat</p>
      <h3 className="mt-1 font-display text-lg font-semibold">{proposal.title}</h3>
      {proposal.rationale ? <p className="mt-1 text-sm leading-6 text-brand-muted">{proposal.rationale}</p> : null}

      <ul className="mt-3 space-y-2">
        {knownItems.map((item, index) => {
          const exercise = exercisesById[item.exerciseId];
          if (!exercise) return null;
          return (
            <li key={`${item.exerciseId}-${index}`} className="flex items-center gap-3 rounded-xl bg-brand-soft p-2">
              <img src={exercise.imageUrl} alt={exercise.exerciseNameHu} className="h-12 w-12 rounded-lg bg-white object-contain p-1" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{exercise.exerciseNameHu}</p>
                <p className="text-xs text-brand-muted">
                  {item.workSeconds}s munka / {item.restSeconds}s pihenő
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {knownItems.length === 0 ? (
        <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-brand-coral">
          A javasolt gyakorlatok közül egy sem található a jelenlegi katalógusban.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={onReplace} className="rounded-xl bg-brand-ink px-3 py-2 text-sm font-semibold text-white">
            Csere a mostani tervre
          </button>
          <button type="button" onClick={onAppend} className="rounded-xl bg-brand-teal px-3 py-2 text-sm font-semibold text-white">
            Hozzáadás a tervhez
          </button>
          <button type="button" onClick={onDismiss} className="rounded-xl border border-brand-line px-3 py-2 text-sm text-brand-muted">
            Elvetés
          </button>
        </div>
      )}
    </div>
  );
}
