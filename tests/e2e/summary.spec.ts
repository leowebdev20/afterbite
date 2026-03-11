import { test, expect } from "@playwright/test";

test("summary page renders weekly section", async ({ page }) => {
  await page.goto("/summary");
  await expect(page.getByText("Last 7 days")).toBeVisible();
  await expect(page.getByText("Latest symptoms")).toBeVisible();
});
