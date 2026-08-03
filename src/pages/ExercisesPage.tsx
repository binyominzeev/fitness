import { useEffect, useRef, useState, useMemo } from "react";
import { ExerciseCard } from "../components/ExerciseCard";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { groupExercisesByCategory } from "../lib/exercises";
import type { Exercise } from "../types";

type ExercisesPageProps = {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  filteredExercises: Exercise[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
};

export function ExercisesPage({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  filteredExercises,
  categories,
  isLoading,
  error,
}: ExercisesPageProps) {
  const { addItem } = useWorkoutPlan();
  const [addedExerciseName, setAddedExerciseName] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const categoryOptions = useMemo(() => ["all", ...categories], [categories]);
  const groupedExercises = useMemo(() => groupExercisesByCategory(filteredExercises), [filteredExercises]);

  const handleAddExercise = (exercise: Exercise) => {
    addItem(exercise.id);
    setAddedExerciseName(exercise.exerciseNameHu);

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setAddedExerciseName(null);
      feedbackTimeoutRef.current = null;
    }, 1800);
  };

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <section className="space-y-4">
      {addedExerciseName && (
        <p
          role="status"
          aria-live="polite"
          className="sticky top-[4.5rem] z-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm"
        >
          Hozzáadva az edzéstervhez: <span className="font-semibold">{addedExerciseName}</span>
        </p>
      )}

      <div className="rounded-2xl border border-brand-line bg-white p-3 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <label className="mb-2 block text-xs uppercase tracking-wide text-brand-muted">Keresés</label>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="pl. guggolás, plank, kardió"
          className="mb-3 w-full rounded-xl border border-brand-line px-3 py-2"
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-brand-muted">Kategória</label>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full rounded-xl border border-brand-line px-3 py-2"
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "Minden kategória" : option}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="rounded-2xl bg-brand-soft p-4 text-sm">Betöltés...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        {groupedExercises.map(({ category, exercises }) => (
          <section
            key={category}
            className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
          >
            <div className="flex items-center justify-between border-b border-brand-line/70 bg-brand-soft px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-brand-dark">{category}</h2>
                <p className="text-xs text-brand-muted">{exercises.length} gyakorlat</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-muted">
                {exercises.length}
              </span>
            </div>

            <div className="space-y-3 p-3">
              {exercises.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} onAdd={handleAddExercise} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!isLoading && !error && filteredExercises.length === 0 && (
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">Nincs találat a feltételekkel.</p>
      )}
    </section>
  );
}
