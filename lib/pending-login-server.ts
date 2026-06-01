import "server-only";

import { cookies } from "next/headers";

const PENDING_COOKIE = "servora_pending_login";
const MAX_AGE = 300;

export async function setPendingLoginUserId(userId: string) {
  const jar = await cookies();
  jar.set(PENDING_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getPendingLoginUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(PENDING_COOKIE)?.value ?? null;
}

export async function clearPendingLogin() {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
}
