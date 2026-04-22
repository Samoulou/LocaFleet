import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DisplayUser } from "@/components/layout/nav-config";

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "fr",
  useTranslations: () => {
    const translations: Record<string, string> = {
      "topbar.searchPlaceholder": "Rechercher...",
      "topbar.notifications": "Notifications",
      "topbar.searchEmpty": "Aucun résultat",
      "navigation.vehicles": "Véhicules",
      "navigation.clients": "Clients",
      "navigation.contracts": "Contrats",
      "sidebar.openMenu": "Ouvrir le menu",
      "sidebar.profile": "Profil",
      "auth.logout": "Déconnexion",
      "rbac.roles.admin": "Administrateur",
    };
    return (key: string) => translations[key] ?? key;
  },
}));

// Mock auth-client
vi.mock("@/lib/auth-client", () => ({
  signOut: vi.fn(),
}));

// Mock i18n navigation
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

import { SidebarProvider } from "@/components/layout/sidebar-context";
import { AppTopbar } from "@/components/layout/app-topbar";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeUser(overrides: Partial<DisplayUser> = {}): DisplayUser {
  return {
    id: "u1",
    role: "admin",
    email: "admin@locafleet.ch",
    name: "Marc Favre",
    ...overrides,
  };
}

function renderTopbar(user: DisplayUser) {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <AppTopbar user={user} />
      </SidebarProvider>
    </TooltipProvider>
  );
}

describe("AppTopbar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders search trigger with placeholder text", () => {
    renderTopbar(makeUser());
    expect(screen.getByText("Rechercher...")).toBeInTheDocument();
  });

  it("renders notification bell", () => {
    renderTopbar(makeUser());
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it("renders user avatar with initials", () => {
    renderTopbar(makeUser({ name: "Marc Favre" }));
    expect(screen.getByText("MF")).toBeInTheDocument();
    expect(screen.getByLabelText("Profil")).toBeInTheDocument();
  });
});
