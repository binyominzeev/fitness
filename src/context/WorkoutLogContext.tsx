import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { saveData } from "../lib/dataApi";
import type { WorkoutLogEntry } from "../types";
import { useStoredValue } from "./UserDataContext";

const MAX_WORKOUT_LOG_ENTRIES = 100;

type WorkoutLogAction = { type: "add"; entry: WorkoutLogEntry };

type WorkoutLogContextValue = {
  entries: WorkoutLogEntry[];
  addEntry: (entry: WorkoutLogEntry) => void;
};

const WorkoutLogContext = createContext<WorkoutLogContextValue | null>(null);

function isWorkoutLogEntry(value: unknown): value is WorkoutLogEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<WorkoutLogEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.completedAt === "string" &&
    Number.isFinite(Date.parse(candidate.completedAt)) &&
    typeof candidate.durationSeconds === "number" &&
    Number.isFinite(candidate.durationSeconds) &&
    candidate.durationSeconds > 0 &&
    typeof candidate.completed === "boolean" &&
    typeof candidate.exerciseCount === "number" &&
    Number.isFinite(candidate.exerciseCount) &&
    candidate.exerciseCount >= 0
  );
}

function parseWorkoutLog(value: unknown): WorkoutLogEntry[] {
  return Array.isArray(value) ? value.filter(isWorkoutLogEntry).slice(-MAX_WORKOUT_LOG_ENTRIES) : [];
}

function workoutLogReducer(state: WorkoutLogEntry[], action: WorkoutLogAction): WorkoutLogEntry[] {
  switch (action.type) {
    case "add":
      if (state.some((entry) => entry.id === action.entry.id)) return state;
      return [...state, action.entry].slice(-MAX_WORKOUT_LOG_ENTRIES);
  }
}

export function WorkoutLogProvider({ children }: { children: ReactNode }) {
  const storedLog = useStoredValue("workoutLog");
  const initialEntries = useMemo(() => parseWorkoutLog(storedLog), [storedLog]);
  const [entries, dispatch] = useReducer(workoutLogReducer, initialEntries);

  useEffect(() => {
    if (entries !== initialEntries) saveData("workoutLog", entries);
  }, [entries, initialEntries]);

  const addEntry = useCallback((entry: WorkoutLogEntry) => dispatch({ type: "add", entry }), []);
  const value = useMemo(() => ({ entries, addEntry }), [entries, addEntry]);

  return <WorkoutLogContext.Provider value={value}>{children}</WorkoutLogContext.Provider>;
}

export function useWorkoutLog(): WorkoutLogContextValue {
  const context = useContext(WorkoutLogContext);
  if (!context) throw new Error("useWorkoutLog csak WorkoutLogProvider alatt használható.");
  return context;
}