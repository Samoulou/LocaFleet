import { test, expect } from "@playwright/test";

// These tests require a running app with a seeded database.
// Seed credentials come from SEED_ADMIN_PASSWORD env var.
const SEED_EMAIL = "admin@locafleet.ch";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123456*";

test.describe("Authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("AC1: valid credentials redirect to dashboard", async ({ page }) => {
    await page.goto("/fr/login");

    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("AC2: invalid credentials show error message", async ({ page }) => {
    await page.goto("/fr/login");

    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill("wrongpassword");
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Error message appears (may be alert role or plain text)
    await expect(page.getByText(/incorrect/i)).toBeVisible();
  });

  test("AC3: logout redirects to login", async ({ page, isMobile }) => {
    // First, log in
    await page.goto("/fr/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    if (isMobile) {
      // Mobile: open hamburger drawer, then user menu
      await page.getByLabel("Ouvrir le menu").click();
      const sheet = page.locator('[role="dialog"]');
      await sheet.getByText("Admin").first().click();
    } else {
      // Desktop: click user button in sidebar
      await page.locator("aside").getByRole("button").last().click();
    }

    await page.getByText("Déconnexion").click();
    await expect(page).toHaveURL(/\/login/);
  });
});
