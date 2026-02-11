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
    await page.getByLabel("Mot de passe").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("AC2: invalid credentials show error message", async ({ page }) => {
    await page.goto("/fr/login");

    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe").fill("wrongpassword");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect/ })
    ).toBeVisible();
  });

  test("AC3: logout redirects to login", async ({ page }) => {
    // First, log in
    await page.goto("/fr/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Mot de passe").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Then, log out
    await page.getByRole("button", { name: /Déconnexion/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
