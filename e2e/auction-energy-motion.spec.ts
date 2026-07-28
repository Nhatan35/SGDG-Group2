import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sgdg-demo-state",
      JSON.stringify({ state: { authenticated: true }, version: 0 }),
    );
  });
});

test("live bidding components carry an urgent rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/auctions/rolex-126610lv/live");

  const countdown = page.locator(".countdown-digits");
  const initialTime = await countdown.textContent();
  await expect.poll(() => countdown.textContent()).not.toBe(initialTime);

  await expect(page.locator(".auction-countdown-dial")).toHaveCSS(
    "animation-name",
    "countdown-card-float",
  );
  await expect(page.locator(".price-card")).toHaveCount(0);
  await expect(page.locator(".composer > .button.primary")).toHaveCSS(
    "animation-name",
    "auction-energy-cta-beat",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});

test("auction motion respects reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const liveBadge = page.locator(".auction-status.live .badge").first();
  await expect(liveBadge).toBeVisible();
  await expect(liveBadge).toHaveCSS("animation-name", "none");
  await expect(page.locator(".hero-auction-card__bid")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".home-live-countdown")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("homepage spotlight uses fire, heartbeat and ignition rhythms", async ({
  page,
}) => {
  await page.goto("/");

  const heading = page.locator(".hero-auction-card__topbar");
  const countdown = page.locator(
    ".hero-auction-card__urgency .auction-countdown",
  );
  const bidButton = page.locator(".hero-auction-card__bid");
  const fireIcon = page.locator(
    ".hero-auction-card__activity-icon",
  ).first();

  await expect(heading).toHaveCSS(
    "animation-name",
    "hero-card-orange-flow",
  );
  await expect(countdown).toHaveCSS(
    "animation-name",
    "hero-card-countdown",
  );
  await expect(bidButton).toHaveCSS(
    "animation-name",
    "hero-card-bid-pulse",
  );
  await expect(fireIcon).toHaveCSS("animation-name", "hero-card-flame");

  const pseudoAnimations = await page.evaluate(() => {
    const headingElement = document.querySelector(
      ".hero-auction-card__topbar",
    );
    const urgencyIndicator = document.querySelector(
      ".hero-auction-card__urgency > p span",
    );
    const cardElement = document.querySelector(".hero-auction-card");

    return {
      headingFire: getComputedStyle(headingElement!, "::after").animationName,
      countdownRing: getComputedStyle(
        urgencyIndicator!,
        "::before",
      ).animationName,
      bidFlames: getComputedStyle(cardElement!, "::before").animationName,
    };
  });

  expect(pseudoAnimations).toEqual({
    headingFire: "hero-card-topbar-shine",
    countdownRing: "hero-card-live-dot",
    bidFlames: "hero-card-energy-sweep",
  });
});

test("livestream summary countdown is orange, white and animated", async ({
  page,
}) => {
  await page.goto("/");

  const panel = page.locator(".home-live-countdown");
  const countdown = panel.locator(".auction-countdown");

  await expect(panel).toHaveCSS(
    "animation-name",
    "auction-energy-live-clock-card",
  );
  await expect(panel).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await expect(panel.locator("svg").first()).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(countdown).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(countdown).toHaveCSS(
    "animation-name",
    "auction-energy-double-heartbeat",
  );

  const pseudoAnimations = await panel.evaluate((element) => ({
    flames: getComputedStyle(element, "::before").animationName,
    sweep: getComputedStyle(element, "::after").animationName,
  }));
  expect(pseudoAnimations).toEqual({
    flames: "auction-energy-live-clock-flames",
    sweep: "auction-energy-live-clock-sweep",
  });
});

test("card countdowns distinguish live urgency from upcoming timing", async ({
  page,
}) => {
  await page.goto("/");

  const liveCountdown = page
    .locator(".auction-card-live .auction-time .auction-countdown")
    .first();
  await expect(liveCountdown.locator("svg")).toBeVisible();
  await expect(liveCountdown).toHaveCSS(
    "animation-name",
    "auction-energy-card-clock",
  );
  await expect(liveCountdown).toHaveCSS("color", "rgb(255, 255, 255)");

  const upcomingCountdown = page
    .locator(
      ".auction-card-state-published .auction-time .auction-countdown",
    )
    .first();
  await expect(upcomingCountdown.locator("svg")).toBeVisible();
  await expect(upcomingCountdown).toHaveCSS(
    "animation-name",
    "auction-energy-upcoming-clock",
  );
});
