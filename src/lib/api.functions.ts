import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lte, inArray, isNull, asc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db/client.server";
import { requireUser, getSessionUser } from "./session.server";

// ============ AUTH (whoami) ============
export const whoami = createServerFn({ method: "GET" }).handler(async () => {
  return await getSessionUser();
});

// ============ ACCOUNTS ============
const accountKind = z.enum(["private", "house"]);

export const getAccount = createServerFn({ method: "GET" })
  .inputValidator((d: { accountType: "private" | "house" }) => ({ accountType: accountKind.parse(d.accountType) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const rows = await db.select().from(schema.accounts)
      .where(and(eq(schema.accounts.userId, u.id), eq(schema.accounts.accountType, data.accountType))).limit(1);
    if (rows[0]) return { current_amount: rows[0].currentAmount };
    await db.insert(schema.accounts).values({ userId: u.id, accountType: data.accountType, currentAmount: "0" });
    return { current_amount: "0" };
  });

export const setAccountAmount = createServerFn({ method: "POST" })
  .inputValidator((d: { accountType: "private" | "house"; amount: number }) => ({
    accountType: accountKind.parse(d.accountType), amount: z.number().parse(d.amount),
  }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const existing = await db.select({ id: schema.accounts.id }).from(schema.accounts)
      .where(and(eq(schema.accounts.userId, u.id), eq(schema.accounts.accountType, data.accountType))).limit(1);
    if (existing[0]) {
      await db.update(schema.accounts).set({ currentAmount: String(data.amount), updatedAt: new Date() })
        .where(eq(schema.accounts.id, existing[0].id));
    } else {
      await db.insert(schema.accounts).values({ userId: u.id, accountType: data.accountType, currentAmount: String(data.amount) });
    }
    return { ok: true };
  });

// ============ EXPENSES ============
function expRow(e: typeof schema.expenses.$inferSelect) {
  return {
    id: e.id, user_id: e.userId, account_type: e.accountType,
    name: e.name, amount: e.amount, notes: e.notes, category: e.category,
    recurring_type: e.recurringType, is_paid: e.isPaid,
    expense_month: typeof e.expenseMonth === "string" ? e.expenseMonth : (e.expenseMonth as any),
    generated_from_id: e.generatedFromId, template_id: e.templateId,
    chazy_percentage: e.chazyPercentage, helly_percentage: e.hellyPercentage,
    deleted_at: e.deletedAt, created_at: e.createdAt, updated_at: e.updatedAt,
  };
}

export const listExpenses = createServerFn({ method: "GET" })
  .inputValidator((d: { accountType: "private" | "house"; year: number }) => ({
    accountType: accountKind.parse(d.accountType), year: z.number().int().parse(d.year),
  }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const start = `${data.year}-01-01`, end = `${data.year}-12-01`;
    const rows = await db.select().from(schema.expenses).where(and(
      eq(schema.expenses.userId, u.id),
      eq(schema.expenses.accountType, data.accountType),
      isNull(schema.expenses.deletedAt),
      gte(schema.expenses.expenseMonth, start),
      lte(schema.expenses.expenseMonth, end),
    ));
    return rows.map(expRow);
  });

const expensePayload = z.object({
  id: z.string().uuid().optional(),
  accountType: accountKind,
  name: z.string().min(1).max(255),
  amount: z.number(),
  expense_month: z.string(),
  notes: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  recurring_type: z.enum(["one_time", "monthly", "yearly"]),
  chazy_percentage: z.number().optional(),
  helly_percentage: z.number().optional(),
});

export const upsertExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => expensePayload.parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const values = {
      userId: u.id,
      accountType: data.accountType,
      name: data.name,
      amount: String(data.amount),
      expenseMonth: data.expense_month,
      notes: data.notes ?? null,
      category: data.category ?? null,
      recurringType: data.recurring_type,
      chazyPercentage: String(data.chazy_percentage ?? 50),
      hellyPercentage: String(data.helly_percentage ?? 50),
      updatedAt: new Date(),
    };
    if (data.id) {
      await db.update(schema.expenses).set(values)
        .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.userId, u.id)));
      return { id: data.id };
    } else {
      const [row] = await db.insert(schema.expenses).values(values).returning({ id: schema.expenses.id });
      return { id: row.id };
    }
  });

