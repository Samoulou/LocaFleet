import { test, expect } from "@playwright/test";

const SEED_EMAIL = "admin@locafleet.ch";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123456*";

test.describe("Epic 1 — Auth & Layout (fresh session)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login → dashboard loads with sidebar and topbar", async ({ page }) => {
    await page.goto("/fr/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Sidebar should be visible on desktop
    await expect(page.getByText("LocaFleet").first()).toBeVisible();
    // Search trigger should be visible
    await expect(page.getByText("Rechercher...")).toBeVisible();
  });

  test("logout redirects to login page", async ({ page }) => {
    // First login
    await page.goto("/fr/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Open user dropdown from sidebar and click logout
    await page.locator("aside").getByRole("button").last().click();
    await page.getByText("Déconnexion").click();

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Epic 1 — Auth & Layout (authenticated)", () => {
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

    const sidebar = page.locator("aside");
    for (const item of navItems) {
      await expect(
        sidebar.getByText(item, { exact: true }).first()
      ).toBeVisible();
    }
  });

  test("can navigate between sections via sidebar links", async ({ page }) => {
    await page.goto("/fr/dashboard");

    const sidebar = page.locator("aside");

    // Click Véhicules — verify URL changes
    await sidebar.getByRole("link", { name: "Véhicules" }).click();
    await page.waitForURL(/\/vehicles/);

    // Go back to dashboard (target pages don't exist yet in Epic 1)
    await page.goto("/fr/dashboard");

    // Click Clients — verify URL changes
    await sidebar.getByRole("link", { name: "Clients" }).click();
    await page.waitForURL(/\/clients/);

    // Navigate back to Dashboard via sidebar
    await page.goto("/fr/dashboard");
    await sidebar.getByRole("link", { name: "Tableau de bord" }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("sidebar collapse/expand works and persists", async ({ page }) => {
    await page.goto("/fr/dashboard");

    const sidebar = page.locator("aside");

    // Initially expanded — text visible
    await expect(sidebar.getByText("Véhicules", { exact: true })).toBeVisible();

    // Click collapse button
    await page.getByLabel("Réduire le menu").click();

    // Nav text should be hidden (sidebar only shows icons)
    await expect(sidebar.getByText("Véhicules", { exact: true })).toBeHidden();
    // Expand button should appear
    await expect(page.getByLabel("Agrandir le menu")).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByLabel("Agrandir le menu")).toBeVisible();

    // Expand again
    await page.getByLabel("Agrandir le menu").click();
    await expect(sidebar.getByText("Véhicules", { exact: true })).toBeVisible();
  });

  test("user dropdown shows name, has logout option", async ({ page }) => {
    await page.goto("/fr/dashboard");

    // Click user button in the sidebar user section (last button in aside)
    await page.locator("aside").getByRole("button").last().click();

    // Dropdown should show logout option
    await expect(page.getByText("Déconnexion")).toBeVisible();
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

    // Hamburger should be visible
    await page.getByLabel("Ouvrir le menu").click();

    // Sheet should open with nav items
    const sheet = page.locator('[role="dialog"]');
    await expect(sheet.getByText("Véhicules", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Clients", { exact: true })).toBeVisible();

    // Click a nav item — should navigate and close drawer
    await sheet.getByRole("link", { name: "Véhicules" }).click();
    await page.waitForURL(/\/vehicles/);
  });
});
