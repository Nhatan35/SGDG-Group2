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

test("auction operations are separated from Admin governance", async ({
  page,
}) => {
  await page.goto("/admin/auctions");
  await expect(page).toHaveURL(/\/governance\/auction-configurations$/);
  await expect(
    page.getByRole("heading", { name: /Configuration Governance/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quản lý phiên đấu giá" }),
  ).toHaveCount(0);
});

test("routine payment verification is not available to Admin", async ({ page }) => {
  await page.goto("/admin/payments");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Tổng quan Administration Service" }),
  ).toBeVisible();
});

test("customer governance separates account access from eKYC exceptions", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.removeItem("sgdg-customer-governance-v1"),
  );
  await page.goto("/admin/users");

  await expect(
    page.getByRole("heading", {
      name: "Tài khoản Customer & ngoại lệ eKYC",
    }),
  ).toBeVisible();
  await expect(page.locator(".account-management-table tbody tr")).toHaveCount(4);

  await page
    .getByLabel("Lọc tài khoản và eKYC")
    .selectOption("EXCEPTION_REVIEW");
  const pendingRow = page.locator(".account-management-table tbody tr");
  await expect(pendingRow).toHaveCount(1);
  await expect(pendingRow).toContainText("Trần Quốc Huy");

  await page
    .getByRole("button", { name: "Thẩm định ngoại lệ Trần Quốc Huy" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Lý do bắt buộc").fill("Đã đối chiếu hồ sơ VNeID");
  await dialog.getByRole("button", { name: "Xác nhận quyết định" }).click();
  await expect(page.locator(".account-management-table tbody tr")).toHaveCount(0);
  await page.getByLabel("Lọc tài khoản và eKYC").selectOption("VERIFIED");
  await expect(page.locator(".account-management-table tbody")).toContainText(
    "Trần Quốc Huy",
  );
});

test("configuration guides the maker to a different Admin checker", async ({
  page,
}) => {
  await page.goto("/admin/configurations");
  const card = page.locator(".ar-config").filter({
    hasText: "Back-office indexed fields",
  });
  await card
    .getByPlaceholder("Nhập căn cứ hoặc kết quả thẩm định")
    .fill("Tự phê duyệt");
  await card
    .getByRole("button", { name: "Chuyển sang Admin checker" })
    .click();
  await expect(page.locator(".staff-identity")).toContainText(
    "admin.checker@sgdg.demo",
  );
  const checkerCard = page.locator(".ar-config").filter({
    hasText: "Back-office indexed fields",
  });
  await checkerCard
    .getByPlaceholder("Nhập căn cứ hoặc kết quả thẩm định")
    .fill("Đã kiểm tra phạm vi masking");
  await checkerCard
    .getByRole("button", { name: "Phê duyệt & lên lịch" })
    .click();
  await expect(checkerCard).toContainText("SCHEDULED");
  await expect(checkerCard).toContainText("Đã kiểm tra phạm vi masking");
});

test("draft configuration button explains missing required fields", async ({
  page,
}) => {
  await page.goto("/admin/configurations");
  const card = page.locator(".ar-config").filter({
    hasText: "High-value refund approval",
  });
  await card.getByRole("button", { name: "Gửi phê duyệt" }).click();
  await expect(card.getByRole("alert")).toHaveText(
    "Vui lòng nhập thời điểm hiệu lực và lý do thay đổi.",
  );
});

test("the full access-request row opens the assessment detail", async ({
  page,
}) => {
  await page.goto("/admin/access-requests");
  const row = page.getByRole("link", {
    name: "Thẩm định yêu cầu AR-2026-041",
  });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(/\/admin\/access-requests\/AR-2026-041$/);
  await expect(
    page.getByRole("heading", { name: "AR-2026-041" }),
  ).toBeVisible();
});

test("role cards expose a prominent access-request action", async ({ page }) => {
  await page.goto("/admin/roles");
  await expect(page.locator(".ar-role-card")).toHaveCount(4);
  const firstAction = page
    .locator(".ar-role-card")
    .first()
    .getByRole("link", { name: /Mở hàng đợi yêu cầu quyền/ });
  await expect(firstAction).toBeVisible();
  await firstAction.click();
  await expect(page).toHaveURL(/\/admin\/access-requests$/);
});
