import { expect, test } from "@playwright/test";

const screens = [
  {
    name: "Auction Detail",
    route: "/auctions/rolex-126610lv",
    price: ".detail-price > strong",
    primaryAction: ".detail-actions .button.primary",
  },
  {
    name: "Auction Listing",
    route: "/auctions",
    price: ".catalog-auction-grid .auction-price",
    primaryAction: ".catalog-auction-grid .button.primary",
  },
  {
    name: "Auction Result",
    route: "/me/auctions/patek-nautilus/result",
    price: ".result-closing-price",
    primaryAction: ".result-primary-actions .button.primary",
  },
  {
    name: "Landing",
    route: "/",
    price: ".auction-spotlight .spotlight-summary > strong",
    primaryAction: ".home-redesign-hero .button.primary",
  },
] as const;

const viewports = [
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sgdg-demo-state",
      JSON.stringify({ state: { authenticated: true }, version: 0 }),
    );
  });
  await page.clock.setFixedTime(new Date("2026-07-18T10:00:00.000Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const viewport of viewports) {
  for (const screen of screens) {
    test(`${screen.name} is contained at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(screen.route);

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator(screen.price).first()).toBeVisible();
      await expect(page.locator(screen.primaryAction).first()).toBeVisible();

      const priceIsContained = await page
        .locator(screen.price)
        .first()
        .evaluate(
          (element) =>
            element.scrollWidth <= element.clientWidth &&
            element.getBoundingClientRect().right <= window.innerWidth + 1,
        );
      expect(priceIsContained).toBe(true);

      const overflowingElements = await page.evaluate(
        () =>
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
                parent: [
                  element.parentElement?.tagName.toLowerCase() ?? "",
                  element.parentElement?.classList.length
                    ? `.${Array.from(element.parentElement.classList).join(".")}`
                    : "",
                ].join(""),
                text: element.textContent?.trim().slice(0, 80) ?? "",
                left: Math.round(rect.left),
                right: Math.round(rect.right),
              };
            })
            .filter(
              ({ left, right }) =>
                left < -1 || right > window.innerWidth + 1,
            ),
      );
      expect(overflowingElements).toEqual([]);
    });
  }
}
