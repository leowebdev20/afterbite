import { test, expect } from "@playwright/test";

test("home shows main score card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Today's Impact")).toBeVisible();
});
