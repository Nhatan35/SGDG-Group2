import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-18T10:00:00.000Z"));
  await page.goto("/auctions/rolex-126610lv/livestream");
});

test("guest can watch the public livestream with live bids and comments", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Rolex Submariner Date 126610LV" }),
  ).toBeVisible();
  await expect(page.getByText("Đang xem với tư cách khách")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Bình luận livestream" }),
  ).toBeVisible();

  const price = page.locator(".public-live-current-price > strong");
  const bidPopup = page.locator(".public-live-bid-pop");
  const initialPrice = await price.textContent();
  await expect(bidPopup).toHaveCount(0);
  await page.clock.runFor(5_600);
  await expect(price).not.toHaveText(initialPrice ?? "");
  await expect(bidPopup.first()).toContainText("GIÁ MỚI");
  await expect(page.getByText("Bảng giá trực tiếp").last()).toBeVisible();
  await page.clock.runFor(2_700);
  await expect(bidPopup).toHaveCount(0);
});

test("guest is asked to sign in only when commenting or bidding", async ({
  page,
}) => {
  await page.getByPlaceholder("Đăng nhập để bình luận...").fill("Sản phẩm rất đẹp");
  await page.getByRole("button", { name: "Gửi bình luận" }).click();
  await expect(page.getByText("Đăng nhập để tham gia trò chuyện")).toBeVisible();

  await page.getByRole("link", { name: "Đăng nhập để đấu giá" }).click();
  await expect(page).toHaveURL("/auth/login");
});

test("public livestream room is responsive on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const room = page.locator(".public-auction-live-page");
  await expect(room).toBeVisible();
  await expect
    .poll(() => room.evaluate((element) => element.scrollWidth <= element.clientWidth))
    .toBe(true);
});
