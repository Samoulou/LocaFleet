import { cache } from "react";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: true,
        input: false,
        fieldName: "tenantId",
      },
      role: {
        type: "string",
        defaultValue: "agent",
        input: false,
        fieldName: "role",
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        input: false,
        fieldName: "isActive",
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

export type CurrentUser = {
  id: string;
  tenantId: string;
  role: "admin" | "agent" | "viewer";
  email: string;
  name: string;
  isActive: boolean;
};

// Request-scoped cache: deduplicates DB active-status checks within a single
// request (e.g. layout + multiple server actions) without persisting across
// requests. Zero stale-data risk.
const verifyUserActive = cache(async (userId: string): Promise<boolean> => {
  const [dbUser] = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return dbUser?.isActive ?? false;
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  const user = session.user;
  const extra = user as Record<string, unknown>;
  const tenantId = extra.tenantId;
  const role = extra.role;
  const isActive = extra.isActive;

  if (
    typeof tenantId !== "string" ||
    typeof role !== "string" ||
    typeof isActive !== "boolean"
  ) {
    console.error("Invalid user session data", { userId: user.id });
    return null;
  }

  // Verify user is still active in DB (session may be stale after deactivation)
  if (!(await verifyUserActive(user.id))) {
    return null;
  }

  return {
    id: user.id,
    tenantId,
    role: role as CurrentUser["role"],
    email: user.email,
    name: user.name,
    isActive,
  };
}
