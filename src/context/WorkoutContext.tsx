import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { saveData } from "../lib/dataApi";
import { parseStoredPlans, createSavedPlan, normalizePlanName, MAX_PLANS } from "../lib/storage";
import { clampSeconds } from "../lib/workout";
import type { BulkCopyField, BulkCopyScope, PlansState, SavedPlan, WorkoutItem } from "../types";
import { useStoredValue } from "./UserDataContext";

type WorkoutState = {
  items: WorkoutItem[];
};

type ItemAction =
  | { type: "add"; exerciseId: string }
  | { type: "remove"; itemId: string }
  | { type: "update"; itemId: string; patch: Partial<Pick<WorkoutItem, "workSeconds" | "restSeconds">> }
  | { type: "bulkCopy"; sourceItemId: string; field: BulkCopyField; scope: BulkCopyScope }
  | { type: "move"; itemId: string; direction: "up" | "down" }
  | { type: "replace"; items: WorkoutItem[] }
  | { type: "clear" };

type PlanAction =
  | { type: "createPlan"; plan: SavedPlan }
  | { type: "switchPlan"; id: string; now: string }
  | { type: "renamePlan"; id: string; name: string; now: string }
  | { type: "duplicatePlan"; id: string; copy: SavedPlan }
  | { type: "deletePlan"; id: string }
  | { type: "markUsed"; now: string };

type WorkoutAction = ItemAction | PlanAction;

type WorkoutContextValue = {
  items: WorkoutItem[];
  plans: SavedPlan[];
  activePlan: SavedPlan;
  canCreatePlan: boolean;
  addItem: (exerciseId: string) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, patch: Partial<Pick<WorkoutItem, "workSeconds" | "restSeconds">>) => void;
  bulkCopyItemValue: (sourceItemId: string, field: BulkCopyField, scope: BulkCopyScope) => void;
  moveItem: (itemId: string, direction: "up" | "down") => void;
  replaceItems: (items: WorkoutItem[]) => void;
  clearAll: () => void;
  /** Új tervet hoz létre és aktívvá teszi; az új terv azonosítóját adja vissza. */
  createPlan: (name: string, items?: WorkoutItem[]) => string;
  switchPlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  duplicatePlan: (id: string) => void;
  deletePlan: (id: string) => void;
  markPlanUsed: () => void;
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

function getTargetIndexes(sourceIndex: number, total: number, scope: BulkCopyScope): number[] {
  switch (scope) {
    case "above":
      return sourceIndex > 0 ? [sourceIndex - 1] : [];
    case "below":
      return sourceIndex < total - 1 ? [sourceIndex + 1] : [];
    case "allAbove":
      return Array.from({ length: sourceIndex }, (_, index) => index);
    case "allBelow":
      return Array.from({ length: total - sourceIndex - 1 }, (_, offset) => sourceIndex + offset + 1);
    case "all":
      return Array.from({ length: total }, (_, index) => index).filter((index) => index !== sourceIndex);
    default:
      return [];
  }
}

function itemsReducer(state: WorkoutState, action: ItemAction): WorkoutState {
  switch (action.type) {
    case "add": {
      const next = { items: [...state.items, createItem(action.exerciseId)] };
      return next;
    }
    case "remove": {
      const next = { items: state.items.filter((item) => item.id !== action.itemId) };
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
      return next;
    }
    case "bulkCopy": {
      const sourceIndex = state.items.findIndex((item) => item.id === action.sourceItemId);
      if (sourceIndex === -1) {
        return state;
      }

      const sourceValue = clampSeconds(state.items[sourceIndex][action.field]);
      const lastIndex = state.items.length - 1;
      const targetIndexes = getTargetIndexes(sourceIndex, state.items.length, action.scope);
      if (targetIndexes.length === 0) {
        return state;
      }
      const targetIndexSet = new Set(targetIndexes);

      let didChange = false;
      const nextItems = state.items.map((item, index) => {
        if (!targetIndexSet.has(index)) {
          return item;
        }

        if (action.field === "restSeconds" && index === lastIndex) {
          return item;
        }

        if (item[action.field] === sourceValue) {
          return item;
        }

        didChange = true;
        return {
          ...item,
          [action.field]: sourceValue,
        };
      });

      if (!didChange) {
        return state;
      }

      const next = { items: nextItems };
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
      return next;
    }
    case "replace": {
      const next = { items: action.items };
      return next;
    }
    case "clear": {
      const next = { items: [] };
      return next;
    }
    default:
      return state;
  }
}

