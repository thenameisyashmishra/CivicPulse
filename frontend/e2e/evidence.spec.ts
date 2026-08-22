import { test, expect } from "@playwright/test";

test.describe("CivicPulse E2E — Project & Evidence Workflows", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as engineer
    await page.goto("/login");
    await page.fill('input[type="email"], input[name="username"], input[name="email"]', "engineer@civicpulse.gov.in");
    await page.fill('input[type="password"]', "Engineer@1234");
    await page.click('button[type="submit"]');
  });

  test("can view projects list and details", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("body")).toContainText("Projects");
  });

  test("can navigate to verifications review workflow", async ({ page }) => {
    await page.goto("/verifications");
    await expect(page.locator("body")).toContainText("Verification");
  });
});
