import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DisplayUser } from "@/components/layout/nav-config";

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "fr",
  useTranslations: () => {
    const translations: Record<string, string> = {
      "navigation.vehicles": "Véhicules",
      "navigation.clients": "Clients",
      "navigation.contracts": "Contrats",
      "navigation.invoices": "Factures",
      "navigation.maintenance": "Maintenance",
      "navigation.settings": "Paramètres",
      "sidebar.collapse": "Réduire le menu",
      "sidebar.expand": "Agrandir le menu",
      "sidebar.comingSoon": "Bientôt",
      "sidebar.profile": "Profil",
      "rbac.roles.admin": "Administrateur",
      "rbac.roles.agent": "Agent",
      "rbac.roles.viewer": "Lecteur",
      "auth.logout": "Déconnexion",
    };
    return (key: string) => translations[key] ?? key;
  },
}));

// Mock auth-client
vi.mock("@/lib/auth-client", () => ({
  signOut: vi.fn(),
}));

import { SidebarProvider } from "@/components/layout/sidebar-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
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

function renderSidebar(user: DisplayUser) {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
      </SidebarProvider>
    </TooltipProvider>
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("admin sees all 6 nav items including Settings", () => {
    renderSidebar(makeUser({ role: "admin" }));
    expect(screen.getByText("Véhicules")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Contrats")).toBeInTheDocument();
    expect(screen.getByText("Factures")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("agent sees 5 items (no Settings)", () => {
    renderSidebar(makeUser({ role: "agent" }));
    expect(screen.getByText("Véhicules")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Contrats")).toBeInTheDocument();
    expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
  });

  it("viewer sees 5 items (no Settings)", () => {
    renderSidebar(makeUser({ role: "viewer" }));
    expect(screen.getByText("Véhicules")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
  });

  it("displays user name and role", () => {
    renderSidebar(makeUser({ name: "Marc Favre", role: "admin" }));
    expect(screen.getByText("Marc Favre")).toBeInTheDocument();
    expect(screen.getByText("Administrateur")).toBeInTheDocument();
  });

  it("collapse toggle changes sidebar state", async () => {
    const user = userEvent.setup();
    renderSidebar(makeUser());

    // Initially expanded — text labels should be visible
    expect(screen.getByText("Véhicules")).toBeInTheDocument();

    // Click collapse
    const collapseBtn = screen.getByLabelText("Réduire le menu");
    await user.click(collapseBtn);

    // After collapse, the text labels should be hidden (but icons remain)
    expect(screen.queryByText("Véhicules")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Agrandir le menu")).toBeInTheDocument();
  });
});
