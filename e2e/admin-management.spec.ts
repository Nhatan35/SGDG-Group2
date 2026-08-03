import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill("admin@sgdg.demo");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.beforeEach(async ({ page }) => {
  await loginAdmin(page);
});

test("auction management follows the dashboard template and filters data", async ({
  page,
}) => {
  await page.goto("/admin/auctions");

  await expect(
    page.getByRole("heading", { name: "Quản lý phiên đấu giá" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tổng quan phiên đấu giá" }).getByRole("article"),
  ).toHaveCount(5);
  await expect(page.locator(".auction-management-table tbody tr")).toHaveCount(5);

  await page.getByLabel("Lọc danh mục phiên").selectOption("Đồng hồ");
  await expect(page.locator(".auction-management-table tbody tr")).toHaveCount(2);

  await page.getByLabel("Lọc danh mục phiên").selectOption("ALL");
  await page.getByLabel("Tìm kiếm phiên đấu giá").fill("Patek Philippe");
  const filteredRow = page.locator(".auction-management-table tbody tr");
  await expect(filteredRow).toHaveCount(1);
  await expect(filteredRow).toContainText("Patek Philippe Nautilus");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("auction status action remains audit-protected", async ({ page }) => {
  await page.goto("/admin/auctions");
  await page.getByRole("button", { name: "Cập nhật SGD-260717-001" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toContainText("SGD-260717-001");
  await expect(dialog.getByRole("button", { name: "Xác nhận" })).toBeDisabled();
});

test("user and eKYC management supports account filters and audited actions", async ({
  page,
}) => {
  await page.goto("/admin/users");

  await expect(
    page.getByRole("heading", { name: "Tài khoản Customer & ngoại lệ eKYC" }),
  ).toBeVisible();
  await expect(page.locator(".account-management-table tbody tr")).toHaveCount(4);

  await page.getByLabel("Lọc tài khoản và eKYC").selectOption("EXCEPTION_REVIEW");
  const pendingRow = page.locator(".account-management-table tbody tr");
  await expect(pendingRow).toHaveCount(1);
  await expect(pendingRow).toContainText("Trần Quốc Huy");

  await page
    .getByRole("button", { name: "Thẩm định ngoại lệ Trần Quốc Huy" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
