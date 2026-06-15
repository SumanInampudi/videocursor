import "server-only";

import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/session-types";
import { createSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/session-token";

const SESSION_DAYS = 14;

export { SESSION_COOKIE };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function setSessionCookie(user: SessionUser) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
