import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-18T10:00:00.000Z"));
  await page.goto("/");
});

test("landing prioritizes one hero action, live auctions and curated content", async ({
  page,
}) => {
  const hero = page.locator(".home-redesign-hero");
  const liveShowcase = page.locator(".home-live-showcase");
  const featured = page.locator(".home-featured");
  const categories = page.locator(".category-strip");
  const campaign = page.locator(".home-campaign-zone");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(hero.locator("a.button.primary")).toHaveCount(1);
  await expect(
    hero.getByRole("link", { name: "Đặt giá ngay" }),
  ).toHaveAttribute("href", /\/live$/);
  await expect(
    hero.getByRole("link", { name: "Tìm kiếm ngay" }),
  ).toHaveClass(/secondary/);
  await expect(
    hero.getByLabel(/^Giá hiện tại 450\.000\.000/),
  ).toBeVisible();
  await expect(hero.locator(".auction-countdown")).toBeVisible();
  await expect(featured.locator(".auction-card")).toHaveCount(7);

  const [heroBox, liveBox, featuredBox, categoriesBox, campaignBox] =
    await Promise.all([
      hero.boundingBox(),
      liveShowcase.boundingBox(),
      featured.boundingBox(),
      categories.boundingBox(),
      campaign.boundingBox(),
    ]);
  expect(heroBox).not.toBeNull();
  expect(liveBox).not.toBeNull();
  expect(featuredBox).not.toBeNull();
  expect(categoriesBox).not.toBeNull();
  expect(campaignBox).not.toBeNull();
  expect(heroBox!.y).toBeLessThan(liveBox!.y);
  expect(liveBox!.y).toBeLessThan(featuredBox!.y);
  expect(featuredBox!.y).toBeLessThan(categoriesBox!.y);
  expect(categoriesBox!.y).toBeLessThan(campaignBox!.y);
});

test("landing hierarchy remains contained at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const hero = page.locator(".home-redesign-hero");
  await expect(hero.getByRole("link", { name: "Đặt giá ngay" })).toBeVisible();
  await expect(page.locator(".home-live-showcase")).toBeVisible();
  const overflowingElements = await page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : "",
            element.classList.length
              ? `.${Array.from(element.classList).join(".")}`
              : "",
          ].join(""),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1),
  );
  expect(overflowingElements).toEqual([]);
});
