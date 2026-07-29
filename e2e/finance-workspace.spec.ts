import { expect, test, type Page } from "@playwright/test";

async function loginFinance(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill("finance@sgdg.demo");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/finance$/);
}

test.beforeEach(async ({ page }) => {
  await loginFinance(page);
});

test("payment verification supports status, search and bank filters", async ({
  page,
}) => {
  await page.goto("/finance/payments");

  await expect(
    page.getByRole("heading", { name: "Xác minh thanh toán" }),
  ).toBeVisible();
  await expect(page.locator(".finance-payment-table tbody tr")).toHaveCount(3);

  await page.getByRole("button", { name: /Tất cả/ }).click();
  await expect(page.locator(".finance-payment-table tbody tr")).toHaveCount(6);

  await page.getByLabel("Tìm kiếm giao dịch").fill("0530-002");
  const filteredRow = page.locator(".finance-payment-table tbody tr");
  await expect(filteredRow).toHaveCount(1);
  await expect(filteredRow).toContainText("3.250.000.000");

  await page.getByLabel("Tìm kiếm giao dịch").clear();
  await page.getByLabel("Lọc theo ngân hàng").selectOption("Techcombank");
  const bankFilteredRow = page.locator(".finance-payment-table tbody tr");
  await expect(bankFilteredRow).toHaveCount(1);
  await expect(bankFilteredRow).toContainText("Techcombank");
});

test("finance member can open a payment verification dialog", async ({ page }) => {
  await page.goto("/finance/payments");

  await page
    .getByRole("button", { name: "Xác minh PAY-2024-0528-001" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: /PAY-2024-0528-001/ }),
  ).toBeVisible();
});

test("finance report presents the reference analytics structure", async ({
  page,
}) => {
  await page.goto("/finance/reports");

  await expect(
    page.getByRole("heading", { name: "Báo cáo & Phân tích" }),
  ).toBeVisible();
  const kpiRegion = page.getByRole("region", { name: "Chỉ số tài chính" });
  await expect(kpiRegion.getByRole("article")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Doanh thu theo thời gian" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Doanh thu theo danh mục" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Top tài sản có doanh thu cao" }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});
