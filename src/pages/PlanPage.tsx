import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PlanItemEditor } from "../components/PlanItemEditor";
import { PlanSwitcher } from "../components/PlanSwitcher";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { exportPlanToJson, importPlanFromJson } from "../lib/storage";
import { clampRepeats, getLoopRanges, MAX_LOOP_REPEATS, MIN_LOOP_REPEATS } from "../lib/workout";
import type { Exercise } from "../types";

const LOOP_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-violet-500"];

type PlanPageProps = {
  exercisesById: Record<string, Exercise>;
};

type LoopSelection = { start: number | null; end: number | null; repeats: number };

function RepeatsStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Kevesebb ismétlés"
        disabled={value <= MIN_LOOP_REPEATS}
        onClick={() => onChange(clampRepeats(value - 1))}
        className="h-8 w-8 rounded-lg border border-brand-line disabled:opacity-40"
      >
        −
      </button>
      <span className="w-10 text-center font-mono text-sm font-semibold">{value}×</span>
      <button
        type="button"
        aria-label="Több ismétlés"
        disabled={value >= MAX_LOOP_REPEATS}
        onClick={() => onChange(clampRepeats(value + 1))}
        className="h-8 w-8 rounded-lg border border-brand-line disabled:opacity-40"
      >
        +
      </button>
    </span>
  );
}

export function PlanPage({ exercisesById }: PlanPageProps) {
  const navigate = useNavigate();
  const { items, loops, activePlan, canCreatePlan, updateItem, bulkCopyItemValue, moveItem, removeItem, clearAll, replaceItems, createPlan, addLoop, updateLoop, removeLoop } = useWorkoutPlan();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selection, setSelection] = useState<LoopSelection | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loopRanges = getLoopRanges(items, loops);
  const selStart = selection?.start ?? null;
  const selEnd = selection?.end ?? selStart;
  const selectionOverlaps =
    selStart !== null && selEnd !== null && loopRanges.some((range) => selStart <= range.end && selEnd >= range.start);
  const canSaveLoop = selStart !== null && selEnd !== null && !selectionOverlaps;

  const handlePick = (index: number) => {
    setSelection((current) => {
      if (!current || current.start === null || current.end !== null || index < current.start) {
        return { start: index, end: null, repeats: current?.repeats ?? 2 };
      }
      return { ...current, end: index };
    });
  };

  const saveLoop = () => {
    if (!selection || selStart === null || selEnd === null || selectionOverlaps) return;
    addLoop(items[selStart].id, items[selEnd].id, selection.repeats);
    setSelection(null);
  };

  const handleExport = () => {
    const payload = exportPlanToJson(items, loops);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activePlan.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
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
      const { items: importedItems, loops: importedLoops } = importPlanFromJson(raw);
      if (canCreatePlan) {
        createPlan(file.name.replace(/\.json$/i, ""), importedItems, importedLoops);
      } else {
        replaceItems(importedItems, importedLoops);
      }
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
      <PlanSwitcher exercisesById={exercisesById} />
      <div className="rounded-2xl border border-brand-line bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-brand-muted">{activePlan.name} · elemek száma: {items.length}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                navigate("/ai-edzo", {
                  state: {
                    initialPrompt: `Nézd meg a mostani edzéstervemet (${activePlan.name}). Nem rossz, de szeretnék módosítani rajta: `,
                  },
                })
              }
              className="rounded-xl bg-brand-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Konzultáció AI edzővel
            </button>
            <button
              type="button"
              onClick={() => navigate("/terv/uj")}
              className="rounded-xl bg-brand-teal px-3 py-2 text-sm font-semibold text-white"
            >
              Varázsló indítása
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setSelection(selection ? null : { start: null, end: null, repeats: 2 })}
              className={`rounded-xl border px-3 py-2 text-sm disabled:opacity-40 ${selection ? "border-brand-teal bg-brand-soft font-semibold" : "border-brand-line"}`}
            >
              Ismétlés ciklus
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

      {selection ? (
        <div className="sticky top-2 z-10 space-y-2 rounded-2xl border border-brand-teal bg-brand-soft p-3 text-sm shadow-md">
          <p>
            {selStart === null
              ? "Válaszd ki a ciklus első gyakorlatát a szám gombbal."
              : selection.end === null
                ? `Első: ${selStart + 1}. gyakorlat. Válaszd ki az utolsót (vagy mentsd egyetlen gyakorlatként).`
                : `Ciklus: ${selStart + 1}.–${selEnd! + 1}. gyakorlat.`}
          </p>
          {selectionOverlaps ? <p className="text-red-600">A kijelölés átfed egy másik ciklussal.</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <RepeatsStepper value={selection.repeats} onChange={(repeats) => setSelection({ ...selection, repeats })} />
            <button
              type="button"
              disabled={!canSaveLoop}
              onClick={saveLoop}
              className="rounded-xl bg-brand-teal px-3 py-2 font-semibold text-white disabled:opacity-40"
            >
              Mentés
            </button>
            <button type="button" onClick={() => setSelection(null)} className="rounded-xl border border-brand-line bg-white px-3 py-2">
              Mégse
            </button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">
          Az edzésterved még üres. Menj a Gyakorlatok oldalra, és adj hozzá elemeket.
        </p>
      ) : (
        items.map((item, index) => {
          const loopIndex = loopRanges.findIndex((range) => index >= range.start && index <= range.end);
          const range = loopIndex === -1 ? undefined : loopRanges[loopIndex];
          const isSelected = selection !== null && selStart !== null && selEnd !== null && index >= selStart && index <= selEnd;
          const barShape = range ? `${index === range.start ? "rounded-t-full" : ""} ${index === range.end ? "rounded-b-full" : ""}` : "";

          return (
            <div key={item.id}>
              <div className="flex items-stretch gap-2">
                <div className={`w-1.5 shrink-0 ${range ? `${LOOP_COLORS[loopIndex % LOOP_COLORS.length]} ${barShape}` : ""}`} aria-hidden="true" />
                {selection ? (
                  <button
                    type="button"
                    disabled={range !== undefined}
                    onClick={() => handlePick(index)}
                    aria-label={`${index + 1}. gyakorlat kiválasztása`}
                    className={`h-9 w-9 shrink-0 self-center rounded-full border text-sm font-semibold disabled:opacity-30 ${isSelected ? "border-brand-teal bg-brand-teal text-white" : "border-brand-line bg-white"}`}
                  >
                    {index + 1}
                  </button>
                ) : null}
                <div className={`min-w-0 flex-1 rounded-2xl ${isSelected ? "ring-2 ring-brand-teal" : ""}`}>
                  <PlanItemEditor
                    item={item}
                    exercise={exercisesById[item.exerciseId]}
                    index={index}
                    total={items.length}
                    onChange={updateItem}
                    onBulkCopy={bulkCopyItemValue}
                    onMove={moveItem}
                    onRemove={removeItem}
                  />
                </div>
              </div>
              {range && index === range.end ? (
                <div className="mt-2 ml-3.5 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm">
                  <span className="font-semibold">
                    Ciklus {range.start + 1}.–{range.end + 1}. ⟲
                  </span>
                  <RepeatsStepper value={range.loop.repeats} onChange={(repeats) => updateLoop(range.loop.id, repeats)} />
                  <button type="button" onClick={() => removeLoop(range.loop.id)} className="ml-auto rounded-lg border border-brand-line bg-white px-2 py-1 text-xs">
                    Ciklus törlése
                  </button>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </section>
  );
}
