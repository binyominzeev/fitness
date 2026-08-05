import { clampSeconds } from "./workout";
import type {
  Exercise,
  WizardAnswers,
  WizardAvoidance,
  WizardGoal,
  WizardLevel,
  WizardPersonality,
  WizardTimeBudget,
  WorkoutItem,
} from "../types";

type WizardOption<T extends string> = {
  value: T;
  label: string;
};

export const WIZARD_GOAL_OPTIONS: WizardOption<WizardGoal>[] = [
  { value: "strength", label: "💪 Erősödni szeretnék" },
  { value: "fatloss", label: "🔥 Fogyni / fittebb lenni" },
  { value: "mobility", label: "🧘 Mozgékonyabb, energikusabb lenni" },
  { value: "desk", label: "🪑 Sok ülés ellensúlyozása" },
  { value: "conditioning", label: "🏃 Általános kondíció" },
];

export const WIZARD_TIME_OPTIONS: WizardOption<WizardTimeBudget>[] = [
  { value: "5", label: "5 perc" },
  { value: "10", label: "10 perc" },
  { value: "15", label: "15 perc" },
  { value: "20plus", label: "20+ perc" },
];

export const WIZARD_FREQUENCY_OPTIONS: WizardOption<"1" | "2" | "3" | "almostDaily">[] = [
  { value: "1", label: "Heti 1x" },
  { value: "2", label: "Heti 2x" },
  { value: "3", label: "Heti 3x" },
  { value: "almostDaily", label: "Majdnem minden nap" },
];

export const WIZARD_LEVEL_OPTIONS: WizardOption<"starter" | "restart" | "sometimes" | "regular">[] = [
  { value: "starter", label: "🐣 Most kezdem" },
  { value: "restart", label: "🔄 Újrakezdem hosszú kihagyás után" },
  { value: "sometimes", label: "🙂 Mozgok néha" },
  { value: "regular", label: "💪 Rendszeresen edzek" },
];

export const WIZARD_AVOIDANCE_OPTIONS: WizardOption<WizardAvoidance>[] = [
  { value: "pushup", label: "❌ Fekvőtámasz" },
  { value: "jumping", label: "❌ Ugrálás" },
  { value: "kneeLoad", label: "❌ Térdet terhelő gyakorlatok" },
  { value: "abs", label: "❌ Hasgyakorlatok" },
  { value: "wristLoad", label: "❌ Csuklóterhelés" },
];

export const WIZARD_LOCATION_OPTIONS: WizardOption<"home" | "gym" | "outdoor">[] = [
  { value: "home", label: "Otthon" },
  { value: "gym", label: "Edzőteremben" },
  { value: "outdoor", label: "Szabadban" },
];

export const WIZARD_PERSONALITY_OPTIONS: WizardOption<WizardPersonality>[] = [
  { value: "push", label: "🟢 Szeretem, ha érzem, hogy dolgoztam" },
  { value: "habit", label: "🔵 A lényeg, hogy szokássá váljon" },
  { value: "variety", label: "🟣 Szeretek változatosságot" },
];

const WARMUP_CODES = new Set(["1", "7"]);
const COOLDOWN_CODES = new Set(["8", "9"]);
const HIGH_INTENSITY_CODES = new Set(["6"]);

const GOAL_CATEGORY_WEIGHTS: Record<WizardGoal, Record<string, number>> = {
  strength: { "2": 4, "3": 4, "4": 4, "5": 3, "6": 1, "7": 1, "8": 1, "10": 2 },
  fatloss: { "6": 4, "2": 3, "3": 2, "5": 2, "1": 2, "7": 1, "8": 1, "10": 2 },
  mobility: { "7": 4, "8": 4, "9": 3, "1": 3, "10": 3, "5": 1, "6": 1 },
  desk: { "1": 4, "7": 4, "8": 3, "10": 3, "5": 2, "9": 2, "6": 1 },
  conditioning: { "6": 3, "2": 2, "3": 2, "4": 2, "5": 2, "1": 2, "7": 1, "8": 1 },
};

