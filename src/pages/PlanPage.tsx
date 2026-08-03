import { PlanItemEditor } from "../components/PlanItemEditor";
import { useWorkoutPlan } from "../context/WorkoutContext";
import type { Exercise } from "../types";

type PlanPageProps = {
  exercisesById: Record<string, Exercise>;
};

export function PlanPage({ exercisesById }: PlanPageProps) {
  const { items, updateItem, moveItem, removeItem, clearAll } = useWorkoutPlan();

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">
          Az edzesterved meg ures. Menj a Gyakorlatok oldalra es adj hozza elemeket.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-brand-line bg-white p-3">
        <p className="text-sm text-brand-muted">Elemek szama: {items.length}</p>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-xl border border-brand-line px-3 py-2 text-sm"
        >
          Osszes torlese
        </button>
      </div>

      {items.map((item, index) => (
        <PlanItemEditor
          key={item.id}
          item={item}
          exercise={exercisesById[item.exerciseId]}
          index={index}
          total={items.length}
          onChange={updateItem}
          onMove={moveItem}
          onRemove={removeItem}
        />
      ))}
    </section>
  );
}
