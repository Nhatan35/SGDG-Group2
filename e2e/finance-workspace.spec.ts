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
  await page.goto("/admin/payments");

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

test("finance member can open a payment verification dialog", async ({
  page,
}) => {
  await page.goto("/admin/payments");

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
    page.getByRole("heading", { name: "Doanh thu theo ngày" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Doanh thu theo danh mục" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Top tài sản có doanh thu cao" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Theo tuần/ }).click();
  await expect(
    page.getByRole("heading", { name: "Doanh thu theo tuần" }),
  ).toBeVisible();
  await expect(page.getByText("Tuần 5")).toBeVisible();

  await page.getByRole("button", { name: /Theo tháng/ }).click();
  await expect(
    page.getByRole("heading", { name: "Doanh thu theo tháng" }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("Finance can complete an investigation handoff", async ({ page }) => {
  await page.goto("/finance/investigations/FIN-INV-088");

  await page.getByRole("button", { name: "Bắt đầu điều tra" }).click();
  await page
    .getByLabel("Kết luận hoặc nội dung cần bổ sung")
    .fill("Đã khớp ledger, gateway và batch đối soát của REF-0214.");
  await page.getByRole("button", { name: "Gửi kết luận" }).click();

  await expect(
    page.getByText("Đã gửi kết luận về Customer Support."),
  ).toBeVisible();
  await expect(
    page.getByText("Đã gửi kết luận", { exact: true }),
  ).toBeVisible();
});

test("Finance override request uses a reviewed three-step flow", async ({
  page,
}) => {
  await page.goto("/finance/override-requests/new");

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page
    .getByLabel(/Lý do nghiệp vụ/)
    .fill(
      "Cần rà soát lại provider reference sau khi dữ liệu đối soát đã khóa.",
    );
  await page
    .getByLabel(/Reference bằng chứng/)
    .fill("PAY-REV-5711R\nAUD-FIN-2026-0718");
  await page.getByRole("button", { name: "Kiểm tra yêu cầu" }).click();
  await page
    .getByRole("checkbox", {
      name: /Tôi xác nhận yêu cầu chỉ đề nghị action đã chọn/,
    })
    .check();
  await page.getByRole("button", { name: "Gửi cho ADMIN duyệt" }).click();

  await expect(page).toHaveURL(/\/finance\/override-requests\/FOV-2026-/);
  await expect(page.getByText("Chờ ADMIN duyệt", { exact: true }).first()).toBeVisible();
});

test("new Finance workspaces stay usable on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/finance/investigations",
    "/finance/investigations/FIN-INV-088",
    "/finance/override-requests/new",
    "/finance/reports",
  ]) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `horizontal overflow at ${route}`).toBeLessThanOrEqual(2);
  }
});

test("finance can review a payout and switch analytical views", async ({
  page,
}) => {
  await page.goto("/finance");
  await expect(
    page.getByRole("heading", { name: "Trung tâm điều hành dòng tiền" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Mở hàng đợi chi trả/ }).click();
  await expect(page).toHaveURL(/\/finance\/settlements$/);

  await page
    .getByRole("button", { name: "Xem yêu cầu OUT-260728-001" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Kiểm tra yêu cầu OUT-260728-001",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Duyệt yêu cầu" }).click();
  await expect(
    dialog.getByRole("button", { name: "Đưa vào lệnh chi" }),
  ).toBeVisible();

  await page.goto("/finance/reports");
  await page.getByRole("button", { name: "Thanh toán" }).click();
  await expect(page.getByText("Giao dịch thành công")).toBeVisible();
});
