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

export type AICoachProfile = {
  displayName: string;
  goal: string;
  level: string;
  weeklyFrequency: string;
  availableMinutes: string;
  location: string;
  limitations: string;
  notes: string;
};

export type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AICoachMemory = {
  summary: string;
  updatedAt: string;
};

export type WorkoutLogEntry = {
  id: string;
  completedAt: string;
  durationSeconds: number;
  completed: boolean;
  exerciseCount: number;
  difficulty?: number;
  note?: string;
};

export type AIPlanProposal = {
  title: string;
  rationale: string;
  items: Array<{
    exerciseId: string;
    workSeconds: number;
    restSeconds: number;
  }>;
};
