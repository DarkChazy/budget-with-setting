import { generateRecurring } from "./api.functions";

export async function generateRecurringExpenses(_userId: string) {
  await generateRecurring();
}
