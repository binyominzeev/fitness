import { apiFetch } from "./auth";

export type DataKey = "plan" | "aiProfile" | "aiMessages" | "aiMemory" | "workoutLog";

const SAVE_DELAY_MS = 500;
const timers = new Map<DataKey, number>();

export async function loadAllData(): Promise<Partial<Record<DataKey, unknown>>> {
  const response = await apiFetch("/api/data");
  if (!response.ok) throw new Error("Az adatok betöltése sikertelen.");
  const body = (await response.json()) as { data?: Partial<Record<DataKey, unknown>> };
  return body.data ?? {};
}

// Kulcsonként összevonja a gyors egymás utáni mentéseket; a hibát a következő mentés javítja.
export function saveData(key: DataKey, value: unknown): void {
  window.clearTimeout(timers.get(key));
  timers.set(
    key,
    window.setTimeout(() => {
      timers.delete(key);
      apiFetch(`/api/data/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      }).catch(() => undefined);
    }, SAVE_DELAY_MS),
  );
}

export function cancelPendingSaves(): void {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.clear();
}