export const setExpensePaid = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; paid: boolean }) => ({ id: z.string().uuid().parse(d.id), paid: z.boolean().parse(d.paid) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.expenses).set({ isPaid: data.paid, updatedAt: new Date() })
      .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.userId, u.id)));
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.expenses).set({ deletedAt: new Date() })
      .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.userId, u.id)));
    return { ok: true };
  });

// ============ CREDIT CARD ============
function ccRow(e: typeof schema.creditCardExpenses.$inferSelect) {
  return {
    id: e.id, user_id: e.userId, name: e.name, amount: e.amount,
    billing_month: typeof e.billingMonth === "string" ? e.billingMonth : (e.billingMonth as any),
    category: e.category, notes: e.notes, is_paid: e.isPaid,
    deleted_at: e.deletedAt, created_at: e.createdAt, updated_at: e.updatedAt,
  };
}

export const listCC = createServerFn({ method: "GET" })
  .inputValidator((d: { year: number }) => ({ year: z.number().int().parse(d.year) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const start = `${data.year}-01-01`, end = `${data.year}-12-01`;
    const rows = await db.select().from(schema.creditCardExpenses).where(and(
      eq(schema.creditCardExpenses.userId, u.id),
      isNull(schema.creditCardExpenses.deletedAt),
      gte(schema.creditCardExpenses.billingMonth, start),
      lte(schema.creditCardExpenses.billingMonth, end),
    ));
    return rows.map(ccRow);
  });

const ccPayload = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  amount: z.number(),
  billing_month: z.string(),
  notes: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export const upsertCC = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ccPayload.parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const values = {
      userId: u.id, name: data.name, amount: String(data.amount),
      billingMonth: data.billing_month, notes: data.notes ?? null, category: data.category ?? null,
      updatedAt: new Date(),
    };
    if (data.id) {
      await db.update(schema.creditCardExpenses).set(values)
        .where(and(eq(schema.creditCardExpenses.id, data.id), eq(schema.creditCardExpenses.userId, u.id)));
      return { id: data.id };
    }
    const [row] = await db.insert(schema.creditCardExpenses).values(values).returning({ id: schema.creditCardExpenses.id });
    return { id: row.id };
  });

export const setCCPaid = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; paid: boolean }) => ({ id: z.string().uuid().parse(d.id), paid: z.boolean().parse(d.paid) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.creditCardExpenses).set({ isPaid: data.paid, updatedAt: new Date() })
      .where(and(eq(schema.creditCardExpenses.id, data.id), eq(schema.creditCardExpenses.userId, u.id)));
    return { ok: true };
  });

export const deleteCC = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.creditCardExpenses).set({ deletedAt: new Date() })
      .where(and(eq(schema.creditCardExpenses.id, data.id), eq(schema.creditCardExpenses.userId, u.id)));
    return { ok: true };
  });

// ============ CATEGORIES ============
const DEFAULT_CATEGORIES = ["Mortgage","Utilities","Groceries","Insurance","Internet","Furniture","Repairs","Fun","Subscriptions"];

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  const existing = await db.select({ id: schema.categories.id, name: schema.categories.name })
    .from(schema.categories).where(eq(schema.categories.userId, u.id)).orderBy(asc(schema.categories.name));
  if (existing.length === 0) {
    await db.insert(schema.categories).values(DEFAULT_CATEGORIES.map((name) => ({ userId: u.id, name })));
    return await db.select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories).where(eq(schema.categories.userId, u.id)).orderBy(asc(schema.categories.name));
  }
  return existing;
});

export const addCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => ({ name: z.string().min(1).max(64).parse(d.name) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.insert(schema.categories).values({ userId: u.id, name: data.name });
    return { ok: true };
  });

export const renameCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name: string }) => ({ id: z.string().uuid().parse(d.id), name: z.string().min(1).max(64).parse(d.name) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.categories).set({ name: data.name, updatedAt: new Date() })
      .where(and(eq(schema.categories.id, data.id), eq(schema.categories.userId, u.id)));
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.delete(schema.categories).where(and(eq(schema.categories.id, data.id), eq(schema.categories.userId, u.id)));
    return { ok: true };
  });

// ============ MONTHLY TEMPLATES ============
function tmplRow(t: typeof schema.monthlyTemplates.$inferSelect) {
  return {
    id: t.id, user_id: t.userId, account_type: t.accountType,
    name: t.name, amount: t.amount, category: t.category, notes: t.notes,
    default_paid: t.defaultPaid,
    chazy_percentage: t.chazyPercentage, helly_percentage: t.hellyPercentage,
    active: t.active, created_at: t.createdAt, updated_at: t.updatedAt,
  };
}

