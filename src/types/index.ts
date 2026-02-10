// LocaFleet shared TypeScript types

export type UserRole = "admin" | "agent" | "viewer";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

// Add more shared types as the project grows
