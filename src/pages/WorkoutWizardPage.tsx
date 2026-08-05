import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkoutPlan } from "../context/WorkoutContext";
import {
  buildWizardRecommendation,
  buildWorkoutItemsFromWizard,
  WIZARD_AVOIDANCE_OPTIONS,
  WIZARD_FREQUENCY_OPTIONS,
  WIZARD_GOAL_OPTIONS,
  WIZARD_LEVEL_OPTIONS,
  WIZARD_LOCATION_OPTIONS,
  WIZARD_PERSONALITY_OPTIONS,
  WIZARD_TIME_OPTIONS,
} from "../lib/workoutWizard";
import type { Exercise, WizardAnswers, WizardAvoidance } from "../types";

type WorkoutWizardPageProps = {
  exercises: Exercise[];
};

const STEP_TITLES = [
  "Mi a célod?",
  "Mennyi időd van?",
  "Milyen gyakran edzel?",
  "Milyen szinten vagy?",
  "Van valami, amit kerüljünk?",
  "Hol edzel?",
  "Melyik áll közelebb hozzád?",
  "Ellenőrzés és generálás",
] as const;

const TOTAL_STEPS = STEP_TITLES.length;

const INITIAL_ANSWERS: WizardAnswers = {
  goal: "conditioning",
  timeBudget: "10",
  frequency: "2",
  level: "starter",
  avoidances: [],
  location: "home",
  personality: "habit",
  note: "",
};

export function WorkoutWizardPage({ exercises }: WorkoutWizardPageProps) {
  const navigate = useNavigate();
  const { items, replaceItems } = useWorkoutPlan();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>(INITIAL_ANSWERS);
  const [saveMode, setSaveMode] = useState<"replace" | "append">("replace");

  const recommended = useMemo(() => buildWizardRecommendation(exercises, answers), [exercises, answers]);

  const handleToggleAvoidance = (value: WizardAvoidance) => {
    setAnswers((current) => {
      const alreadySelected = current.avoidances.includes(value);
      return {
        ...current,
        avoidances: alreadySelected
          ? current.avoidances.filter((avoidance) => avoidance !== value)
          : [...current.avoidances, value],
      };
    });
  };

  const handleGenerate = () => {
    const generatedItems = buildWorkoutItemsFromWizard(exercises, answers);
    if (generatedItems.length === 0) {
      return;
    }

    if (saveMode === "append") {
      replaceItems([...items, ...generatedItems]);
    } else {
      replaceItems(generatedItems);
    }

    navigate("/terv");
  };

  const canGoBack = step > 0;
  const canGoNext = step < TOTAL_STEPS - 1;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-muted">Edzésterv varázsló</p>
          <p className="text-xs text-brand-muted">
            {step + 1}/{TOTAL_STEPS}
          </p>
        </div>

        <div className="mb-4 h-2 w-full rounded-full bg-brand-soft">
          <div
            className="h-2 rounded-full bg-brand-teal transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <h2 className="mb-4 text-lg font-semibold">{STEP_TITLES[step]}</h2>

        {step === 0 ? (
          <div className="space-y-2">
            {WIZARD_GOAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, goal: option.value }))}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                  answers.goal === option.value
                    ? "border-brand-teal bg-brand-soft font-semibold"
                    : "border-brand-line bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {WIZARD_TIME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, timeBudget: option.value }))}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  answers.timeBudget === option.value
                    ? "border-brand-teal bg-brand-soft font-semibold"
                    : "border-brand-line bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            {WIZARD_FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, frequency: option.value }))}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                  answers.frequency === option.value
                    ? "border-brand-teal bg-brand-soft font-semibold"
                    : "border-brand-line bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            {WIZARD_LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, level: option.value }))}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                  answers.level === option.value
                    ? "border-brand-teal bg-brand-soft font-semibold"
                    : "border-brand-line bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-2">
            {WIZARD_AVOIDANCE_OPTIONS.map((option) => {
              const isSelected = answers.avoidances.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleAvoidance(option.value)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    isSelected ? "border-brand-coral bg-orange-50 font-semibold" : "border-brand-line bg-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            <p className="text-xs text-brand-muted">Többet is bejelölhetsz.</p>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {WIZARD_LOCATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, location: option.value }))}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  answers.location === option.value
                    ? "border-brand-teal bg-brand-soft font-semibold"
                    : "border-brand-line bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-3">
            <div className="space-y-2">
              {WIZARD_PERSONALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAnswers((current) => ({ ...current, personality: option.value }))}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    answers.personality === option.value
                      ? "border-brand-teal bg-brand-soft font-semibold"
                      : "border-brand-line bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-wide text-brand-muted">
                Opcionális megjegyzés
              </span>
              <textarea
                value={answers.note}
                onChange={(event) => setAnswers((current) => ({ ...current, note: event.target.value }))}
                placeholder="Pl. reggel szeretek edzeni, vagy érzékeny a derekam."
                className="min-h-24 w-full rounded-xl border border-brand-line px-3 py-2"
              />
            </label>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-line bg-brand-soft p-3">
              <p className="text-sm font-semibold">Javasolt gyakorlatok: {recommended.length} db</p>
              <ul className="mt-2 space-y-1 text-sm text-brand-muted">
                {recommended.slice(0, 10).map((exercise) => (
                  <li key={exercise.id}>• {exercise.exerciseNameHu}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSaveMode("replace")}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  saveMode === "replace" ? "border-brand-teal bg-brand-soft font-semibold" : "border-brand-line bg-white"
                }`}
              >
                Felülírás a mostani tervre
              </button>
              <button
                type="button"
                onClick={() => setSaveMode("append")}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  saveMode === "append" ? "border-brand-teal bg-brand-soft font-semibold" : "border-brand-line bg-white"
                }`}
              >
                Hozzáfűzés a mostani tervhez
              </button>
            </div>

            {exercises.length === 0 ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                A gyakorlatok még betöltés alatt vannak. Várj egy kicsit, majd próbáld újra.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (canGoBack ? setStep((current) => current - 1) : navigate("/terv"))}
            className="rounded-xl border border-brand-line px-4 py-2 text-sm"
          >
            {canGoBack ? "Vissza" : "Mégse"}
          </button>

          <div className="flex gap-2">
            {canGoNext ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))}
                className="rounded-xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Tovább
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={recommended.length === 0 || exercises.length === 0}
                className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Terv generálása
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