function mostRecentlyUsed(plans: SavedPlan[]): SavedPlan {
  return plans.reduce((best, plan) => (plan.lastUsedAt > best.lastUsedAt ? plan : best));
}

function mapPlan(state: PlansState, id: string, update: (plan: SavedPlan) => SavedPlan): PlansState {
  return { ...state, plans: state.plans.map((plan) => (plan.id === id ? update(plan) : plan)) };
}

function reducer(state: PlansState, action: WorkoutAction): PlansState {
  switch (action.type) {
    case "createPlan":
      return state.plans.length >= MAX_PLANS ? state : { activeId: action.plan.id, plans: [...state.plans, action.plan] };
    case "switchPlan":
      return state.plans.some((plan) => plan.id === action.id)
        ? { ...mapPlan(state, action.id, (plan) => ({ ...plan, lastUsedAt: action.now })), activeId: action.id }
        : state;
    case "renamePlan": {
      const name = normalizePlanName(action.name);
      return name ? mapPlan(state, action.id, (plan) => ({ ...plan, name, updatedAt: action.now })) : state;
    }
    case "duplicatePlan":
      return state.plans.length >= MAX_PLANS || !state.plans.some((plan) => plan.id === action.id)
        ? state
        : { activeId: action.copy.id, plans: [...state.plans, action.copy] };
    case "deletePlan": {
      if (state.plans.length <= 1) return state;
      const plans = state.plans.filter((plan) => plan.id !== action.id);
      if (plans.length === state.plans.length) return state;
      return { activeId: state.activeId === action.id ? mostRecentlyUsed(plans).id : state.activeId, plans };
    }
    case "markUsed":
      return mapPlan(state, state.activeId, (plan) => ({ ...plan, lastUsedAt: action.now }));
    default: {
      const active = state.plans.find((plan) => plan.id === state.activeId);
      if (!active) return state;
      const nextItems = itemsReducer({ items: active.items }, action).items;
      if (nextItems === active.items) return state;
      return mapPlan(state, active.id, (plan) => ({ ...plan, items: nextItems, updatedAt: new Date().toISOString() }));
    }
  }
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const storedPlans = useStoredValue("plans");
  const storedLegacyPlan = useStoredValue("plan");
  const initialState = useMemo(() => parseStoredPlans(storedPlans, storedLegacyPlan), [storedPlans, storedLegacyPlan]);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // A kezdőállapotot nem írjuk vissza; csak a felhasználó módosításait.
    if (state !== initialState) {
      saveData("plans", state);
    }
  }, [state, initialState]);

  const activePlan = state.plans.find((plan) => plan.id === state.activeId) ?? state.plans[0];

  const value = useMemo<WorkoutContextValue>(
    () => ({
      items: activePlan.items,
      plans: state.plans,
      activePlan,
      canCreatePlan: state.plans.length < MAX_PLANS,
      addItem: (exerciseId) => dispatch({ type: "add", exerciseId }),
      removeItem: (itemId) => dispatch({ type: "remove", itemId }),
      updateItem: (itemId, patch) => dispatch({ type: "update", itemId, patch }),
      bulkCopyItemValue: (sourceItemId, field, scope) => dispatch({ type: "bulkCopy", sourceItemId, field, scope }),
      moveItem: (itemId, direction) => dispatch({ type: "move", itemId, direction }),
      replaceItems: (items) => dispatch({ type: "replace", items }),
      clearAll: () => dispatch({ type: "clear" }),
      createPlan: (name, items = []) => {
        const plan = createSavedPlan(name, items);
        dispatch({ type: "createPlan", plan });
        return plan.id;
      },
      switchPlan: (id) => dispatch({ type: "switchPlan", id, now: new Date().toISOString() }),
      renamePlan: (id, name) => dispatch({ type: "renamePlan", id, name, now: new Date().toISOString() }),
      duplicatePlan: (id) => {
        const source = state.plans.find((plan) => plan.id === id);
        if (!source) return;
        const copy = createSavedPlan(`${source.name} (másolat)`, source.items.map((item) => ({ ...item, id: crypto.randomUUID() })));
        dispatch({ type: "duplicatePlan", id, copy });
      },
      deletePlan: (id) => dispatch({ type: "deletePlan", id }),
      markPlanUsed: () => dispatch({ type: "markUsed", now: new Date().toISOString() }),
    }),
    [state.plans, activePlan],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutPlan(): WorkoutContextValue {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkoutPlan csak WorkoutProvider alatt használható.");
  }

  return context;
}
