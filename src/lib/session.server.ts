import { randomBytes, createHash } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db, schema } from "@/db/client.server";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

export const SESSION_COOKIE = "hb_session";
const SESSION_TTL_DAYS = 30;

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });
  return token;
}

export async function getSessionUser(): Promise<{ id: string; name: string; email: string } | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const id = hashToken(token);
  const rows = await db
    .select({
      uid: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  return { id: row.uid, name: row.name, email: row.email };
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}

export function setSessionCookie(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const id = hashToken(token);
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function cleanExpiredSessions() {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

export async function hashPassword(pw: string): Promise<string> {
  return argonHash(pw);
}

export async function verifyPassword(hash: string, pw: string): Promise<boolean> {
  try { return await argonVerify(hash, pw); } catch { return false; }
}