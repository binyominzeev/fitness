import { useEffect, useMemo, useState } from "react";
import { useWorkoutPlan } from "../context/WorkoutContext";
import { buildWorkoutSteps } from "../lib/workout";
import type { Exercise, WorkoutPlaybackState } from "../types";

const PHASE_RING_RADIUS = 82;
const PHASE_RING_CIRCUMFERENCE = 2 * Math.PI * PHASE_RING_RADIUS;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function findStepIndexByElapsedMs(cumulativeEndsMs: number[], elapsedMs: number): number {
  for (let index = 0; index < cumulativeEndsMs.length; index += 1) {
    if (elapsedMs < cumulativeEndsMs[index]) {
      return index;
    }
  }

  return Math.max(cumulativeEndsMs.length - 1, 0);
}

function formatSeconds(totalSeconds: number): string {
  return String(Math.max(0, totalSeconds));
}

function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type PlaybackPageProps = {
  exercisesById: Record<string, Exercise>;
};

export function PlaybackPage({ exercisesById }: PlaybackPageProps) {
  const { items } = useWorkoutPlan();

  const steps = useMemo(() => buildWorkoutSteps(items), [items]);
  const stepDurationsMs = useMemo(() => steps.map((step) => step.durationSeconds * 1000), [steps]);
  const cumulativeStepEndsMs = useMemo(() => {
    return stepDurationsMs.reduce<number[]>((acc, durationMs) => {
      const previousTotal = acc[acc.length - 1] ?? 0;
      return [...acc, previousTotal + durationMs];
    }, []);
  }, [stepDurationsMs]);
  const totalDurationMs = cumulativeStepEndsMs[cumulativeStepEndsMs.length - 1] ?? 0;
  const firstDurationMs = steps[0]?.durationSeconds ? steps[0].durationSeconds * 1000 : 0;

  const [stepIndex, setStepIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(firstDurationMs);
  const [phaseEndAt, setPhaseEndAt] = useState<number | null>(null);
  const [playbackState, setPlaybackState] = useState<WorkoutPlaybackState>("idle");

  const activeStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[activeStepIndex];
  const currentExercise = currentStep ? exercisesById[currentStep.exerciseId] : undefined;
  const nextWorkStep = useMemo(() => {
    for (let index = activeStepIndex + 1; index < steps.length; index += 1) {
      if (steps[index].phase === "work") {
        return steps[index];
      }
    }

    return undefined;
  }, [activeStepIndex, steps]);
  const upcomingExercise = nextWorkStep ? exercisesById[nextWorkStep.exerciseId] : undefined;
  const isRestPhase = currentStep?.phase === "rest";
  const currentStepDurationMs = currentStep ? currentStep.durationSeconds * 1000 : 0;
  const currentStepStartMs = activeStepIndex === 0 ? 0 : (cumulativeStepEndsMs[activeStepIndex - 1] ?? 0);
  const clampedRemainingMs = clamp(remainingMs, 0, currentStepDurationMs);
  const elapsedInStepMs = clamp(currentStepDurationMs - clampedRemainingMs, 0, currentStepDurationMs);
  const elapsedTotalMs = clamp(currentStepStartMs + elapsedInStepMs, 0, totalDurationMs);

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
    }, 50);

    return () => window.clearInterval(timer);
  }, [activeStepIndex, phaseEndAt, playbackState, steps]);

  function seekToElapsedMs(rawElapsedMs: number) {
    if (steps.length === 0) {
      return;
    }

    const boundedElapsedMs = clamp(rawElapsedMs, 0, totalDurationMs);

    if (boundedElapsedMs >= totalDurationMs) {
      const lastIndex = steps.length - 1;
      setStepIndex(lastIndex);
      setRemainingMs(0);
      setPhaseEndAt(null);
      setPlaybackState("finished");
      return;
    }

    const nextStepIndex = findStepIndexByElapsedMs(cumulativeStepEndsMs, boundedElapsedMs);
    const nextStepStartMs = nextStepIndex === 0 ? 0 : cumulativeStepEndsMs[nextStepIndex - 1];
    const nextStepDurationMs = steps[nextStepIndex].durationSeconds * 1000;
    const elapsedInNextStepMs = boundedElapsedMs - nextStepStartMs;
    const nextRemainingMs = clamp(nextStepDurationMs - elapsedInNextStepMs, 0, nextStepDurationMs);

    setStepIndex(nextStepIndex);
    setRemainingMs(nextRemainingMs);

    if (playbackState === "running") {
      setPhaseEndAt(Date.now() + nextRemainingMs);
      return;
    }

    setPhaseEndAt(null);
    if (playbackState === "finished") {
      setPlaybackState("paused");
    }
  }

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
  const totalDurationSeconds = Math.ceil(totalDurationMs / 1000);
  const elapsedTotalSeconds = Math.min(totalDurationSeconds, Math.floor(elapsedTotalMs / 1000));
  const sliderValueSeconds = Math.min(totalDurationSeconds, Math.round(elapsedTotalMs / 1000));

  const phaseProgress = currentStepDurationMs > 0 ? clamp(elapsedInStepMs / currentStepDurationMs, 0, 1) : 0;
  const phaseRingOffset = PHASE_RING_CIRCUMFERENCE * phaseProgress;
  const phaseRingColor = currentStep?.phase === "work" ? "#16a34a" : "#2563eb";

  const phaseLabel = currentStep?.phase === "work" ? "Munka" : "Pihenő";

  if (steps.length === 0) {
    return (
      <section className="space-y-3">
        <p className="rounded-2xl bg-brand-soft p-4 text-sm">
          Nincs mit lejátszani. Először állíts össze egy edzéstervet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-brand-line bg-white p-5 text-center shadow-[0_20px_40px_rgba(16,24,40,0.08)]">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-brand-muted">{phaseLabel}</p>
        {!isRestPhase && (
          <>
            <h2 className="mb-2 font-display text-2xl font-semibold">{currentExercise?.exerciseNameHu}</h2>
            <img
              src={currentExercise?.imageUrl}
              alt={currentExercise?.exerciseNameHu}
              className="mx-auto mb-3 h-44 w-44 rounded-2xl bg-brand-soft p-4 object-contain"
            />
            <p className="mx-auto mb-4 max-w-xl text-sm leading-relaxed text-brand-muted">{currentExercise?.description}</p>
          </>
        )}

        {isRestPhase && (
          <div className="mx-auto mb-4 max-w-xl rounded-2xl border border-dashed border-brand-line bg-brand-soft/55 px-4 py-3">
            <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Upcoming</p>
            <h2 className="mb-2 font-mono text-2xl font-semibold leading-tight text-brand-ink">{upcomingExercise?.exerciseNameHu}</h2>
            <img
              src={upcomingExercise?.imageUrl}
              alt={upcomingExercise?.exerciseNameHu}
              className="mx-auto mb-2 h-28 w-28 rounded-xl bg-white p-2 object-contain"
            />
            <p className="text-sm leading-relaxed text-brand-muted">{upcomingExercise?.description}</p>
          </div>
        )}

        <div className="mx-auto mb-4 grid h-[210px] w-[210px] place-items-center">
          <svg className="col-start-1 row-start-1 h-[210px] w-[210px] -rotate-90" viewBox="0 0 210 210" role="img" aria-label="Aktuális szakasz időzítő">
            <circle cx="105" cy="105" r={PHASE_RING_RADIUS} fill="none" stroke="rgba(19, 66, 78, 0.12)" strokeWidth="10" />
            <circle
              cx="105"
              cy="105"
              r={PHASE_RING_RADIUS}
              fill="none"
              stroke={phaseRingColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={PHASE_RING_CIRCUMFERENCE}
              strokeDashoffset={phaseRingOffset}
              style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.2s ease" }}
            />
          </svg>
          <p className="col-start-1 row-start-1 font-display text-5xl font-semibold tabular-nums">{formatSeconds(remainingSeconds)}</p>
        </div>

        <div className="mt-2 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
            <span>Teljes idő</span>
            <span>
              {formatClock(elapsedTotalSeconds)} / {formatClock(totalDurationSeconds)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={totalDurationSeconds}
            step={1}
            value={sliderValueSeconds}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (Number.isNaN(nextValue)) {
                return;
              }

              seekToElapsedMs(nextValue * 1000);
            }}
            aria-label="Teljes edzés idővonala"
            className="h-2 w-full cursor-pointer accent-[var(--brand-teal)]"
          />
        </div>

        <p className="mt-2 text-sm text-brand-muted">
          Lépés {activeStepIndex + 1} / {steps.length}
        </p>
      </article>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={startOrResume} className="rounded-xl bg-brand-teal px-3 py-3 font-semibold text-white">
          {playbackState === "running" ? "Fut" : playbackState === "paused" ? "Folytatás" : "Indítás"}
        </button>
        <button type="button" onClick={pause} className="rounded-xl border border-brand-line bg-white px-3 py-3 font-semibold">
          Szünet
        </button>
        <button type="button" onClick={reset} className="rounded-xl border border-brand-line bg-white px-3 py-3 font-semibold">
          Újra
        </button>
      </div>
    </section>
  );
}
