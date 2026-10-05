import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const MAX_MESSAGES = 50;
const MAX_LOG_ENTRIES = 100;
const MAX_PLAN_ITEMS = 200;
const MAX_PLANS = 30;
const MAX_PLAN_NAME = 60;
const MAX_STRING = 10_000;

const dbPath = path.resolve(process.env.DATABASE_PATH || "./data/fitness.db");
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  )
`);

const selectAll = db.prepare("SELECT key, json FROM user_data WHERE user_id = ?");
const upsert = db.prepare(`
  INSERT INTO user_data (user_id, key, json, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT (user_id, key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
`);

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value, max = MAX_STRING) => typeof value === "string" && value.length <= max;
const isSeconds = (value) => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 3600;

function isPlanItem(item) {
  return isObject(item) && isString(item.id, 100) && isString(item.exerciseId, 100) && isSeconds(item.workSeconds) && isSeconds(item.restSeconds);
}

function isMessage(item) {
  return isObject(item) && isString(item.id, 100) && (item.role === "user" || item.role === "assistant") && isString(item.content) && isString(item.createdAt, 100);
}

function isLogEntry(item) {
  return (
    isObject(item) &&
    isString(item.id, 100) &&
    isString(item.completedAt, 100) &&
    typeof item.durationSeconds === "number" &&
    typeof item.completed === "boolean" &&
    typeof item.exerciseCount === "number" &&
    (item.difficulty === undefined || typeof item.difficulty === "number") &&
    (item.note === undefined || isString(item.note))
  );
}

function isSavedPlan(plan) {
  return (
    isObject(plan) &&
    isString(plan.id, 100) &&
    isString(plan.name, MAX_PLAN_NAME) &&
    plan.name.trim().length > 0 &&
    Array.isArray(plan.items) &&
    plan.items.length <= MAX_PLAN_ITEMS &&
    plan.items.every(isPlanItem) &&
    isString(plan.createdAt, 100) &&
    isString(plan.updatedAt, 100) &&
    isString(plan.lastUsedAt, 100)
  );
}

const PROFILE_FIELDS = ["displayName", "goal", "level", "weeklyFrequency", "availableMinutes", "location", "limitations", "notes"];

// Kulcsonként: érvényesít, és a tárolandó (vágott) értéket adja vissza, vagy undefined-ot.
const validators = {
  plan: (value) =>
    isObject(value) && Array.isArray(value.items) && value.items.length <= MAX_PLAN_ITEMS && value.items.every(isPlanItem)
      ? { items: value.items }
      : undefined,
  plans: (value) => {
    if (!isObject(value) || !Array.isArray(value.plans)) return undefined;
    const { plans, activeId } = value;
    if (plans.length < 1 || plans.length > MAX_PLANS || !plans.every(isSavedPlan)) return undefined;
    if (new Set(plans.map((plan) => plan.id)).size !== plans.length || !plans.some((plan) => plan.id === activeId)) return undefined;
    return {
      activeId,
      plans: plans.map(({ id, name, items, createdAt, updatedAt, lastUsedAt }) => ({ id, name, items, createdAt, updatedAt, lastUsedAt })),
    };
  },
  aiProfile: (value) => (isObject(value) && PROFILE_FIELDS.every((field) => isString(value[field])) ? Object.fromEntries(PROFILE_FIELDS.map((field) => [field, value[field]])) : undefined),
  aiMessages: (value) => (Array.isArray(value) && value.every(isMessage) ? value.slice(-MAX_MESSAGES) : undefined),
  aiMemory: (value) => (isObject(value) && isString(value.summary) && isString(value.updatedAt, 100) ? { summary: value.summary, updatedAt: value.updatedAt } : undefined),
  workoutLog: (value) => (Array.isArray(value) && value.every(isLogEntry) ? value.slice(-MAX_LOG_ENTRIES) : undefined),
};

export function isDataKey(key) {
  return Object.hasOwn(validators, key);
}

export function loadUserData(userId) {
  return Object.fromEntries(selectAll.all(userId).filter((row) => isDataKey(row.key)).map((row) => [row.key, JSON.parse(row.json)]));
}

/** @returns {boolean} false, ha az érték érvénytelen. */
export function saveUserData(userId, key, value) {
  const sanitized = validators[key](value);
  if (sanitized === undefined) return false;
  upsert.run(userId, key, JSON.stringify(sanitized), new Date().toISOString());
  return true;
}
