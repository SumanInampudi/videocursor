import type { UserRole } from "@prisma/client";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string;
  businessName: string;
};