const KEYWORDS_BY_AVOIDANCE: Record<WizardAvoidance, string[]> = {
  pushup: ["fekvotamasz", "fekvot", "push", "wall push", "tricep dip", "vall", "plank"],
  jumping: ["ugr", "jump", "burpee", "jack", "high knee", "skater", "squat jump", "lunge jump"],
  kneeLoad: ["gugg", "squat", "kitores", "lunge", "step", "high knee", "burpee", "calf raise"],
  abs: ["core", "has", "crunch", "dead bug", "plank", "mountain", "sit", "twist"],
  wristLoad: ["fekv", "push", "plank", "bear", "mountain", "vall", "downward dog"],
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCategoryCode(exercise: Exercise): string {
  const match = exercise.category.match(/^(\d+)\./);
  return match?.[1] ?? "0";
}

function isExcludedByAvoidance(exercise: Exercise, avoidance: WizardAvoidance): boolean {
  const normalized = normalize(`${exercise.exerciseNameHu} ${exercise.exerciseNameEn} ${exercise.category}`);
  return KEYWORDS_BY_AVOIDANCE[avoidance].some((keyword) => normalized.includes(keyword));
}

function isExcluded(exercise: Exercise, avoidances: WizardAvoidance[]): boolean {
  if (avoidances.includes("abs") && getCategoryCode(exercise) === "5") {
    return true;
  }

  return avoidances.some((avoidance) => isExcludedByAvoidance(exercise, avoidance));
}

function intensityBias(level: WizardLevel, categoryCode: string): number {
  if (!HIGH_INTENSITY_CODES.has(categoryCode)) {
    return 0;
  }

  if (level === "starter" || level === "restart") {
    return -3;
  }

  if (level === "regular") {
    return 2;
  }

  return 0;
}

function personalityBias(personality: WizardPersonality, categoryCode: string): number {
  if (personality === "habit") {
    if (categoryCode === "10" || WARMUP_CODES.has(categoryCode) || COOLDOWN_CODES.has(categoryCode)) {
      return 2;
    }
    if (HIGH_INTENSITY_CODES.has(categoryCode)) {
      return -2;
    }
  }

  if (personality === "push" && (categoryCode === "2" || categoryCode === "3" || categoryCode === "6")) {
    return 2;
  }

  return 0;
}

function locationBias(exercise: Exercise, location: WizardAnswers["location"]): number {
  const normalized = normalize(`${exercise.exerciseNameHu} ${exercise.exerciseNameEn}`);

  if (location === "outdoor") {
    if (normalized.includes("wall") || normalized.includes("chair") || normalized.includes("ulve")) {
      return -2;
    }
    if (getCategoryCode(exercise) === "6") {
      return 2;
    }
  }

  if (location === "home" && normalized.includes("step up")) {
    return -1;
  }

  return 0;
}

function frequencyBias(frequency: WizardAnswers["frequency"], categoryCode: string): number {
  if (frequency === "almostDaily") {
    if (WARMUP_CODES.has(categoryCode) || COOLDOWN_CODES.has(categoryCode)) {
      return 1;
    }
    if (HIGH_INTENSITY_CODES.has(categoryCode)) {
      return -1;
    }
  }

  if (frequency === "1" && HIGH_INTENSITY_CODES.has(categoryCode)) {
    return 1;
  }

  return 0;
}

function getPlanCount(timeBudget: WizardTimeBudget, level: WizardLevel, personality: WizardPersonality): number {
  const base = { "5": 4, "10": 6, "15": 8, "20plus": 10 }[timeBudget];

  let count = base;
  if (level === "starter" || level === "restart") {
    count -= 1;
  }
  if (level === "regular") {
    count += 1;
  }
  if (personality === "variety") {
    count += 1;
  }

  return Math.max(3, Math.min(12, count));
}

function getDurations(answers: WizardAnswers): { workSeconds: number; restSeconds: number } {
  let work = 35;
  let rest = 20;

  if (answers.level === "starter" || answers.level === "restart") {
    work = 30;
    rest = 25;
  }

  if (answers.level === "regular") {
    work = 40;
    rest = 20;
  }

  if (answers.personality === "push") {
    work += 5;
    rest -= 5;
  }

  if (answers.personality === "habit") {
    work -= 5;
    rest += 5;
  }

  if (answers.goal === "mobility" || answers.goal === "desk") {
    work = Math.min(work, 30);
    rest = Math.max(rest, 20);
  }

  return {
    workSeconds: clampSeconds(work),
    restSeconds: clampSeconds(rest),
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function scoreExercise(exercise: Exercise, answers: WizardAnswers): number {
  const categoryCode = getCategoryCode(exercise);
  const goalWeight = GOAL_CATEGORY_WEIGHTS[answers.goal][categoryCode] ?? 0;

  const score =
    goalWeight * 4 +
    intensityBias(answers.level, categoryCode) +
    personalityBias(answers.personality, categoryCode) +
    locationBias(exercise, answers.location) +
    frequencyBias(answers.frequency, categoryCode);

  const tieBreaker = (hashString(exercise.id) % 1000) / 1000;
  return score + tieBreaker;
}

function pickWithVariety(exercises: Exercise[], count: number): Exercise[] {
  const result: Exercise[] = [];
  const usedCategories = new Set<string>();

  for (const exercise of exercises) {
    if (result.length >= count) {
      break;
    }

    const code = getCategoryCode(exercise);
    if (usedCategories.has(code) && exercises.length > count) {
      continue;
    }

    result.push(exercise);
    usedCategories.add(code);
  }

  if (result.length < count) {
    for (const exercise of exercises) {
      if (result.length >= count) {
        break;
      }
      if (result.some((item) => item.id === exercise.id)) {
        continue;
      }
      result.push(exercise);
    }
  }

  return result;
}

function orderPlan(exercises: Exercise[]): Exercise[] {
  const warmup = exercises.filter((exercise) => WARMUP_CODES.has(getCategoryCode(exercise)));
  const cooldown = exercises.filter((exercise) => COOLDOWN_CODES.has(getCategoryCode(exercise)));
  const main = exercises.filter(
    (exercise) => !WARMUP_CODES.has(getCategoryCode(exercise)) && !COOLDOWN_CODES.has(getCategoryCode(exercise)),
  );

  return [...warmup, ...main, ...cooldown];
}

export function buildWizardRecommendation(exercises: Exercise[], answers: WizardAnswers): Exercise[] {
  const pool = exercises.filter((exercise) => !isExcluded(exercise, answers.avoidances));
  const fallbackPool = pool.length > 0 ? pool : exercises;

  const ranked = [...fallbackPool].sort((left, right) => scoreExercise(right, answers) - scoreExercise(left, answers));
  const count = getPlanCount(answers.timeBudget, answers.level, answers.personality);

  const picked = answers.personality === "variety" ? pickWithVariety(ranked, count) : ranked.slice(0, count);
  return orderPlan(picked);
}

export function buildWorkoutItemsFromWizard(exercises: Exercise[], answers: WizardAnswers): WorkoutItem[] {
  const recommendation = buildWizardRecommendation(exercises, answers);
  const durations = getDurations(answers);

  return recommendation.map((exercise) => ({
    id: crypto.randomUUID(),
    exerciseId: exercise.id,
    workSeconds: durations.workSeconds,
    restSeconds: durations.restSeconds,
  }));
}
