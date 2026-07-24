import { expect, test } from "@playwright/test";

const route = "/me/auctions/patek-nautilus/result";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sgdg-demo-state",
      JSON.stringify({ state: { authenticated: true }, version: 0 }),
    );
  });
  await page.clock.setFixedTime(new Date("2026-07-18T15:00:00.000Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("auction result desktop visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route);
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await expect(page.locator(".result-closing-price")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await expect(page).toHaveScreenshot(
    "PUB-RESULT-auction-result-desktop-1440.png",
    {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  );
});

test("auction result mobile visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await expect(page.locator(".result-closing-price")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await expect(page).toHaveScreenshot(
    "PUB-RESULT-auction-result-mobile-390.png",
    {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  );
});
