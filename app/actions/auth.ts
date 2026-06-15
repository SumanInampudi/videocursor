"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DEFAULT_BUSINESS_ID } from "@/lib/business-context";
import { hashPassword, verifyPassword } from "@/lib/password";
import { roleHomePath, isAdminRole } from "@/lib/permissions";
import {
  clearPendingLogin,
  getPendingLoginUserId,
  setPendingLoginUserId,
} from "@/lib/pending-login-server";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-server";
import type { SessionUser } from "@/lib/session-types";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

type MembershipWithBusiness = {
  role: UserRole;
  business: { id: string; name: string };
};

async function buildSessionUser(
  user: { id: string; email: string; name: string },
  membership: MembershipWithBusiness
): Promise<SessionUser> {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: membership.role,
    businessId: membership.business.id,
    businessName: membership.business.name,
  };
}

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

  let memberships = await db.userBusiness.findMany({
    where: { userId: user.id },
    include: { business: { select: { id: true, name: true, isActive: true } } },
  });

  memberships = memberships.filter((m) => m.business.isActive);

  if (memberships.length === 0) {
    const fallback = await db.business.findUnique({
      where: { id: DEFAULT_BUSINESS_ID },
    });
    if (fallback) {
      await db.userBusiness.create({
        data: {
          userId: user.id,
          businessId: fallback.id,
          role: user.role,
        },
      });
      memberships = await db.userBusiness.findMany({
        where: { userId: user.id },
        include: { business: { select: { id: true, name: true, isActive: true } } },
      });
    }
  }

  if (memberships.length === 0) {
    return { error: "No business assigned to this account. Contact an admin." };
  }

  if (memberships.length > 1) {
    await setPendingLoginUserId(user.id);
    redirect(`/select-business?next=${encodeURIComponent(next || "/")}`);
  }

  const m = memberships[0]!;
  await setSessionCookie(
    await buildSessionUser(user, { role: m.role, business: m.business })
  );

  const dest =
    next && next.startsWith("/") && !next.startsWith("/login")
      ? next
      : roleHomePath(m.role);
  redirect(dest);
}

export async function selectBusinessAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const businessId = String(formData.get("businessId") ?? "");
  const next = String(formData.get("next") ?? "/").trim();

  const session = await import("@/lib/session-server").then((m) => m.getSessionUser());
  const pendingUserId = session?.userId ?? (await getPendingLoginUserId());
  if (!pendingUserId) {
    redirect("/login");
  }

  const user = await db.user.findUnique({ where: { id: pendingUserId } });
  if (!user) {
    redirect("/login");
  }

  const membership = await db.userBusiness.findFirst({
    where: { userId: pendingUserId, businessId },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return { error: "You do not have access to that business" };
  }

  await clearPendingLogin();
  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: membership.role,
    businessId: membership.business.id,
    businessName: membership.business.name,
  });

  redirect(next.startsWith("/") ? next : roleHomePath(membership.role));
}

export async function getUserBusinessChoices(userId: string) {
  return db.userBusiness.findMany({
    where: { userId },
    include: { business: { select: { id: true, name: true, slug: true } } },
    orderBy: { business: { name: "asc" } },
  });
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
  const businessId = String(formData.get("businessId") ?? DEFAULT_BUSINESS_ID);

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

  const user = await db.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: hashPassword(password),
    },
  });

  await db.userBusiness.create({
    data: {
      userId: user.id,
      businessId,
      role,
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
      memberships: {
        include: { business: { select: { name: true } } },
      },
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
