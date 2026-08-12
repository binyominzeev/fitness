import { useEffect, useRef } from "react";
import type { Exercise, WorkoutStep } from "../types";

type PlaybackOverviewProps = {
  steps: WorkoutStep[];
  activeStepIndex: number;
  exercisesById: Record<string, Exercise>;
};

type OverviewGroup = {
  itemId: string;
  exerciseId: string;
  steps: WorkoutStep[];
};

function groupStepsByItem(steps: WorkoutStep[]): OverviewGroup[] {
  return steps
    .filter((step, index) => steps.findIndex((candidate) => candidate.itemId === step.itemId) === index)
    .map((firstStep) => ({
      itemId: firstStep.itemId,
      exerciseId: firstStep.exerciseId,
      steps: steps.filter((step) => step.itemId === firstStep.itemId),
    }));
}

function formatDuration(seconds: number): string {
  return `${seconds} mp`;
}

export function PlaybackOverview({ steps, activeStepIndex, exercisesById }: PlaybackOverviewProps) {
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const groups = groupStepsByItem(steps);
  const activeStep = steps[activeStepIndex];
  const activeGroupIndex = groups.findIndex((group) => group.itemId === activeStep?.itemId);

  useEffect(() => {
    rowRefs.current[activeGroupIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeGroupIndex]);

  return (
    <aside className="playback-overview-panel rounded-3xl border border-brand-line bg-white p-4 text-left shadow-[0_20px_40px_rgba(16,24,40,0.08)]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Edzésterv</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">{groups.length} gyakorlat</span>
      </div>

      <ol className="playback-overview-list space-y-2 overflow-y-auto pr-1">
        {groups.map((group, groupIndex) => {
          const exercise = exercisesById[group.exerciseId];
          const activeStepInGroup = group.steps.find((step) => steps.indexOf(step) === activeStepIndex);
          const isActiveGroup = groupIndex === activeGroupIndex;
          const workStep = group.steps.find((step) => step.phase === "work");
          const restStep = group.steps.find((step) => step.phase === "rest");

          return (
            <li
              key={group.itemId}
              ref={(element) => {
                rowRefs.current[groupIndex] = element;
              }}
              className={`rounded-2xl border p-3 transition-colors ${
                isActiveGroup ? "border-brand-teal bg-brand-soft" : "border-brand-line bg-brand-paper/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-ink text-xs font-semibold text-brand-paper">
                  {groupIndex + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {exercise?.exerciseNameHu ?? "Ismeretlen gyakorlat"}
                </p>
                {isActiveGroup && <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-teal">Most</span>}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-lg px-2 py-1.5 ${activeStepInGroup?.phase === "work" ? "bg-green-100 text-green-800" : "bg-white/70 text-brand-muted"}`}>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.08em]">Munka</span>
                  <span className="font-mono font-semibold">{workStep ? formatDuration(workStep.durationSeconds) : "-"}</span>
                </div>
                <div className={`rounded-lg px-2 py-1.5 ${activeStepInGroup?.phase === "rest" ? "bg-blue-100 text-blue-800" : "bg-white/70 text-brand-muted"}`}>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.08em]">Pihenő</span>
                  <span className="font-mono font-semibold">{restStep ? formatDuration(restStep.durationSeconds) : "-"}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
