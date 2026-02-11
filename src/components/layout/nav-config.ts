import {
  LayoutDashboard,
  Car,
  Users,
  FileText,
  CalendarDays,
  FolderOpen,
  Wrench,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { hasPermission, type Resource, type Role } from "@/lib/rbac";

/** Display-safe user data for client components (no tenantId/isActive). */
export type DisplayUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  resource?: Resource;
  adminOnly?: boolean;
};

export type NavSection = {
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "vehicles", href: "/vehicles", icon: Car, resource: "vehicles" },
      { key: "clients", href: "/clients", icon: Users, resource: "clients" },
      {
        key: "contracts",
        href: "/contracts",
        icon: FileText,
        resource: "contracts",
      },
      {
        key: "planning",
        href: "/planning",
        icon: CalendarDays,
        resource: "contracts",
      },
      {
        key: "dossiers",
        href: "/dossiers",
        icon: FolderOpen,
        resource: "invoices",
      },
      {
        key: "maintenance",
        href: "/maintenance",
        icon: Wrench,
        resource: "vehicles",
      },
    ],
  },
  {
    items: [
      {
        key: "settings",
        href: "/settings",
        icon: Settings,
        resource: "settings",
        adminOnly: true,
      },
    ],
  },
];

export function isItemVisible(item: NavItem, role: Role): boolean {
  if (item.adminOnly && role !== "admin") return false;
  if (item.resource && !hasPermission(role, item.resource, "read")) {
    return false;
  }
  return true;
}

export function getVisibleNavItems(role: Role): NavItem[] {
  return NAV_SECTIONS.flatMap((section) =>
    section.items.filter((item) => isItemVisible(item, role))
  );
}
