import { createContext, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { persistPlan, loadPersistedPlan } from "../lib/storage";
import { clampSeconds } from "../lib/workout";
import type { WorkoutItem } from "../types";

type WorkoutState = {
  items: WorkoutItem[];
};

type WorkoutAction =
  | { type: "add"; exerciseId: string }
  | { type: "remove"; itemId: string }
  | { type: "update"; itemId: string; patch: Partial<Pick<WorkoutItem, "workSeconds" | "restSeconds">> }
  | { type: "move"; itemId: string; direction: "up" | "down" }
  | { type: "clear" };

type WorkoutContextValue = {
  items: WorkoutItem[];
  addItem: (exerciseId: string) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, patch: Partial<Pick<WorkoutItem, "workSeconds" | "restSeconds">>) => void;
  moveItem: (itemId: string, direction: "up" | "down") => void;
  clearAll: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function createItem(exerciseId: string): WorkoutItem {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    workSeconds: 30,
    restSeconds: 15,
  };
}

function reducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "add": {
      const next = { items: [...state.items, createItem(action.exerciseId)] };
      persistPlan(next.items);
      return next;
    }
    case "remove": {
      const next = { items: state.items.filter((item) => item.id !== action.itemId) };
      persistPlan(next.items);
      return next;
    }
    case "update": {
      const next = {
        items: state.items.map((item) => {
          if (item.id !== action.itemId) {
            return item;
          }

          return {
            ...item,
            workSeconds:
              action.patch.workSeconds === undefined
                ? item.workSeconds
                : clampSeconds(action.patch.workSeconds),
            restSeconds:
              action.patch.restSeconds === undefined
                ? item.restSeconds
                : clampSeconds(action.patch.restSeconds),
          };
        }),
      };
      persistPlan(next.items);
      return next;
    }
    case "move": {
      const currentIndex = state.items.findIndex((item) => item.id === action.itemId);
      if (currentIndex === -1) {
        return state;
      }

      const targetIndex = action.direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= state.items.length) {
        return state;
      }

      const nextItems = [...state.items];
      const [item] = nextItems.splice(currentIndex, 1);
      nextItems.splice(targetIndex, 0, item);

      const next = { items: nextItems };
      persistPlan(next.items);
      return next;
    }
    case "clear": {
      const next = { items: [] };
      persistPlan(next.items);
      return next;
    }
    default:
      return state;
  }
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const initialState = useMemo<WorkoutState>(() => ({ items: loadPersistedPlan() }), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      items: state.items,
      addItem: (exerciseId) => dispatch({ type: "add", exerciseId }),
      removeItem: (itemId) => dispatch({ type: "remove", itemId }),
      updateItem: (itemId, patch) => dispatch({ type: "update", itemId, patch }),
      moveItem: (itemId, direction) => dispatch({ type: "move", itemId, direction }),
      clearAll: () => dispatch({ type: "clear" }),
    }),
    [state.items],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutPlan(): WorkoutContextValue {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkoutPlan csak WorkoutProvider alatt hasznalhato.");
  }

  return context;
}
