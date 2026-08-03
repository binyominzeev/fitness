import { useEffect, useMemo, useState } from "react";
import { extractCategories, filterExercises, loadExercises, mapExercisesById } from "../lib/exercises";
import type { Exercise } from "../types";

type UseExercisesState = {
  exercises: Exercise[];
  isLoading: boolean;
  error: string | null;
};

export function useExercises(query: string, category: string) {
  const [state, setState] = useState<UseExercisesState>({
    exercises: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    async function run() {
      try {
        const exercises = await loadExercises();
        if (!isActive) {
          return;
        }
        setState({ exercises, isLoading: false, error: null });
      } catch {
        if (!isActive) {
          return;
        }
        setState({ exercises: [], isLoading: false, error: "A gyakorlatok betoltese sikertelen." });
      }
    }

    run();

    return () => {
      isActive = false;
    };
  }, []);

  const categories = useMemo(() => extractCategories(state.exercises), [state.exercises]);
  const filtered = useMemo(
    () => filterExercises(state.exercises, query, category),
    [state.exercises, query, category],
  );
  const byId = useMemo(() => mapExercisesById(state.exercises), [state.exercises]);

  return {
    exercises: state.exercises,
    filteredExercises: filtered,
    categories,
    exercisesById: byId,
    isLoading: state.isLoading,
    error: state.error,
  };
}
