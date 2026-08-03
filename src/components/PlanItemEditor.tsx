import { useState } from "react";
import type { BulkCopyField, BulkCopyScope, Exercise, WorkoutItem } from "../types";

type PlanItemEditorProps = {
  item: WorkoutItem;
  exercise: Exercise | undefined;
  index: number;
  total: number;
  onChange: (itemId: string, patch: Partial<Pick<WorkoutItem, "workSeconds" | "restSeconds">>) => void;
  onBulkCopy: (sourceItemId: string, field: BulkCopyField, scope: BulkCopyScope) => void;
  onMove: (itemId: string, direction: "up" | "down") => void;
  onRemove: (itemId: string) => void;
};

const BULK_SCOPE_OPTIONS: Array<{ value: BulkCopyScope; label: string }> = [
  { value: "above", label: "Közvetlenül felette" },
  { value: "below", label: "Közvetlenül alatta" },
  { value: "allAbove", label: "Összes felette" },
  { value: "allBelow", label: "Összes alatta" },
  { value: "all", label: "Összes többi" },
];

function isScopeAvailable(scope: BulkCopyScope, index: number, total: number): boolean {
  switch (scope) {
    case "above":
      return index > 0;
    case "below":
      return index < total - 1;
    case "allAbove":
      return index > 0;
    case "allBelow":
      return index < total - 1;
    case "all":
      return total > 1;
    default:
      return false;
  }
}

export function PlanItemEditor({ item, exercise, index, total, onChange, onBulkCopy, onMove, onRemove }: PlanItemEditorProps) {
  const [workScope, setWorkScope] = useState<BulkCopyScope>("allBelow");
  const [restScope, setRestScope] = useState<BulkCopyScope>("allBelow");
  const workScopeEnabled = isScopeAvailable(workScope, index, total);
  const restScopeEnabled = isScopeAvailable(restScope, index, total);

  return (
    <article className="rounded-2xl border border-brand-line bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
      <div className="mb-3 flex items-center gap-3">
        <img
          src={exercise?.imageUrl}
          alt={exercise?.exerciseNameHu}
          className="h-14 w-14 rounded-xl bg-brand-soft object-contain p-2"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">{exercise?.exerciseNameHu ?? "Ismeretlen gyakorlat"}</p>
          <p className="text-xs text-brand-muted">{exercise?.category ?? "-"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-brand-muted">Munka (mp)</span>
          <input
            type="number"
            min={1}
            value={item.workSeconds}
            onChange={(event) => onChange(item.id, { workSeconds: Number(event.target.value) })}
            className="w-full rounded-xl border border-brand-line px-3 py-2"
          />
          <div className="mt-2 flex items-center gap-2">
            <select
              value={workScope}
              onChange={(event) => setWorkScope(event.target.value as BulkCopyScope)}
              className="min-w-0 flex-1 rounded-xl border border-brand-line px-2 py-2 text-xs"
              aria-label="Munkaidő másolás célcsoport"
            >
              {BULK_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={!isScopeAvailable(option.value, index, total)}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!workScopeEnabled}
              onClick={() => onBulkCopy(item.id, "workSeconds", workScope)}
              className="rounded-xl border border-brand-line px-2 py-2 text-xs disabled:opacity-40"
            >
              Másolás
            </button>
          </div>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-brand-muted">Pihenő (mp)</span>
          <input
            type="number"
            min={1}
            value={item.restSeconds}
            onChange={(event) => onChange(item.id, { restSeconds: Number(event.target.value) })}
            className="w-full rounded-xl border border-brand-line px-3 py-2"
          />
          <div className="mt-2 flex items-center gap-2">
            <select
              value={restScope}
              onChange={(event) => setRestScope(event.target.value as BulkCopyScope)}
              className="min-w-0 flex-1 rounded-xl border border-brand-line px-2 py-2 text-xs"
              aria-label="Pihenőidő másolás célcsoport"
            >
              {BULK_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={!isScopeAvailable(option.value, index, total)}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!restScopeEnabled}
              onClick={() => onBulkCopy(item.id, "restSeconds", restScope)}
              className="rounded-xl border border-brand-line px-2 py-2 text-xs disabled:opacity-40"
            >
              Másolás
            </button>
          </div>
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(item.id, "up")}
          className="flex-1 rounded-xl border border-brand-line px-3 py-2 text-sm disabled:opacity-40"
        >
          Fel
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(item.id, "down")}
          className="flex-1 rounded-xl border border-brand-line px-3 py-2 text-sm disabled:opacity-40"
        >
          Le
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-xl bg-brand-coral px-3 py-2 text-sm font-semibold text-white"
        >
          Törlés
        </button>
      </div>
    </article>
  );
}
