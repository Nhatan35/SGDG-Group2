import { expect, test } from "@playwright/test";

test("customer can navigate every account workspace without a render error", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/account/dashboard");

  const destinations = [
    ["Hồ sơ cá nhân", /\/account\/profile$/],
    ["Xác minh KYC", /\/account\/kyc$/],
    ["Tài khoản ngân hàng", /\/account\/wallet$/],
    ["Tiền cọc đấu giá", /\/account\/deposits$/],
    ["Điểm thành viên", /\/account\/membership$/],
    ["Danh sách theo dõi", /\/account\/watchlist$/],
    ["Trung tâm thông báo", /\/account\/notifications$/],
    ["Yêu cầu mở phiên", /\/account\/opening-requests$/],
    ["Trung tâm hỗ trợ", /\/account\/support$/],
  ] as const;

  for (const [label, url] of destinations) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(
      page.getByRole("heading", { name: "Không thể tải dữ liệu" }),
    ).toHaveCount(0);
    await expect(page.locator("#main-content")).toBeVisible();
  }
});
