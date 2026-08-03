import type { Exercise } from "../types";

type ExerciseCardProps = {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
};

export function ExerciseCard({ exercise, onAdd }: ExerciseCardProps) {
  return (
    <article className="rounded-2xl border border-brand-line bg-white p-3 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
      <div className="flex items-center gap-3">
        <img
          src={exercise.imageUrl}
          alt={exercise.exerciseNameHu}
          className="h-16 w-16 rounded-xl bg-brand-soft object-contain p-2"
          loading="lazy"
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold">{exercise.exerciseNameHu}</h3>
          <p className="truncate text-xs text-brand-muted">{exercise.category}</p>
        </div>

        <button
          type="button"
          onClick={() => onAdd(exercise)}
          className="rounded-xl bg-brand-teal px-3 py-2 text-sm font-semibold text-white"
        >
          Hozzáad
        </button>
      </div>
    </article>
  );
}
