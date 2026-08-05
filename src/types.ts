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

export type WizardGoal = "strength" | "fatloss" | "mobility" | "desk" | "conditioning";

export type WizardTimeBudget = "5" | "10" | "15" | "20plus";

export type WizardFrequency = "1" | "2" | "3" | "almostDaily";

export type WizardLevel = "starter" | "restart" | "sometimes" | "regular";

export type WizardAvoidance = "pushup" | "jumping" | "kneeLoad" | "abs" | "wristLoad";

export type WizardLocation = "home" | "gym" | "outdoor";

export type WizardPersonality = "push" | "habit" | "variety";

export type WizardAnswers = {
  goal: WizardGoal;
  timeBudget: WizardTimeBudget;
  frequency: WizardFrequency;
  level: WizardLevel;
  avoidances: WizardAvoidance[];
  location: WizardLocation;
  personality: WizardPersonality;
  note: string;
};
