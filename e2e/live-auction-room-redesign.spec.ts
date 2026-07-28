import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sgdg-demo-state",
      JSON.stringify({ state: { authenticated: true }, version: 0 }),
    );
  });
});

test("live room follows the three-zone auction layout", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/auctions/rolex-126610lv/live");

  const visual = page.locator(".live-visual-column");
  const command = page.locator(".live-command-column");
  const competition = page.locator(".live-competition-column");
  const dial = page.locator(".auction-countdown-dial");
  const headerMetrics = page.locator(
    ".live-header .live-header-session-metrics",
  );

  await expect(visual).toBeVisible();
  await expect(command).toBeVisible();
  await expect(competition).toBeVisible();
  await expect(dial).toBeVisible();
  await expect(headerMetrics).toBeVisible();
  await expect(headerMetrics.locator(".live-session-metric")).toHaveCount(3);
  await expect(page.locator(".live-command-column .live-session-metrics")).toHaveCount(0);
  await expect(page.getByText("Cập nhật real-time")).toHaveCount(0);
  await expect(page.getByText("Bảng xếp hạng đấu giá")).toBeVisible();
  await expect(page.getByText("BIDDING ĐANG MỞ")).toHaveCount(0);
  await expect(page.getByText("Vị trí của bạn")).toHaveCount(0);
  await expect(
    page.getByText("Đấu giá minh bạch · An toàn tuyệt đối"),
  ).toHaveCount(0);

  const [visualBox, commandBox, competitionBox] = await Promise.all([
    visual.boundingBox(),
    command.boundingBox(),
    competition.boundingBox(),
  ]);

  expect(visualBox).not.toBeNull();
  expect(commandBox).not.toBeNull();
  expect(competitionBox).not.toBeNull();
  expect(visualBox!.x).toBeLessThan(commandBox!.x);
  expect(commandBox!.x).toBeLessThan(competitionBox!.x);

  await expect(dial.locator(".countdown-compact-header")).toBeVisible();
  await expect(dial.locator(".countdown-digits")).toBeVisible();
  await expect(dial.locator(".countdown-units")).toBeVisible();
  await expect(dial.locator(".countdown-orbit")).toHaveCount(0);

  const initialTime = await dial.locator(".countdown-digits").textContent();
  await expect
    .poll(() => dial.locator(".countdown-digits").textContent())
    .not.toBe(initialTime);

  const desktopScreenshot = testInfo.outputPath("live-auction-desktop.png");
  await page.screenshot({
    path: desktopScreenshot,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach("live-auction-desktop", {
    path: desktopScreenshot,
    contentType: "image/png",
  });
});

test("live room prioritizes bidding information on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auctions/rolex-126610lv/live");

  const dialBox = await page.locator(".auction-countdown-dial").boundingBox();
  const composerBox = await page.locator(".composer").boundingBox();
  const headerMetricsBox = await page
    .locator(".live-header .live-header-session-metrics")
    .boundingBox();

  expect(dialBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect(headerMetricsBox).not.toBeNull();
  expect(headerMetricsBox!.width).toBeGreaterThan(300);
  expect(dialBox!.y).toBeLessThan(composerBox!.y);
  await expect(page.locator(".price-card")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);

  const mobileScreenshot = testInfo.outputPath("live-auction-mobile.png");
  await page.screenshot({
    path: mobileScreenshot,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach("live-auction-mobile", {
    path: mobileScreenshot,
    contentType: "image/png",
  });
});

test("compact countdown has no animated decoration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auctions/rolex-126610lv/live");

  await expect(page.locator(".countdown-digits")).toBeVisible();
  await expect(page.locator(".countdown-progress")).toHaveCount(0);
  await expect(page.locator(".countdown-live-pill")).toHaveCount(0);
});
