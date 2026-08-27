import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "crypto";
import { config } from "./config";

const COOKIE_NAME = "coordinator_session";

export function checkAdminPassword(password: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(config.adminPassword);
  // Pad to equal length so timingSafeEqual doesn't throw on length mismatch;
  // a length mismatch alone still means "wrong password".
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const token = jwt.sign({ role: "admin" }, config.sessionSecret, { expiresIn: "12h" });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const payload = jwt.verify(token, config.sessionSecret);
    return typeof payload === "object" && payload?.role === "admin";
  } catch {
    return false;
  }
}
