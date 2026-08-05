import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PlanItemEditor } from "../components/PlanItemEditor";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { exportPlanToJson, importPlanFromJson } from "../lib/storage";
import type { Exercise } from "../types";

type PlanPageProps = {
  exercisesById: Record<string, Exercise>;
};

export function PlanPage({ exercisesById }: PlanPageProps) {
  const navigate = useNavigate();
  const { items, updateItem, bulkCopyItemValue, moveItem, removeItem, clearAll, replaceItems } = useWorkoutPlan();
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const payload = exportPlanToJson(items);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fitness-plan-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback(`Exportálva: ${items.length} elem.`);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const importedItems = importPlanFromJson(raw);
      replaceItems(importedItems);
      setFeedback(`Betöltve: ${importedItems.length} elem.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "A fájl nem olvasható.";
      setFeedback(message);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-brand-line bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-brand-muted">Elemek száma: {items.length}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/terv/uj")}
              className="rounded-xl bg-brand-teal px-3 py-2 text-sm font-semibold text-white"
            >
              Varázsló indítása
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl border border-brand-line px-3 py-2 text-sm"
            >
              JSON export
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-brand-line px-3 py-2 text-sm"
            >
              JSON import
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-brand-line px-3 py-2 text-sm"
            >
              Összes törlése
            </button>
          </div>
        </div>

        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />

        {feedback ? (
          <p className={`mt-3 text-sm ${feedback.startsWith("Betöltve") || feedback.startsWith("Exportálva") ? "text-brand-muted" : "text-red-600"}`}>
            {feedback}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">
          Az edzésterved még üres. Menj a Gyakorlatok oldalra, és adj hozzá elemeket.
        </p>
      ) : (
        items.map((item, index) => (
          <PlanItemEditor
            key={item.id}
            item={item}
            exercise={exercisesById[item.exerciseId]}
            index={index}
            total={items.length}
            onChange={updateItem}
            onBulkCopy={bulkCopyItemValue}
            onMove={moveItem}
            onRemove={removeItem}
          />
        ))
      )}
    </section>
  );
}
