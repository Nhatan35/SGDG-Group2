import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("Customer signs in through the complete VNeID consent flow", async ({
  page,
}) => {
  await page.goto("/auth/login");
  const choice = page.getByRole("link", { name: /Đăng nhập bằng VNeID/ });
  await expect(choice).toBeVisible();
  await choice.click();

  await expect(
    page.getByRole("heading", { name: "Tiếp tục với tài khoản VNeID" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Xác nhận chia sẻ thông tin" }),
  ).toBeVisible();
  const accept = page.getByRole("button", { name: "Xác nhận chia sẻ" });
  await expect(accept).toBeDisabled();
  await page.getByRole("button", { name: "Hiện thông tin" }).click();
  await expect(page.getByText("Nguyễn Minh Anh")).toBeVisible();
  await page
    .getByLabel(/Tôi đã đọc, hiểu mục đích xử lý dữ liệu/)
    .check();
  await accept.click();

  await expect(
    page.getByRole("heading", { name: "Xác thực khuôn mặt" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu xác thực" }).click();
  await expect(
    page.getByText("Đang kiểm tra sống và đối chiếu..."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Đăng nhập thành công" }),
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Vào trang chủ SGDG" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("facial verification failure provides a retry path", async ({ page }) => {
  await page.goto("/auth/vneid?scenario=face-failed");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page
    .getByLabel(/Tôi đã đọc, hiểu mục đích xử lý dữ liệu/)
    .check();
  await page.getByRole("button", { name: "Xác nhận chia sẻ" }).click();
  await page.getByRole("button", { name: "Bắt đầu xác thực" }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa thể xác thực khuôn mặt" }),
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole("button", { name: "Thử xác thực lại" }),
  ).toBeVisible();
});

test("VNeID refusal shares no data and offers a safe retry", async ({ page }) => {
  await page.goto("/auth/vneid");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page
    .getByRole("button", { name: "Xác nhận không chia sẻ" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bạn đã từ chối chia sẻ" }),
  ).toBeVisible();
  await expect(page.getByText("Không có dữ liệu nào được chia sẻ")).toBeVisible();
  await page.getByRole("button", { name: "Thử lại với VNeID" }).click();
  await expect(
    page.getByRole("heading", { name: "Tiếp tục với tài khoản VNeID" }),
  ).toBeVisible();
});

test("Customer can register with VNeID and continue to profile completion", async ({
  page,
}) => {
  await page.goto("/auth/register");
  const choice = page.getByRole("link", { name: /Đăng ký bằng VNeID/ });
  await expect(choice).toBeVisible();
  await choice.click();

  await expect(page).toHaveURL(/\/auth\/vneid\?mode=register$/);
  await expect(
    page.getByText("Xác thực danh tính để tạo tài khoản SGDG"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Xác nhận thông tin tạo tài khoản",
    }),
  ).toBeVisible();
  await page
    .getByLabel(/Tôi đã đọc, hiểu mục đích xử lý dữ liệu/)
    .check();
  await page.getByRole("button", { name: "Xác nhận chia sẻ" }).click();
  await page.getByRole("button", { name: "Bắt đầu xác thực" }).click();
  await expect(
    page.getByRole("heading", { name: "Đăng ký thành công" }),
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Vào trang chủ SGDG" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("expired VNeID request is explicit and mobile layout stays contained", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/vneid?scenario=expired");
  await expect(
    page.getByRole("heading", { name: "Yêu cầu đăng nhập đã hết hạn" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
