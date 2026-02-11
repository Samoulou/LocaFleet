import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/fr/login");

  // Fill in credentials
  await page.getByLabel("Email").fill("admin@locafleet.ch");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD || "123456*");

  // Click login button
  await page.getByRole("button", { name: "Se connecter" }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/);

  // Verify we're logged in
  await expect(page).toHaveURL(/\/dashboard/);

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
