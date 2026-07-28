import { expect, test } from "@playwright/test";

test("public homepage renders with accessible navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Đấu giá thông minh",
  );
  await expect(
    page.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Trang chủ", exact: true }),
  ).toHaveAttribute("href", "/");
});

test("guest discovery flow", async ({ page }) => {
  await page.goto("/auctions");
  await page.locator(".catalog-auction-grid .auction-card-main").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chia sẻ phiên/i })).toBeVisible();
});
test("customer onboarding flow", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /Xin chào/ })).toBeVisible();
  await page.goto("/account/kyc");
  await expect(
    page.getByRole("heading", { name: "Xác minh danh tính", level: 1 }),
  ).toBeVisible();
});
test("auction flow", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/auctions/rolex-126610lv/live");
  await page.getByRole("button", { name: "Đặt giá thủ công" }).click();
  await page.getByRole("button", { name: "Mức tối thiểu" }).click();
  await page.getByRole("button", { name: "Tiếp tục xác nhận" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Xác nhận đặt giá" }).click();
  await expect(
    page.getByRole("heading", { name: "Bid đã được chấp nhận" }),
  ).toBeVisible();
});
test("winner flow", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/me/auctions/patek-nautilus/payment");
  await expect(
    page.getByRole("heading", {
      name: "Hoàn tất thanh toán để nhận tài sản",
    }),
  ).toBeVisible();
  await page.goto(
    "/me/handover/HO-5711R-2026?auctionId=patek-nautilus",
  );
  await expect(
    page.getByRole("heading", { name: "Theo dõi bàn giao tài sản" }),
  ).toBeVisible();
});
test("admin flow", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tổng quan Administration Service" }),
  ).toBeVisible();
  await page.goto("/admin/live-ops/rolex-126610lv");
  await expect(
    page.getByRole("heading", { name: "Live Operations Console" }),
  ).toBeVisible();
});
