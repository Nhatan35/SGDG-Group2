import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];

test("Opening Request review is responsive and keyboard operable", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill("content@sgdg.demo");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/ops/opening-requests");
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);

    await page.goto("/ops/opening-requests/ORQ-ROYAL-OAK-001");
    await expect(page.locator("h1")).toHaveCount(1);
    const accept = page.getByRole("button", { name: "Accept for Draft" });
    await accept.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Tiếp nhận để chuẩn bị bản nháp",
    });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(accept).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }
});
