import { pgTable, uuid, text, numeric, boolean, timestamp, date, integer, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accountType = pgEnum("account_type_enum", ["private", "house"]);
export const recurringType = pgEnum("recurring_type", ["one_time", "monthly", "yearly"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailUnique: uniqueIndex("users_email_unique").on(t.email),
}));

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // random token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountType: accountType("account_type").notNull(),
  currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountType: accountType("account_type").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  category: text("category"),
  recurringType: recurringType("recurring_type").notNull().default("one_time"),
  isPaid: boolean("is_paid").notNull().default(false),
  expenseMonth: date("expense_month").notNull(),
  generatedFromId: uuid("generated_from_id"),
  templateId: uuid("template_id"),
  chazyPercentage: numeric("chazy_percentage", { precision: 5, scale: 2 }).notNull().default("50"),
  hellyPercentage: numeric("helly_percentage", { precision: 5, scale: 2 }).notNull().default("50"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditCardExpenses = pgTable("credit_card_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  billingMonth: date("billing_month").notNull(),
  category: text("category"),
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monthlyTemplates = pgTable("monthly_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountType: accountType("account_type").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  category: text("category"),
  notes: text("notes"),
  defaultPaid: boolean("default_paid").notNull().default(false),
  chazyPercentage: numeric("chazy_percentage", { precision: 5, scale: 2 }).notNull().default("50"),
  hellyPercentage: numeric("helly_percentage", { precision: 5, scale: 2 }).notNull().default("50"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savingsAccounts = pgTable("savings_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  defaultPrivateMonthOffset: integer("default_private_month_offset").notNull().default(0),
  defaultHouseMonthOffset: integer("default_house_month_offset").notNull().default(0),
  chazyDefaultPercentage: numeric("chazy_default_percentage", { precision: 5, scale: 2 }).notNull().default("60"),
  hellyDefaultPercentage: numeric("helly_default_percentage", { precision: 5, scale: 2 }).notNull().default("40"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Re-export sql for migration helpers
export { sql };