export const listTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  const rows = await db.select().from(schema.monthlyTemplates)
    .where(eq(schema.monthlyTemplates.userId, u.id)).orderBy(asc(schema.monthlyTemplates.createdAt));
  return rows.map(tmplRow);
});

const templatePayload = z.object({
  id: z.string().uuid().optional(),
  account_type: accountKind,
  name: z.string().min(1).max(255),
  amount: z.number(),
  category: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  default_paid: z.boolean(),
  chazy_percentage: z.number(),
  helly_percentage: z.number(),
});

export const upsertTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => templatePayload.parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const values = {
      userId: u.id, accountType: data.account_type,
      name: data.name, amount: String(data.amount),
      category: data.category ?? null, notes: data.notes ?? null,
      defaultPaid: data.default_paid,
      chazyPercentage: String(data.chazy_percentage),
      hellyPercentage: String(data.helly_percentage),
      active: true, updatedAt: new Date(),
    };
    if (data.id) {
      await db.update(schema.monthlyTemplates).set(values)
        .where(and(eq(schema.monthlyTemplates.id, data.id), eq(schema.monthlyTemplates.userId, u.id)));
      return { id: data.id };
    }
    const [row] = await db.insert(schema.monthlyTemplates).values(values).returning({ id: schema.monthlyTemplates.id });
    return { id: row.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.delete(schema.monthlyTemplates)
      .where(and(eq(schema.monthlyTemplates.id, data.id), eq(schema.monthlyTemplates.userId, u.id)));
    return { ok: true };
  });

// Materialize template expenses for a given month
export const ensureTemplateExpenses = createServerFn({ method: "POST" })
  .inputValidator((d: { accountType: "private" | "house"; month: string }) => ({
    accountType: accountKind.parse(d.accountType),
    month: z.string().parse(d.month),
  }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    // Guard: only current or future months
    const monthDate = new Date(data.month + "T00:00:00");
    const now = new Date();
    const curMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (monthDate < curMonth) return { inserted: 0 };

    const templates = await db.select().from(schema.monthlyTemplates).where(and(
      eq(schema.monthlyTemplates.userId, u.id),
      eq(schema.monthlyTemplates.accountType, data.accountType),
      eq(schema.monthlyTemplates.active, true),
    ));
    if (templates.length === 0) return { inserted: 0 };
    const tids = templates.map((t) => t.id);
    const existing = await db.select({ template_id: schema.expenses.templateId })
      .from(schema.expenses).where(and(
        eq(schema.expenses.userId, u.id),
        eq(schema.expenses.accountType, data.accountType),
        eq(schema.expenses.expenseMonth, data.month),
        inArray(schema.expenses.templateId, tids),
        isNull(schema.expenses.deletedAt),
      ));
    const have = new Set(existing.map((e) => e.template_id));
    const toInsert = templates.filter((t) => !have.has(t.id)).map((t) => ({
      userId: u.id, accountType: data.accountType,
      name: t.name, amount: t.amount, category: t.category, notes: t.notes,
      recurringType: "monthly" as const, isPaid: t.defaultPaid,
      chazyPercentage: t.chazyPercentage, hellyPercentage: t.hellyPercentage,
      expenseMonth: data.month, templateId: t.id,
    }));
    if (toInsert.length > 0) await db.insert(schema.expenses).values(toInsert);
    return { inserted: toInsert.length };
  });

