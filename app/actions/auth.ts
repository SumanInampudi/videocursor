"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { roleHomePath, isAdminRole } from "@/lib/permissions";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-server";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password" };
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const dest =
    next && next.startsWith("/") && !next.startsWith("/login") ? next : roleHomePath(user.role);
  redirect(dest);
}

/** @deprecated use loginAction */
export async function login(formData: FormData) {
  return loginAction(null, formData);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}

export async function createUser(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "POS") as UserRole;

  if (!email || !name || password.length < 6) {
    return { error: "Name, email, and password (6+ chars) are required" };
  }

  if (!Object.values(UserRole).includes(role)) {
    return { error: "Invalid role" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email already in use" };
  }

  await db.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: hashPassword(password),
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getUsers() {
  return db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function requireAdminSession() {
  const { getAuthContext } = await import("@/lib/auth");
  const ctx = await getAuthContext();
  if (!ctx.user || !isAdminRole(ctx.user.role)) {
    throw new Error("Admin access required");
  }
  return ctx.user;
}
