"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/types";

type RoleGateProps = {
  allowedRoles: UserRole[];
  currentRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGate({
  allowedRoles,
  currentRole,
  children,
  fallback = null,
}: RoleGateProps) {
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
