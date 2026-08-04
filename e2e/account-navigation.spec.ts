import { expect, test } from "@playwright/test";

test("customer can navigate every account workspace without a render error", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/account/dashboard");

  await page
    .getByRole("button", { name: "Hồ sơ cá nhân", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Tài khoản" })
      .getByRole("link", { name: "Yêu cầu mở phiên", exact: true }),
  ).toHaveCount(0);

  const destinations = [
    ["Thông tin cá nhân", /\/account\/profile$/],
    ["Xác minh KYC", /\/account\/kyc$/],
    ["Tài khoản ngân hàng", /\/account\/wallet$/],
    ["Tiền cọc đấu giá", /\/account\/deposits$/],
    ["Điểm thành viên", /\/account\/membership$/],
    ["Danh sách theo dõi", /\/account\/watchlist$/],
    ["Trung tâm thông báo", /\/account\/notifications$/],
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

test("gold member can open the auction request workspace from the header", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Mở đấu giá", exact: true })
    .click();

  await expect(page).toHaveURL(/\/open-auction$/);
  await expect(
    page.getByRole("heading", {
      name: "Đưa tài sản của bạn đến đúng cộng đồng người mua",
    }),
  ).toBeVisible();
  await expect(page.getByText("Đủ điều kiện", { exact: true })).toBeVisible();

  await page
    .getByRole("link", { name: "Tạo yêu cầu mở phiên", exact: true })
    .click();
  await expect(page).toHaveURL(/\/open-auction\/requests\/new$/);
});
