import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`support AI is polished and contained on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Mở chat hỗ trợ" });
    await expect(trigger.locator(".home-chat-expert-symbol")).toBeVisible();
    await expect(trigger).toHaveAccessibleName("Mở chat hỗ trợ");
    await expect(trigger.locator(".home-chat-button-label")).toBeHidden();
    await expect(trigger).toHaveCSS(
      "animation-name",
      "home-chat-expert-call",
    );
    await trigger.click();

    const chatbox = page.locator(".home-chatbox");
    await expect(chatbox).toBeVisible();
    await expect(
      chatbox.getByRole("heading", { name: "Chuyên viên đấu giá AI" }),
    ).toBeVisible();
    await expect(chatbox.locator(".home-chat-expert-symbol")).toHaveCount(3);
    await expect(chatbox.locator(".home-chat-live-note")).toBeVisible();
    await expect(chatbox).toHaveCSS(
      "animation-name",
      "home-chat-enter, home-chatbox-breathe",
    );
    await expect(chatbox.locator(".home-chat-messages article")).toHaveCount(3);
    await expect(chatbox.locator(".home-chat-suggestions button")).toHaveCount(
      3,
    );
    await expect(
      page.locator(".home-chat-widget.open > .home-chat-button"),
    ).toBeHidden();

    const bounds = await chatbox.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);

    await chatbox
      .getByRole("button", { name: "Đóng khung chat hỗ trợ" })
      .click();
    await expect(chatbox).toBeHidden();
  });
}

test("auction expert motion respects reduced-motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Mở chat hỗ trợ" });
  await expect(trigger).toHaveCSS("animation-name", "none");
  await trigger.click();
  await expect(page.locator(".home-chatbox")).toHaveCSS(
    "animation-name",
    "none",
  );
});
