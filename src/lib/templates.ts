import { supabase } from "@/integrations/supabase/client";
import { currentMonth, parseMonth } from "./format";

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
  // Guard: never touch past months
  if (parseMonth(month) < parseMonth(currentMonth())) return;

  const { data: templates } = await supabase
    .from("monthly_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("account_type", accountType)
    .eq("active", true);

  if (!templates || templates.length === 0) return;

  const templateIds = templates.map((t) => t.id);
  const { data: existing } = await supabase
    .from("expenses")
    .select("template_id")
    .eq("user_id", userId)
    .eq("account_type", accountType)
    .eq("expense_month", month)
    .in("template_id", templateIds)
    .is("deleted_at", null);

  const have = new Set((existing ?? []).map((e: any) => e.template_id));
  const toInsert = templates
    .filter((t) => !have.has(t.id))
    .map((t) => ({
      user_id: userId,
      account_type: accountType,
      name: t.name,
      amount: t.amount,
      category: t.category,
      notes: t.notes,
      recurring_type: "monthly" as const,
      is_paid: t.default_paid,
      chazy_percentage: t.chazy_percentage,
      helly_percentage: t.helly_percentage,
      expense_month: month,
      template_id: t.id,
    }));

  if (toInsert.length > 0) {
    await supabase.from("expenses").insert(toInsert);
  }
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