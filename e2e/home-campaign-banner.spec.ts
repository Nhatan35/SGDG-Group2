import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`campaign banner stays sharp and contained on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const banner = page.locator(".home-campaign-banner");
    const art = banner.locator(".home-campaign-art");
    const content = banner.locator(".home-campaign-content");

    await banner.scrollIntoViewIfNeeded();
    await expect(
      banner.getByRole("heading", {
        name: "Chạm giá trị thật. Chốt phiên đầy cảm xúc.",
      }),
    ).toBeVisible();
    await expect(art).toHaveJSProperty("complete", true);
    await expect(art).toHaveCSS("object-fit", "cover");

    const imageSize = await art.evaluate((image: HTMLImageElement) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
    expect(imageSize).toEqual({ width: 1672, height: 941 });

    const [bannerBox, artBox, contentBox] = await Promise.all([
      banner.boundingBox(),
      art.boundingBox(),
      content.boundingBox(),
    ]);
    expect(bannerBox).not.toBeNull();
    expect(artBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(bannerBox!.x).toBeGreaterThanOrEqual(0);
    expect(bannerBox!.x + bannerBox!.width).toBeLessThanOrEqual(viewport.width);

    if (viewport.name === "mobile") {
      expect(artBox!.height).toBeLessThan(bannerBox!.height);
      expect(contentBox!.y).toBeGreaterThanOrEqual(
        artBox!.y + artBox!.height - 2,
      );
      const primaryActionBox = await banner
        .locator(".home-campaign-actions a")
        .first()
        .boundingBox();
      expect(primaryActionBox).not.toBeNull();
      expect(primaryActionBox!.width).toBeGreaterThan(contentBox!.width - 48);
    } else {
      expect(contentBox!.x + contentBox!.width).toBeLessThan(
        bannerBox!.x + bannerBox!.width * 0.68,
      );
    }

    await banner.screenshot({
      path: testInfo.outputPath(`campaign-${viewport.name}.png`),
      animations: "disabled",
    });
  });
}

test("campaign sheen respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const animationName = await page
    .locator(".home-campaign-banner")
    .evaluate((element) => getComputedStyle(element, "::after").animationName);
  expect(animationName).toBe("none");
});
