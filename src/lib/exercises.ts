import type { Exercise } from "../types";

type RawExercise = {
  exercise_name: string;
  exercise_name_hu: string;
  group: string;
  description: string;
  image_file: string;
};

export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch("/exercise_database.json", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Nem sikerült betölteni a gyakorlat-adatbázist.");
  }

  const records = (await response.json()) as RawExercise[];

  return records.map((record, index) => ({
    id: `${record.exercise_name}-${record.image_file}-${index}`,
    exerciseNameEn: record.exercise_name,
    exerciseNameHu: record.exercise_name_hu || record.exercise_name,
    category: record.group,
    description: record.description,
    imageFile: record.image_file,
    imageUrl: `/pictograms/${record.image_file}`,
  }));
}

export function extractCategories(exercises: Exercise[]): string[] {
  return [...new Set(exercises.map((exercise) => exercise.category))];
}

export function groupExercisesByCategory(
  exercises: Exercise[],
): Array<{ category: string; exercises: Exercise[] }> {
  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((accumulator, exercise) => {
    const category = exercise.category;

    if (!accumulator[category]) {
      accumulator[category] = [];
    }

    accumulator[category].push(exercise);
    return accumulator;
  }, {});

  return Object.entries(groupedExercises).map(([category, categoryExercises]) => ({
    category,
    exercises: categoryExercises,
  }));
}

export function filterExercises(exercises: Exercise[], query: string, category: string): Exercise[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("hu-HU");

  return exercises.filter((exercise) => {
    const categoryMatch = category === "all" || exercise.category === category;
    if (!categoryMatch) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = `${exercise.exerciseNameHu} ${exercise.exerciseNameEn} ${exercise.category}`.toLocaleLowerCase(
      "hu-HU",
    );

    return searchable.includes(normalizedQuery);
  });
}

export function mapExercisesById(exercises: Exercise[]): Record<string, Exercise> {
  return exercises.reduce<Record<string, Exercise>>((accumulator, exercise) => {
    accumulator[exercise.id] = exercise;
    return accumulator;
  }, {});
}
