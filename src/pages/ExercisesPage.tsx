import { useMemo } from "react";
import { ExerciseCard } from "../components/ExerciseCard";
import { useWorkoutPlan } from "../context/WorkoutContext";
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

  const categoryOptions = useMemo(() => ["all", ...categories], [categories]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-brand-line bg-white p-3 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <label className="mb-2 block text-xs uppercase tracking-wide text-brand-muted">Kereses</label>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="pl. guggolas, plank, kardio"
          className="mb-3 w-full rounded-xl border border-brand-line px-3 py-2"
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-brand-muted">Kategoria</label>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full rounded-xl border border-brand-line px-3 py-2"
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "Minden kategoria" : option}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="rounded-2xl bg-brand-soft p-4 text-sm">Betoltes...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {filteredExercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} onAdd={addItem} />
        ))}
      </div>

      {!isLoading && !error && filteredExercises.length === 0 && (
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">Nincs talalat a feltetelekkel.</p>
      )}
    </section>
  );
}
