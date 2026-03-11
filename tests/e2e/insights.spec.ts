import { test, expect } from "@playwright/test";

test("insights page renders sections", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByText("Top negative triggers")).toBeVisible();
  await expect(page.getByText("Possible new culprits")).toBeVisible();
});
