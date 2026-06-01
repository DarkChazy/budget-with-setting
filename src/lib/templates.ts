import { currentMonth, parseMonth } from "./format";
import { ensureTemplateExpenses } from "./api.functions";

export type MonthlyTemplate = {
  id: string;
  user_id: string;
  account_type: "private" | "house";
  name: string;
  amount: number | string;
  category: string | null;
  notes: string | null;
  default_paid: boolean;
  chazy_percentage: number | string;
  helly_percentage: number | string;
  active: boolean;
};

/**
 * Ensure an expense row exists for each active template for the given month.
 * Only operates on the current month or future months — never modifies history.
 */
export async function ensureTemplateExpensesForMonth(
  userId: string,
  accountType: "private" | "house",
  month: string,
) {
  void userId;
  if (parseMonth(month) < parseMonth(currentMonth())) return;
  await ensureTemplateExpenses({ data: { accountType, month } });
}

/** Ensure both Personal and House templates have been materialized for the current month. */
export async function ensureTemplatesForCurrentMonth(userId: string) {
  const m = currentMonth();
  await Promise.all([
    ensureTemplateExpensesForMonth(userId, "private", m),
    ensureTemplateExpensesForMonth(userId, "house", m),
  ]);
}

export function notifyTemplatesChanged() {
  window.dispatchEvent(new Event("hb:templates-change"));
}

export function notifySavingsChanged() {
  window.dispatchEvent(new Event("hb:savings-change"));
}