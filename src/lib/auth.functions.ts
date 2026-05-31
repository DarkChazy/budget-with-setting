import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client.server";
import { createSession, destroySession, hashPassword, setSessionCookie, verifyPassword } from "./session.server";

const credSchema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(256),
});

const registerSchema = credSchema.extend({
  name: z.string().min(1).max(64),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credSchema.parse(d))
  .handler(async ({ data }) => {
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, data.email)).limit(1);
    const user = rows[0];
    if (!user) throw new Error("Invalid email or password");
    const ok = await verifyPassword(user.passwordHash, data.password);
    if (!ok) throw new Error("Invalid email or password");
    const token = await createSession(user.id);
    setSessionCookie(token);
    return { id: user.id, name: user.name, email: user.email };
  });

export const register = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    const existing = await db.select({ id: schema.users.id }).from(schema.users)
      .where(eq(schema.users.email, data.email)).limit(1);
    if (existing[0]) throw new Error("An account with this email already exists");
    const hash = await hashPassword(data.password);
    const [row] = await db.insert(schema.users)
      .values({ name: data.name, email: data.email, passwordHash: hash })
      .returning({ id: schema.users.id });
    const token = await createSession(row.id);
    setSessionCookie(token);
    return { id: row.id, name: data.name, email: data.email };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { ok: true };
});