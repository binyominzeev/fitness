export type Exercise = {
  id: string;
  exerciseNameEn: string;
  exerciseNameHu: string;
  category: string;
  description: string;
  imageFile: string;
  imageUrl: string;
};

export type WorkoutItem = {
  id: string;
  exerciseId: string;
  workSeconds: number;
  restSeconds: number;
};

export type BulkCopyField = "workSeconds" | "restSeconds";

export type BulkCopyScope = "above" | "below" | "allAbove" | "allBelow" | "all";

export type WorkoutStep = {
  id: string;
  itemId: string;
  exerciseId: string;
  phase: "work" | "rest";
  durationSeconds: number;
};

export type WorkoutPlaybackState = "idle" | "running" | "paused" | "finished";
