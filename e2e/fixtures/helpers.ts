import { Page, expect } from "@playwright/test";

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to dashboard section
 */
export async function navigateTo(page: Page, section: string) {
  await page.goto(`/${section}`);
  await waitForPageLoad(page);
}

/**
 * Fill a form field by label
 */
export async function fillField(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Click a button by name
 */
export async function clickButton(page: Page, name: string) {
  await page.getByRole("button", { name }).click();
}

/**
 * Verify toast notification appears
 */
export async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message)).toBeVisible();
}

/**
 * Test data generators
 */
export const testData = {
  client: {
    firstName: "Test",
    lastName: "Client",
    email: "test.client@example.com",
    phone: "+41 79 000 00 00",
  },
  vehicle: {
    brand: "Test",
    model: "Vehicle",
    plate: "VS 12345",
    year: 2024,
  },
};
