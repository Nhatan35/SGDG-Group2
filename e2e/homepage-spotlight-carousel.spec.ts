import { expect, test } from "@playwright/test";

test("spotlight carousel rotates automatically and pauses for interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const carousel = page.locator(".spotlight-carousel");
  const title = carousel.locator(".spotlight-summary h2");
  const initialTitle = await title.textContent();

  await expect(carousel.locator(".spotlight-carousel-dots button")).toHaveCount(
    5,
  );
  await expect
    .poll(() => title.textContent(), { timeout: 7000 })
    .not.toBe(initialTitle);

  await carousel.hover();
  const pausedTitle = await title.textContent();
  await page.waitForTimeout(5500);
  await expect(title).toHaveText(pausedTitle!);

  await carousel.getByRole("button", { name: "Xem sản phẩm tiếp theo" }).click();
  await expect(title).not.toHaveText(pausedTitle!);
  await expect(carousel.locator(".spotlight-carousel-dots .active")).toHaveCount(
    1,
  );
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`spotlight controls stay contained on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const carousel = page.locator(".spotlight-carousel");
    const controls = carousel.locator(".spotlight-carousel-controls");
    const progress = carousel.locator(".spotlight-carousel-progress span");

    const [carouselBox, controlsBox] = await Promise.all([
      carousel.boundingBox(),
      controls.boundingBox(),
    ]);
    expect(carouselBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(controlsBox!.x).toBeGreaterThanOrEqual(carouselBox!.x);
    expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(
      carouselBox!.x + carouselBox!.width,
    );
    await expect(progress).toHaveCSS(
      "animation-name",
      "spotlight-carousel-progress",
    );

    await carousel.getByRole("button", { name: "Xem sản phẩm trước" }).click();
    await expect(carousel.locator(".spotlight-slide")).toHaveCSS(
      "animation-name",
      "spotlight-carousel-in-prev",
    );
  });
}

test("spotlight autoplay and transitions respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const carousel = page.locator(".spotlight-carousel");
  const title = carousel.locator(".spotlight-summary h2");
  const initialTitle = await title.textContent();

  await page.waitForTimeout(5500);
  await expect(title).toHaveText(initialTitle!);
  await expect(carousel.locator(".spotlight-carousel-progress span")).toHaveCSS(
    "animation-name",
    "none",
  );
});
