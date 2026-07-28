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
  await expect(hero.locator("a.button.primary")).toHaveCount(2);
  await expect(
    hero.getByRole("link", { name: "Đặt giá ngay" }),
  ).toHaveAttribute("href", /\/live$/);
  await expect(
    hero.getByRole("link", { name: "Tìm kiếm ngay" }),
  ).toHaveClass(/primary/);
  await expect(hero.getByLabel("Danh mục").locator("option")).toHaveCount(10);
  await expect(hero.getByLabel("Vị trí").locator("option")).not.toHaveCount(1);
  await expect(hero.getByLabel("Khoảng giá").locator("option")).toHaveCount(4);
  await hero.getByLabel("Danh mục").selectOption("Trang sức");
  await hero.getByLabel("Vị trí").selectOption("Hà Nội");
  await hero.getByLabel("Khoảng giá").selectOption("500-1000");
  await expect(
    hero.getByRole("link", { name: "Tìm kiếm ngay" }),
  ).toHaveAttribute(
    "href",
    /\/auctions\?category=Trang\+s%E1%BB%A9c&q=H%C3%A0\+N%E1%BB%99i&price=500-1000/,
  );
  await expect(hero.getByText("Tình trạng: Như mới 99%")).toHaveCount(0);
  await expect(hero.getByText("Giao hàng toàn quốc")).toHaveCount(0);
  await expect(hero.getByText(/Đăng bởi:/)).toHaveCount(0);
  await expect(
    hero.getByLabel(/^Giá hiện tại 450\.000\.000/),
  ).toBeVisible();
  await expect(hero.locator(".auction-countdown")).toBeVisible();
  const spotlightBox = await hero.locator(".hero-auction-card").boundingBox();
  const spotlightImageBox = await hero
    .locator(".hero-auction-card__media")
    .boundingBox();
  expect(spotlightBox).not.toBeNull();
  expect(spotlightImageBox).not.toBeNull();
  expect(spotlightBox!.width).toBeGreaterThan(spotlightBox!.height);
  expect(spotlightImageBox!.width / spotlightImageBox!.height).toBeGreaterThan(
    1.7,
  );

  await hero
    .getByRole("button", { name: "Xem sản phẩm tiếp theo" })
    .click();
  const longPrice = hero.getByLabel(/^Giá hiện tại 3\.250\.000\.000/);
  await expect(longPrice).toBeVisible();
  await expect
    .poll(() =>
      longPrice.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    )
    .toBe(true);
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
  const spotlightImageBox = await hero
    .locator(".hero-auction-card__media")
    .boundingBox();
  expect(spotlightImageBox).not.toBeNull();
  expect(spotlightImageBox!.width / spotlightImageBox!.height).toBeGreaterThan(
    1.7,
  );
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
