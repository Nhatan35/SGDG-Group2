import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(email);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test("CSKH requests evidence preservation and Admin makes the decision", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("sgdg-support-demo");
    localStorage.removeItem("sgdg-demo-state");
  });

  await login(page, "support@sgdg.demo");
  await page.goto("/support/disputes/DSP-091");
  await page
    .getByPlaceholder("Ghi chú điều tra hoặc nội dung đề xuất xử lý")
    .fill("Bảo toàn log giao dịch phục vụ điều tra");
  await page
    .getByRole("button", { name: "Yêu cầu bảo toàn bằng chứng" })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(page.getByText("Đang chờ Admin phê duyệt")).toBeVisible();

  await page.getByRole("link", { name: /Đăng xuất/ }).click();
  await login(page, "admin.checker@sgdg.demo");
  await page.goto("/governance/retention-holds");
  await page
    .getByRole("button", { name: /DSP-091/ })
    .click();
  await page
    .getByPlaceholder("Nhập căn cứ phê duyệt hoặc lý do từ chối")
    .fill("Đủ căn cứ bảo toàn dữ liệu");
  await page
    .getByRole("button", { name: "Phê duyệt", exact: true })
    .click();
  await expect(page.getByText("Không có đề nghị đang chờ")).toBeVisible();
});

test("Admin requests additional eKYC information and CSKH receives the handoff", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("sgdg-customer-governance-v1");
    localStorage.removeItem("sgdg-demo-state");
  });
  await login(page, "admin.checker@sgdg.demo");
  await page.goto("/admin/users");
  await page
    .getByRole("button", { name: "Thẩm định ngoại lệ Trần Quốc Huy" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Quyết định").selectOption("REQUEST_INFO");
  await dialog
    .getByLabel("Lý do bắt buộc")
    .fill("Cần Customer bổ sung bằng chứng địa chỉ hiện tại");
  await dialog.getByRole("button", { name: "Xác nhận quyết định" }).click();

  await page.getByRole("link", { name: /Đăng xuất/ }).click();
  await login(page, "support@sgdg.demo");
  await page.goto("/support/customers");
  const customer = page.locator(".support-list-row").filter({
    hasText: "Trần Quốc Huy",
  });
  await expect(customer).toContainText("Cần CSKH hỗ trợ bổ sung");
});

test("Admin approves content and Content Staff performs publication", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("sgdg-cms-demo");
    localStorage.removeItem("sgdg-demo-state");
  });
  await login(page, "admin.checker@sgdg.demo");
  await page.goto("/governance/content-approvals/CMS-002");
  await page.getByRole("button", { name: "Phê duyệt" }).click();
  await expect(page).toHaveURL(/\/governance\/content-approvals$/);

  await page.getByRole("link", { name: /Đăng xuất/ }).click();
  await login(page, "content@sgdg.demo");
  await page.goto("/cms/contents");
  const row = page.locator("tbody tr").filter({ hasText: "CMS-002" });
  await expect(row).toContainText("Đã duyệt · chờ xuất bản");
  await row.getByTitle("Xác nhận xuất bản").click();
  await expect(row).toContainText("Đã xuất bản");
});

test("Admin approves a finance override and Finance completes execution", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("sgdg-finance-overrides-v1");
    localStorage.removeItem("sgdg-demo-state");
  });
  await login(page, "admin.checker@sgdg.demo");
  await page.goto("/governance/finance-overrides/FOV-2026-001");
  await page
    .getByPlaceholder(
      "Nêu kết quả kiểm tra và căn cứ phê duyệt hoặc từ chối",
    )
    .fill("Đã kiểm tra đủ bằng chứng và phạm vi xử lý");
  await page
    .getByRole("button", {
      name: "Phê duyệt chuyển sang xử lý khắc phục",
    })
    .click();

  await page.getByRole("link", { name: /Đăng xuất/ }).click();
  await login(page, "finance@sgdg.demo");
  await page.goto("/finance/override-requests/FOV-2026-001");
  await page
    .getByRole("button", { name: "Tiếp nhận và bắt đầu xử lý" })
    .click();
  await page
    .getByPlaceholder("Ghi kết quả đối soát hoặc mã hồ sơ khắc phục")
    .fill("Đã tạo hồ sơ khắc phục REM-001");
  await page
    .getByRole("button", { name: "Xác nhận hoàn tất xử lý" })
    .click();
  await expect(page.getByText("Đã hoàn tất xử lý")).toBeVisible();
});
