import type { WorkoutItem, WorkoutLoop, WorkoutStep } from "../types";

export const MIN_LOOP_REPEATS = 2;
export const MAX_LOOP_REPEATS = 20;
export const LOOP_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-violet-500"];
export const LOOP_TEXT_COLORS = ["text-sky-700", "text-emerald-700", "text-orange-700", "text-violet-700"];
export const LOOP_BORDER_COLORS = ["border-sky-400", "border-emerald-400", "border-orange-400", "border-violet-400"];

export function clampSeconds(value: number): number {
  return Math.max(1, Math.min(3600, Math.floor(value || 0)));
}

export function clampRepeats(value: number): number {
  return Math.max(MIN_LOOP_REPEATS, Math.min(MAX_LOOP_REPEATS, Math.floor(value || 0)));
}

export type LoopRange = { loop: WorkoutLoop; start: number; end: number };

/** Az érvényes ciklusok indextartománya, kezdet szerint rendezve; az érvénytelen és az átfedő ciklusok kimaradnak. */
export function getLoopRanges(items: WorkoutItem[], loops: WorkoutLoop[] | undefined): LoopRange[] {
  const ranges = (loops ?? [])
    .map((loop) => ({
      loop,
      start: items.findIndex((item) => item.id === loop.startItemId),
      end: items.findIndex((item) => item.id === loop.endItemId),
    }))
    .filter((range) => range.start !== -1 && range.end >= range.start)
    .sort((a, b) => a.start - b.start);

  return ranges.filter((range, index) => index === 0 || range.start > ranges[index - 1].end);
}

export function normalizeLoops(items: WorkoutItem[], loops: WorkoutLoop[] | undefined): WorkoutLoop[] {
  return getLoopRanges(items, loops).map(({ loop }) => ({ ...loop, repeats: clampRepeats(loop.repeats) }));
}

export function buildWorkoutSteps(items: WorkoutItem[], loops?: WorkoutLoop[]): WorkoutStep[] {
  const ranges = getLoopRanges(items, loops);
  const visits: Array<{ item: WorkoutItem; round: number; totalRounds: number; loopIndex: number }> = [];

  let index = 0;
  while (index < items.length) {
    const range = ranges.find((candidate) => candidate.start === index);
    if (!range) {
      visits.push({ item: items[index], round: 1, totalRounds: 1, loopIndex: -1 });
      index += 1;
      continue;
    }

    const repeats = clampRepeats(range.loop.repeats);
    const loopIndex = ranges.indexOf(range);
    for (let round = 1; round <= repeats; round += 1) {
      for (let inner = range.start; inner <= range.end; inner += 1) {
        visits.push({ item: items[inner], round, totalRounds: repeats, loopIndex });
      }
    }
    index = range.end + 1;
  }

  const steps: WorkoutStep[] = [];
  visits.forEach(({ item, round, totalRounds, loopIndex }, visitIndex) => {
    const base = { itemId: item.id, exerciseId: item.exerciseId, round, totalRounds, loopIndex };
    steps.push({ ...base, id: `${item.id}-r${visitIndex}-work`, phase: "work", durationSeconds: clampSeconds(item.workSeconds) });

    if (visitIndex < visits.length - 1) {
      steps.push({ ...base, id: `${item.id}-r${visitIndex}-rest`, phase: "rest", durationSeconds: clampSeconds(item.restSeconds) });
    }
  });

  return steps;
}
