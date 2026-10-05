import type { AIPlanProposal, Exercise } from "../types";

const STOP_WORDS = new Set(["a", "az", "es", "is", "on", "and", "the", "of", "to"]);

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function getNameCandidates(message: string): string[] {
  const candidates = [...message.matchAll(/\*\*(.+?)\*\*/g)].map((match) => match[1]);
  const listLines = message.match(/^\s*(?:\d+[.)]|[-*•])\s+.+$/gm) ?? [];

  for (const line of listLines) {
    const value = line.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "").replace(/\*\*/g, "").trim();
    if (value) candidates.push(value);
  }

  const uniqueCandidates = new Set<string>();
  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "")
      .replace(/\([^)]*\)/g, (group) => group)
      .split(/[.!?\n:]/)[0]
      .trim();
    if (cleaned) uniqueCandidates.add(cleaned);

    const parenthetical = /\(([^)]+)\)/.exec(candidate)?.[1];
    if (parenthetical) uniqueCandidates.add(parenthetical.trim());
  }

  return [...uniqueCandidates];
}

function matchExercise(candidate: string, exercises: Exercise[]): Exercise | undefined {
  const candidateTokens = meaningfulTokens(candidate);
  if (candidateTokens.length === 0) return undefined;
  const candidateNormalized = normalize(candidate);

  let best: { exercise: Exercise; score: number } | undefined;
  for (const exercise of exercises) {
    for (const name of [exercise.exerciseNameHu, exercise.exerciseNameEn]) {
      const normalizedName = normalize(name);
      const nameTokens = meaningfulTokens(name);
      if (normalizedName === candidateNormalized) return exercise;

      const nameSet = new Set(nameTokens);
      const overlap = candidateTokens.filter((token) => nameSet.has(token)).length;
      const score = overlap / candidateTokens.length;
      if (score >= 0.6 && (!best || score > best.score)) {
        best = { exercise, score };
      }
    }
  }

  return best?.exercise;
}

export function derivePlanFromCoachText(message: string, exercises: Exercise[]): AIPlanProposal | undefined {
  if (!message.trim() || exercises.length === 0) return undefined;

  const matched: Exercise[] = [];
  for (const candidate of getNameCandidates(message)) {
    const exercise = matchExercise(candidate, exercises);
    if (exercise && !matched.some((item) => item.id === exercise.id)) {
      matched.push(exercise);
    }
  }

  if (matched.length === 0) return undefined;

  return {
    title: "Edzésterv a beszélgetés javaslata alapján",
    rationale: "A felsorolt gyakorlatokat az alkalmazás saját katalógusához illesztettük. A tervet elfogadás előtt átnézheted.",
    items: matched.slice(0, 20).map((exercise) => ({
      exerciseId: exercise.id,
      workSeconds: 30,
      restSeconds: 15,
    })),
  };
}
