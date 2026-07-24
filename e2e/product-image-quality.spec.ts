import { expect, test } from "@playwright/test";

test("large product views use HD sources without upscaling or cropping", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-18T10:00:00.000Z"));
  await page.goto("/");

  const liveStage = page.locator(".home-live-stage");
  const liveImage = liveStage.locator(".home-live-broadcast > img");
  await expect(liveImage).toHaveAttribute("src", "/assets/featured-rolex-v2.png");
  await expect(liveImage).toHaveCSS("object-fit", "contain");
  const liveSize = await liveImage.evaluate((image: HTMLImageElement) => ({
    naturalWidth: image.naturalWidth,
    clientWidth: image.clientWidth,
  }));
  expect(liveSize.naturalWidth).toBeGreaterThanOrEqual(liveSize.clientWidth);
  const stageSize = await liveStage.evaluate((stage) => ({
    clientHeight: stage.clientHeight,
    scrollHeight: stage.scrollHeight,
  }));
  expect(stageSize.scrollHeight).toBe(stageSize.clientHeight);

  await page.goto("/auctions/diamond-gia");
  const detailImage = page.locator(".detail-main-image > img");
  await expect(detailImage).toHaveAttribute("src", "/assets/diamond-gia-v2.png");
  await expect(detailImage).toHaveCSS("object-fit", "contain");

  await page.getByRole("button", { name: "Phóng to ảnh tài sản" }).click();
  const zoomImage = page.getByRole("dialog", { name: "Ảnh tài sản phóng to" }).locator("img");
  const zoomSize = await zoomImage.evaluate((image: HTMLImageElement) => ({
    naturalWidth: image.naturalWidth,
    clientWidth: image.clientWidth,
  }));
  expect(zoomSize.naturalWidth).toBeGreaterThanOrEqual(zoomSize.clientWidth);
});

test("visible catalog products use the upgraded image set", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-18T10:00:00.000Z"));
  await page.goto("/auctions");

  const images = page.locator(".catalog-auction-grid .auction-card img");
  await expect(images).toHaveCount(6);

  const sources = await images.evaluateAll((elements) =>
    elements.map((element) => new URL((element as HTMLImageElement).src).pathname),
  );
  expect(sources).toEqual([
    "/assets/catalog-dalat-painting.png",
    "/assets/catalog-watch-07-hd.png",
    "/assets/catalog-jewelry-07-hd.png",
    "/assets/catalog-phone-07-hd.png",
    "/assets/catalog-vehicle-07-hd.png",
    "/assets/catalog-art-07-hd.png",
  ]);

  const sizes = await images.evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      return {
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        clientWidth: image.clientWidth,
        clientHeight: image.clientHeight,
      };
    }),
  );
  for (const size of sizes) {
    expect(size.naturalWidth).toBeGreaterThanOrEqual(size.clientWidth);
    expect(size.naturalHeight).toBeGreaterThanOrEqual(size.clientHeight);
  }

  await page.goto("/auctions/watch-07");
  const detailImage = page.locator(".detail-main-image > img");
  await expect(detailImage).toHaveAttribute(
    "src",
    "/assets/catalog-watch-07-hd.png",
  );
  await expect(detailImage).toHaveCSS("object-fit", "contain");

  await page.locator(".detail-image-actions button").nth(1).click();
  const zoomImage = page.locator(".detail-zoom-dialog img");
  const zoomSize = await zoomImage.evaluate((image: HTMLImageElement) => ({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    clientWidth: image.clientWidth,
    clientHeight: image.clientHeight,
  }));
  expect(zoomSize.naturalWidth).toBeGreaterThanOrEqual(zoomSize.clientWidth);
  expect(zoomSize.naturalHeight).toBeGreaterThanOrEqual(zoomSize.clientHeight);

  // Older catalog photos must also stay at or below their intrinsic size.
  await page.goto("/auctions/watch-08");
  await page.locator(".detail-image-actions button").nth(1).click();
  const legacyZoomSize = await page
    .locator(".detail-zoom-dialog img")
    .evaluate((image: HTMLImageElement) => ({
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      clientWidth: image.clientWidth,
      clientHeight: image.clientHeight,
    }));
  expect(legacyZoomSize.naturalWidth).toBeGreaterThanOrEqual(
    legacyZoomSize.clientWidth,
  );
  expect(legacyZoomSize.naturalHeight).toBeGreaterThanOrEqual(
    legacyZoomSize.clientHeight,
  );
});