// Generate recurring (non-template) expenses up to current month
export const generateRecurring = createServerFn({ method: "POST" }).handler(async () => {
  const u = await requireUser();
  const rows = await db.select().from(schema.expenses).where(and(
    eq(schema.expenses.userId, u.id),
    inArray(schema.expenses.recurringType, ["monthly", "yearly"]),
    isNull(schema.expenses.deletedAt),
  ));
  const chains = new Map<string, typeof rows>();
  for (const e of rows) {
    const origin = e.generatedFromId ?? e.id;
    const arr = chains.get(origin) ?? [];
    arr.push(e);
    chains.set(origin, arr);
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const toInsert: (typeof schema.expenses.$inferInsert)[] = [];
  const addMonths = (m: string, n: number) => {
    const d = new Date(m + "T00:00:00"); d.setMonth(d.getMonth() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };
  for (const [originId, arr] of chains) {
    arr.sort((a, b) => String(a.expenseMonth).localeCompare(String(b.expenseMonth)));
    const origin = arr.find((r) => r.id === originId) ?? arr[0];
    const latest = arr[arr.length - 1];
    const step = origin.recurringType === "monthly" ? 1 : 12;
    let next = addMonths(String(latest.expenseMonth), step);
    while (next <= today) {
      toInsert.push({
        userId: origin.userId, accountType: origin.accountType,
        name: origin.name, amount: origin.amount, notes: origin.notes,
        category: origin.category, recurringType: origin.recurringType,
        isPaid: false, expenseMonth: next, generatedFromId: originId,
      });
      next = addMonths(next, step);
    }
  }
  if (toInsert.length > 0) await db.insert(schema.expenses).values(toInsert);
  return { inserted: toInsert.length };
});

// ============ SAVINGS ============
export const listSavings = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  return db.select().from(schema.savingsAccounts)
    .where(eq(schema.savingsAccounts.userId, u.id)).orderBy(asc(schema.savingsAccounts.createdAt));
});

export const addSavings = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; amount: number }) => ({
    name: z.string().min(1).max(255).parse(d.name), amount: z.number().parse(d.amount),
  }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.insert(schema.savingsAccounts).values({ userId: u.id, name: data.name, amount: String(data.amount) });
    return { ok: true };
  });

export const updateSavingsAmount = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; amount: number }) => ({ id: z.string().uuid().parse(d.id), amount: z.number().parse(d.amount) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.savingsAccounts).set({ amount: String(data.amount), updatedAt: new Date() })
      .where(and(eq(schema.savingsAccounts.id, data.id), eq(schema.savingsAccounts.userId, u.id)));
    return { ok: true };
  });

export const renameSavings = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name: string }) => ({ id: z.string().uuid().parse(d.id), name: z.string().min(1).max(255).parse(d.name) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.update(schema.savingsAccounts).set({ name: data.name, updatedAt: new Date() })
      .where(and(eq(schema.savingsAccounts.id, data.id), eq(schema.savingsAccounts.userId, u.id)));
    return { ok: true };
  });

export const deleteSavings = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    await db.delete(schema.savingsAccounts)
      .where(and(eq(schema.savingsAccounts.id, data.id), eq(schema.savingsAccounts.userId, u.id)));
    return { ok: true };
  });

// ============ USER SETTINGS ============
const DEFAULT_SETTINGS = {
  defaultPrivateMonthOffset: 0, defaultHouseMonthOffset: 0,
  chazyDefaultPercentage: "60", hellyDefaultPercentage: "40",
};

function settingsRow(s: typeof schema.userSettings.$inferSelect) {
  return {
    user_id: s.userId,
    default_private_month_offset: s.defaultPrivateMonthOffset,
    default_house_month_offset: s.defaultHouseMonthOffset,
    chazy_default_percentage: s.chazyDefaultPercentage,
    helly_default_percentage: s.hellyDefaultPercentage,
  };
}

export const getUserSettings = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  const rows = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, u.id)).limit(1);
  if (rows[0]) return settingsRow(rows[0]);
  await db.insert(schema.userSettings).values({ userId: u.id, ...DEFAULT_SETTINGS });
  const fresh = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, u.id)).limit(1);
  return settingsRow(fresh[0]);
});

export const setHouseDefaults = createServerFn({ method: "POST" })
  .inputValidator((d: { chazy: number; helly: number }) => ({ chazy: z.number().parse(d.chazy), helly: z.number().parse(d.helly) }))
  .handler(async ({ data }) => {
    const u = await requireUser();
    // Ensure row exists
    const rows = await db.select({ id: schema.userSettings.userId }).from(schema.userSettings)
      .where(eq(schema.userSettings.userId, u.id)).limit(1);
    if (!rows[0]) {
      await db.insert(schema.userSettings).values({ userId: u.id, ...DEFAULT_SETTINGS });
    }
    await db.update(schema.userSettings).set({
      chazyDefaultPercentage: String(data.chazy),
      hellyDefaultPercentage: String(data.helly),
      updatedAt: new Date(),
    }).where(eq(schema.userSettings.userId, u.id));
    return { ok: true };
  });