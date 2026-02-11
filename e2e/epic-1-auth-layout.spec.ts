import { test, expect } from "@playwright/test";

const SEED_EMAIL = "admin@locafleet.ch";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123456*";

test.describe("Epic 1 — Auth & Layout", () => {
  test("login → dashboard loads with sidebar and topbar", async ({ page }) => {
    test.use({ storageState: { cookies: [], origins: [] } });
    await page.goto("/fr/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // Sidebar should be visible on desktop
    await expect(page.getByText("LocaFleet").first()).toBeVisible();
    // Search trigger should be visible
    await expect(page.getByText("Rechercher...")).toBeVisible();
  });

  test("all expected nav items visible for admin user", async ({ page }) => {
    await page.goto("/fr/dashboard");

    const navItems = [
      "Tableau de bord",
      "Véhicules",
      "Clients",
      "Contrats",
      "Planning",
      "Dossiers",
      "Maintenance",
      "Paramètres",
    ];

    for (const item of navItems) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible();
    }
  });

  test("can navigate between sections via sidebar links", async ({ page }) => {
    await page.goto("/fr/dashboard");

    // Click Véhicules
    await page.getByRole("link", { name: "Véhicules" }).click();
    await expect(page).toHaveURL(/\/vehicles/);

    // Click Clients
    await page.getByRole("link", { name: "Clients" }).click();
    await expect(page).toHaveURL(/\/clients/);

    // Click back to Dashboard
    await page.getByRole("link", { name: "Tableau de bord" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("sidebar collapse/expand works and persists", async ({ page }) => {
    await page.goto("/fr/dashboard");

    // Initially expanded — text visible
    await expect(page.getByText("Véhicules").first()).toBeVisible();

    // Click collapse button
    await page.getByLabel("Réduire le menu").click();

    // Text should be hidden
    await expect(page.getByText("Véhicules").first()).toBeHidden();
    // Expand button should appear
    await expect(page.getByLabel("Agrandir le menu")).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByLabel("Agrandir le menu")).toBeVisible();

    // Expand again
    await page.getByLabel("Agrandir le menu").click();
    await expect(page.getByText("Véhicules").first()).toBeVisible();
  });

  test("user dropdown shows name, has logout option", async ({ page }) => {
    await page.goto("/fr/dashboard");

    // Click user button in the sidebar user section
    const userSection = page.locator("aside").getByText("Admin Test");
    await userSection.click();

    // Dropdown should show logout option
    await expect(page.getByText("Déconnexion")).toBeVisible();
  });

  test("logout redirects to login page", async ({ page }) => {
    test.use({ storageState: { cookies: [], origins: [] } });
    // First login
    await page.goto("/fr/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Open user dropdown from sidebar and click logout
    const userSection = page.locator("aside").getByText("Admin").first();
    await userSection.click();
    await page.getByText("Déconnexion").click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("Ctrl+K opens search dialog", async ({ page }) => {
    await page.goto("/fr/dashboard");

    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder("Rechercher...")).toBeVisible();
  });
});

test.describe("Epic 1 — Mobile layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("hamburger opens drawer, nav items clickable", async ({ page }) => {
    await page.goto("/fr/dashboard");

    // Desktop sidebar should be hidden on mobile
    // Hamburger should be visible
    await page.getByLabel("Ouvrir le menu").click();

    // Sheet should open with nav items
    await expect(page.getByText("Véhicules")).toBeVisible();
    await expect(page.getByText("Clients")).toBeVisible();

    // Click a nav item — should navigate and close drawer
    await page.getByRole("link", { name: "Véhicules" }).click();
    await expect(page).toHaveURL(/\/vehicles/);
  });
});
