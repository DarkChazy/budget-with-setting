import { supabase } from "@/integrations/supabase/client";
import { addMonths, currentMonth, parseMonth } from "./format";

/**
 * Generate missing recurring expense rows for a user up to the current month.
 * - Monthly: every month after origin
 * - Yearly: every 12 months after origin
 * Uses generated_from_id to track lineage and prevent duplicates.
 */
export async function generateRecurringExpenses(userId: string) {
  const today = currentMonth();

  // Pull all non-deleted recurring expenses for user
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .in("recurring_type", ["monthly", "yearly"])
    .is("deleted_at", null);

  if (error || !expenses) return;

  // Group by origin: origin = generated_from_id ?? id
  type Row = (typeof expenses)[number];
  const chains = new Map<string, Row[]>();
  for (const e of expenses) {
    const origin = e.generated_from_id ?? e.id;
    const arr = chains.get(origin) ?? [];
    arr.push(e);
    chains.set(origin, arr);
  }

  const toInsert: any[] = [];

  for (const [originId, rows] of chains) {
    // Find latest month in chain
    rows.sort((a, b) => a.expense_month.localeCompare(b.expense_month));
    const origin = rows.find((r) => r.id === originId) ?? rows[0];
    const latest = rows[rows.length - 1];
    const step = origin.recurring_type === "monthly" ? 1 : 12;
    let next = addMonths(latest.expense_month, step);
    // Generate up to current month inclusive
    while (parseMonth(next) <= parseMonth(today)) {
      toInsert.push({
        user_id: origin.user_id,
        account_type: origin.account_type,
        name: origin.name,
        amount: origin.amount,
        notes: origin.notes,
        category: origin.category,
        recurring_type: origin.recurring_type,
        is_paid: false,
        expense_month: next,
        generated_from_id: originId,
      });
      next = addMonths(next, step);
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("expenses").insert(toInsert);
  }
}
