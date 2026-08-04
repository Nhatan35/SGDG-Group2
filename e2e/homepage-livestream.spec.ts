import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-18T10:00:00.000Z"));
  await page.goto("/");
});

test("short live auctions appear in an interactive livestream showcase", async ({
  page,
}) => {
  const showcase = page.locator(".home-live-showcase");
  const channels = showcase.getByRole("button", { name: /^Xem livestream/ });

  await expect(
    showcase.getByRole("heading", { name: "Theo dõi từng nhịp trả giá" }),
  ).toBeVisible();
  await expect(channels).toHaveCount(4);
  await expect(channels.first()).toHaveAttribute("aria-pressed", "true");
  await expect(
    showcase.locator(".home-live-countdown .auction-countdown--segmented"),
  ).toBeVisible();
  await expect(
    showcase.locator(".home-live-countdown .auction-countdown__part b"),
  ).toHaveCount(3);

  await channels.nth(1).click();

  await expect(channels.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(showcase.locator(".home-live-summary h3")).toContainText(
    "Patek Philippe Nautilus",
  );
  await expect(
    showcase.getByRole("link", { name: "Xem livestream" }),
  ).toHaveAttribute("href", "/auctions/patek-nautilus/livestream");
});

test("livestream showcase does not overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const showcase = page.locator(".home-live-showcase");
  await expect(showcase).toBeVisible();
  await expect
    .poll(() =>
      showcase.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
});
