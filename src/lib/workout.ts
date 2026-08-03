import type { WorkoutItem, WorkoutStep } from "../types";

export function clampSeconds(value: number): number {
  return Math.max(1, Math.min(3600, Math.floor(value || 0)));
}

export function buildWorkoutSteps(items: WorkoutItem[]): WorkoutStep[] {
  const steps: WorkoutStep[] = [];

  items.forEach((item, index) => {
    steps.push({
      id: `${item.id}-work`,
      itemId: item.id,
      exerciseId: item.exerciseId,
      phase: "work",
      durationSeconds: clampSeconds(item.workSeconds),
    });

    const isLastItem = index === items.length - 1;
    if (!isLastItem) {
      steps.push({
        id: `${item.id}-rest`,
        itemId: item.id,
        exerciseId: item.exerciseId,
        phase: "rest",
        durationSeconds: clampSeconds(item.restSeconds),
      });
    }
  });

  return steps;
}
