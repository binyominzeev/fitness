import { useEffect, useMemo, useState } from "react";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { buildWorkoutSteps } from "../lib/workout";
import type { Exercise, WorkoutPlaybackState } from "../types";

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type PlaybackPageProps = {
  exercisesById: Record<string, Exercise>;
};

export function PlaybackPage({ exercisesById }: PlaybackPageProps) {
  const { items } = useWorkoutPlan();

  const steps = useMemo(() => buildWorkoutSteps(items), [items]);
  const firstDurationMs = steps[0]?.durationSeconds ? steps[0].durationSeconds * 1000 : 0;

  const [stepIndex, setStepIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(firstDurationMs);
  const [phaseEndAt, setPhaseEndAt] = useState<number | null>(null);
  const [playbackState, setPlaybackState] = useState<WorkoutPlaybackState>("idle");

  const activeStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[activeStepIndex];
  const currentExercise = currentStep ? exercisesById[currentStep.exerciseId] : undefined;

  useEffect(() => {
    if (playbackState !== "running" || phaseEndAt === null) {
      return;
    }

    const timer = window.setInterval(() => {
      const left = phaseEndAt - Date.now();

      if (left > 0) {
        setRemainingMs(left);
        return;
      }

      const nextIndex = activeStepIndex + 1;
      if (nextIndex >= steps.length) {
        setRemainingMs(0);
        setPhaseEndAt(null);
        setPlaybackState("finished");
        return;
      }

      const nextDurationMs = steps[nextIndex].durationSeconds * 1000;
      setStepIndex(nextIndex);
      setRemainingMs(nextDurationMs);
      setPhaseEndAt(Date.now() + nextDurationMs);
    }, 200);

    return () => window.clearInterval(timer);
  }, [activeStepIndex, phaseEndAt, playbackState, steps]);

  function startOrResume() {
    if (steps.length === 0) {
      return;
    }

    if (playbackState === "finished") {
      const firstDuration = steps[0].durationSeconds * 1000;
      setStepIndex(0);
      setRemainingMs(firstDuration);
      setPhaseEndAt(Date.now() + firstDuration);
      setPlaybackState("running");
      return;
    }

    if (activeStepIndex !== stepIndex) {
      setStepIndex(activeStepIndex);
    }

    const effectiveRemaining = remainingMs || steps[activeStepIndex].durationSeconds * 1000;
    setRemainingMs(effectiveRemaining);
    setPhaseEndAt(Date.now() + effectiveRemaining);
    setPlaybackState("running");
  }

  function pause() {
    if (playbackState !== "running" || phaseEndAt === null) {
      return;
    }

    setRemainingMs(Math.max(0, phaseEndAt - Date.now()));
    setPhaseEndAt(null);
    setPlaybackState("paused");
  }

  function reset() {
    if (steps.length === 0) {
      setPlaybackState("idle");
      setStepIndex(0);
      setRemainingMs(0);
      setPhaseEndAt(null);
      return;
    }

    setStepIndex(0);
    setRemainingMs(steps[0].durationSeconds * 1000);
    setPhaseEndAt(null);
    setPlaybackState("idle");
  }

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const phaseLabel = currentStep?.phase === "work" ? "Munka" : "Piheno";

  if (steps.length === 0) {
    return (
      <section className="space-y-3">
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">
          Nincs mit lejatszani. Eloszor allits ossze egy edzestervet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-brand-line bg-white p-5 text-center shadow-[0_20px_40px_rgba(16,24,40,0.08)]">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-brand-muted">{phaseLabel}</p>
        <h2 className="mb-4 font-display text-2xl font-semibold">{currentExercise?.exerciseNameHu}</h2>

        <img
          src={currentExercise?.imageUrl}
          alt={currentExercise?.exerciseNameHu}
          className="mx-auto mb-4 h-44 w-44 rounded-2xl bg-brand-soft p-4 object-contain"
        />

        <p className="font-display text-6xl font-semibold tabular-nums">{formatSeconds(remainingSeconds)}</p>
        <p className="mt-2 text-sm text-brand-muted">
          Lepes {stepIndex + 1} / {steps.length}
        </p>
      </article>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={startOrResume} className="rounded-xl bg-brand-teal px-3 py-3 font-semibold text-white">
          {playbackState === "running" ? "Fut" : playbackState === "paused" ? "Folytatas" : "Inditas"}
        </button>
        <button type="button" onClick={pause} className="rounded-xl border border-brand-line bg-white px-3 py-3 font-semibold">
          Szunet
        </button>
        <button type="button" onClick={reset} className="rounded-xl border border-brand-line bg-white px-3 py-3 font-semibold">
          Ujra
        </button>
      </div>
    </section>
  );
}
