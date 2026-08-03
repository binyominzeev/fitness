import type { Exercise, WorkoutItem } from "../types";

type PlanItemEditorProps = {
  item: WorkoutItem;
  exercise: Exercise | undefined;
  index: number;
  total: number;
  onChange: (itemId: string, patch: Partial<Pick<WorkoutItem, "workSeconds" | "restSeconds">>) => void;
  onMove: (itemId: string, direction: "up" | "down") => void;
  onRemove: (itemId: string) => void;
};

export function PlanItemEditor({ item, exercise, index, total, onChange, onMove, onRemove }: PlanItemEditorProps) {
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
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-brand-muted">Piheno (mp)</span>
          <input
            type="number"
            min={1}
            value={item.restSeconds}
            onChange={(event) => onChange(item.id, { restSeconds: Number(event.target.value) })}
            className="w-full rounded-xl border border-brand-line px-3 py-2"
          />
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
          Torles
        </button>
      </div>
    </article>
  );
}
