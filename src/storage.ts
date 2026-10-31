import type { SavingsGoalItem, TransactionRecord, ExpenseItem } from "./types";

export function isValidGoal(item: unknown): item is SavingsGoalItem {
  if (!item || typeof item !== "object") return false;
  const g = item as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.title === "string" &&
    typeof g.targetPrice === "number" && !isNaN(g.targetPrice) &&
    typeof g.initialDeposit === "number" && !isNaN(g.initialDeposit) &&
    (g.mode === "bySavings" || g.mode === "byDeadline") &&
    typeof g.monthlyAllocation === "number" && !isNaN(g.monthlyAllocation) &&
    typeof g.targetMonths === "number" && !isNaN(g.targetMonths) &&
    typeof g.annualInflationRate === "number" && !isNaN(g.annualInflationRate)
  );
}

export function isValidTransaction(item: unknown): item is TransactionRecord {
  if (!item || typeof item !== "object") return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.goalId === "string" &&
    (t.type === "deposit" || t.type === "withdraw") &&
    typeof t.amount === "number" && !isNaN(t.amount) &&
    typeof t.isoTimestamp === "string"
  );
}

export function isValidExpense(item: unknown): item is ExpenseItem {
  if (!item || typeof item !== "object") return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.category === "string" &&
    typeof e.amount === "number" && !isNaN(e.amount)
  );
}

export function safeLoad<T>(key: string, fallback: T, validator?: (data: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      console.warn(`Data validation failed for key "${key}". Reverting to safe default.`);
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.error(`Corrupt localStorage key "${key}". Falling back safely.`, err);
    return fallback;
  }
}

export function safeSave<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to localStorage for key "${key}".`, err);
  }
}