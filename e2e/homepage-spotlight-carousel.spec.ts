import { expect, test } from "@playwright/test";

test("spotlight carousel rotates automatically and pauses for interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const spotlight = page.locator(".home-product-overlay");
  const title = spotlight.locator("h1");
  const initialTitle = await title.textContent();

  await expect(spotlight.locator(".hero-auction-card__dots button")).toHaveCount(
    5,
  );
  await expect
    .poll(() => title.textContent(), { timeout: 7000 })
    .not.toBe(initialTitle);

  await spotlight.hover();
  const pausedTitle = await title.textContent();
  await page.waitForTimeout(5500);
  await expect(title).toHaveText(pausedTitle!);

  await page.locator(".home-hero-stage-arrow--next").click();
  await expect(title).not.toHaveText(pausedTitle!);
  await expect(spotlight.locator(".hero-auction-card__dots .active")).toHaveCount(
    1,
  );
});

test("immersive product details stay clear of the estimate callout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const [productBox, estimateBox] = await Promise.all([
    page.locator(".home-product-overlay").boundingBox(),
    page.locator(".home-estimate-callout").boundingBox(),
  ]);

  expect(productBox).not.toBeNull();
  expect(estimateBox).not.toBeNull();
  expect(productBox!.x + productBox!.width).toBeLessThanOrEqual(estimateBox!.x);
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`immersive spotlight stays usable on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const hero = page.locator(".home-redesign-hero");
    const spotlight = page.locator(".home-product-overlay");
    const dots = spotlight.locator(".hero-auction-card__dots");
    const price = spotlight.locator(".home-product-overlay__facts strong");
    const summary = spotlight.locator(".home-product-overlay__summary");
    const [heroBox, dotsBox] = await Promise.all([
      hero.boundingBox(),
      dots.boundingBox(),
    ]);

    expect(heroBox).not.toBeNull();
    expect(dotsBox).not.toBeNull();
    expect(dotsBox!.x).toBeGreaterThanOrEqual(heroBox!.x);
    expect(dotsBox!.x + dotsBox!.width).toBeLessThanOrEqual(
      heroBox!.x + heroBox!.width,
    );
    await expect(price).toHaveCSS("white-space", "nowrap");
    await expect(summary).toBeVisible();

    const currentTitle = await spotlight.locator("h1").textContent();
    await page.locator(".home-hero-stage-arrow--previous").click();
    await expect(spotlight.locator("h1")).not.toHaveText(currentTitle!);
  });
}

test("spotlight autoplay and backdrop transition respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const title = page.locator(".home-product-overlay h1");
  const initialTitle = await title.textContent();

  await page.waitForTimeout(5500);
  await expect(title).toHaveText(initialTitle!);
  await expect(page.locator(".home-hero-backdrop")).toHaveCSS(
    "animation-name",
    "none",
  );
});
