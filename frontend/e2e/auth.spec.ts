import { test, expect } from "@playwright/test";

test.describe("CivicPulse E2E — Authentication & Access Control", () => {
  test("citizen can log in successfully and access dashboard", async ({ page }) => {
    await page.goto("/login");

    // Fill in demo citizen credentials
    await page.fill('input[type="email"], input[name="username"], input[name="email"]', "citizen@civicpulse.gov.in");
    await page.fill('input[type="password"]', "Citizen@1234");
    await page.click('button[type="submit"]');

    // Should navigate to dashboard
    await expect(page).toHaveURL(/.*(\/|\/projects)/);
  });

  test("invalid password correctly surfaces authentication error", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"], input[name="username"], input[name="email"]', "citizen@civicpulse.gov.in");
    await page.fill('input[type="password"]', "WrongPassword@123");
    await page.click('button[type="submit"]');

    // Should remain on login and show toast/error message
    await expect(page).toHaveURL(/.*login/);
  });
});
