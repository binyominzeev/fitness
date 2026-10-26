import { useEffect, useRef } from "react";
import { LOOP_BORDER_COLORS, LOOP_TEXT_COLORS } from "../lib/workout";
import type { Exercise, WorkoutStep } from "../types";

type PlaybackOverviewProps = {
  steps: WorkoutStep[];
  activeStepIndex: number;
  exercisesById: Record<string, Exercise>;
  onSelectStep: (stepIndex: number) => void;
};

type OverviewGroup = {
  itemId: string;
  exerciseId: string;
  round: number;
  totalRounds: number;
  loopIndex: number;
  steps: WorkoutStep[];
};

type OverviewSegment = {
  loopIndex: number;
  totalRounds: number;
  groups: OverviewGroup[];
};

function isSameGroup(a: WorkoutStep, b: WorkoutStep): boolean {
  return a.itemId === b.itemId && a.round === b.round;
}

function groupStepsByItem(steps: WorkoutStep[]): OverviewGroup[] {
  return steps
    .filter((step, index) => steps.findIndex((candidate) => isSameGroup(candidate, step)) === index)
    .map((firstStep) => ({
      itemId: firstStep.itemId,
      exerciseId: firstStep.exerciseId,
      round: firstStep.round,
      totalRounds: firstStep.totalRounds,
      loopIndex: firstStep.loopIndex,
      steps: steps.filter((step) => isSameGroup(step, firstStep)),
    }));
}

function groupSegments(groups: OverviewGroup[]): OverviewSegment[] {
  return groups.reduce<OverviewSegment[]>((segments, group) => {
    const last = segments[segments.length - 1];
    if (last && group.loopIndex !== -1 && last.loopIndex === group.loopIndex) {
      return [...segments.slice(0, -1), { ...last, groups: [...last.groups, group] }];
    }
    return [...segments, { loopIndex: group.loopIndex, totalRounds: group.totalRounds, groups: [group] }];
  }, []);
}


export function PlaybackOverview({ steps, activeStepIndex, exercisesById, onSelectStep }: PlaybackOverviewProps) {
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLOListElement | null>(null);
  const groups = groupStepsByItem(steps);
  const activeStep = steps[activeStepIndex];
  const activeGroupIndex = groups.findIndex((group) => group.itemId === activeStep?.itemId && group.round === activeStep?.round);

  // Scroll only the list container (not the page) so the active row sits mid-panel with upcoming rows visible.
  useEffect(() => {
    const list = listRef.current;
    const row = rowRefs.current[activeGroupIndex];
    if (!list || !row) return;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const offset = rowRect.top - listRect.top + list.scrollTop - (list.clientHeight - rowRect.height) / 2;
    list.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }, [activeGroupIndex]);

  const segments = groupSegments(groups);
  const itemOrder = groups.map((group) => group.itemId).filter((itemId, index, all) => all.indexOf(itemId) === index);

  const renderGroup = (group: OverviewGroup) => {
    const groupIndex = groups.indexOf(group);
    const exercise = exercisesById[group.exerciseId];
    const activeStepInGroup = group.steps.find((step) => steps.indexOf(step) === activeStepIndex);
    const isActiveGroup = groupIndex === activeGroupIndex;
    const workStep = group.steps.find((step) => step.phase === "work");
    const workStepIndex = steps.indexOf(workStep ?? group.steps[0]);

    return (
      <li
        key={`${group.itemId}-${group.round}`}
        ref={(element) => {
          rowRefs.current[groupIndex] = element;
        }}
        className="list-none"
      >
        <button
          type="button"
          onClick={() => onSelectStep(workStepIndex)}
          className={`w-full rounded-lg border px-2 py-1 text-left transition-colors hover:border-brand-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
            isActiveGroup ? "border-brand-teal bg-brand-soft" : "border-brand-line bg-brand-paper/60"
          }`}
          aria-label={`${exercise?.exerciseNameHu ?? "Ismeretlen gyakorlat"} megnyitása`}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-ink text-[10px] font-semibold text-brand-paper">
              {itemOrder.indexOf(group.itemId) + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {exercise?.exerciseNameHu ?? "Ismeretlen gyakorlat"}
            </span>
            {isActiveGroup && (
              <span
                className={`shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] ${activeStepInGroup?.phase === "rest" ? "text-blue-700" : "text-brand-teal"}`}
              >
                {activeStepInGroup?.phase === "rest" ? "Pihenő" : "Most"}
              </span>
            )}
          </div>
        </button>
      </li>
    );
  };

  const renderLoop = (segment: OverviewSegment, segmentIndex: number) => {
    const color = segment.loopIndex % LOOP_BORDER_COLORS.length;
    const rounds = Array.from({ length: segment.totalRounds }, (_, index) => index + 1);
    const firstItemNumber = itemOrder.indexOf(segment.groups[0].itemId) + 1;
    const lastItemNumber = itemOrder.indexOf(segment.groups[segment.groups.length - 1].itemId) + 1;
    const activeRound = segment.groups.some((group) => group.round === activeStep?.round && group.itemId === activeStep?.itemId)
      ? activeStep.round
      : 1;

    return (
      <li key={`loop-${segmentIndex}`} className={`list-none rounded-2xl border-2 p-2 ${LOOP_BORDER_COLORS[color]}`}>
        <p className={`mb-2 px-1 text-xs font-bold uppercase tracking-[0.1em] ${LOOP_TEXT_COLORS[color]}`}>
          ⟲ {firstItemNumber}.–{lastItemNumber}. gyakorlat · {segment.totalRounds}×
        </p>
        <ol className="space-y-2">
          {rounds.map((round) => {
            const roundGroups = segment.groups.filter((group) => group.round === round);
            const isExpanded = round === activeRound;
            const isActiveRound = round === activeStep?.round && roundGroups.some((group) => group.itemId === activeStep?.itemId);

            return (
              <li key={round} className="list-none">
                {isExpanded ? (
                  <>
                    <p className={`mb-1 px-1 text-[11px] font-semibold ${LOOP_TEXT_COLORS[color]}`}>
                      {round}/{segment.totalRounds}. ismétlés
                    </p>
                    <ol className="space-y-2">{roundGroups.map(renderGroup)}</ol>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectStep(steps.indexOf(roundGroups[0].steps[0]))}
                    className={`w-full rounded-xl border border-dashed px-3 py-2 text-left text-xs font-semibold ${LOOP_BORDER_COLORS[color]} ${isActiveRound ? "bg-brand-soft" : "bg-white/70"}`}
                  >
                    {round}/{segment.totalRounds}. ismétlés · {roundGroups.length} gyakorlat
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </li>
    );
  };

  return (
    <aside className="playback-overview-panel rounded-3xl border border-brand-line bg-white p-4 text-left shadow-[0_20px_40px_rgba(16,24,40,0.08)]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Edzésterv</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">{itemOrder.length} gyakorlat</span>
      </div>

      <ol ref={listRef} className="playback-overview-list space-y-1 overflow-y-auto pr-1 max-h-[50svh]">
        {segments.map((segment, segmentIndex) =>
          segment.loopIndex === -1 ? renderGroup(segment.groups[0]) : renderLoop(segment, segmentIndex),
        )}
      </ol>
    </aside>
  );
}
