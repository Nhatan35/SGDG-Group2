import { expect, type Page } from "@playwright/test";

export const requestId = "ORQ-CUS-2026-001";
export const sessionId = "linked-orq-cus-2026-001-v4";
export const configurationId = `configuration-${sessionId}`;
export const packageId = `approval-package-${sessionId}`;
export const approvalReviewId = `approval-review-${packageId}`;
export const decisionId = `approval-decision-${approvalReviewId}`;
export const scheduleDraftId = `auction-schedule-draft-${sessionId}`;
export const confirmedScheduleId = `confirmed-schedule-${sessionId}`;

export async function loginStaff(
  page: Page,
  account: "content@sgdg.demo" | "admin@sgdg.demo",
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(account);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

export async function approveCustomerSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page
    .locator("#purpose")
    .fill("Customer evidence for immutable Schedule Confirmation.");
  await page.locator("#proposedStartPrice").fill("2900000000");
  await page.locator("#declarationAccepted").check();
  await page.locator("form").getByRole("button").last().click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Accepted for governed Schedule Confirmation evidence.");
  await page
    .getByRole("button", { name: "Tiếp nhận để chuẩn bị" })
    .click();
  await page
    .getByRole("button", { name: "Tạo bản nháp phiên đấu giá" })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận tạo bản nháp" })
    .click();

  await page.goto(`/ops/auctions/${sessionId}/rules`);
  await page
    .getByRole("button", { name: "Tạo đề xuất cấu hình" })
    .click();
  await page.getByLabel("Giá khởi điểm").fill("2900000000");
  await page.getByLabel("Bước giá tối thiểu").fill("25000000");
  await page.getByLabel(/deposit policy reference/i).selectOption("DEP-STD-01");
  await page
    .getByLabel(/eligibility policy reference/i)
    .selectOption("ELG-STD-01");
  await page
    .getByLabel(/extension policy reference/i)
    .selectOption("EXT-02");
  await page
    .getByLabel(/fallback policy reference/i)
    .selectOption("FB-READONLY");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await page
    .getByRole("button", {
      name: "Resolve Auction Room and Member Listing Fee",
    })
    .click();
  await page.getByRole("button", { name: "Gửi xác nhận" }).click();

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-configurations/${configurationId}`);
  await page.getByRole("button", { name: "Confirm Configuration" }).click();
  await page
    .getByRole("dialog", { name: "Confirm Configuration" })
    .getByRole("button", { name: "Confirm Configuration" })
    .click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByRole("button", { name: "Khởi tạo nội dung phiên đấu giá" })
    .click();
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Complete evidence for immutable Schedule Confirmation.");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await page.goto(`/ops/auctions/${sessionId}/content-review`);
  await page
    .getByRole("button", { name: "Bắt đầu Content Review" })
    .click();
  await page
    .getByRole("button", { name: "Hoàn tất Content Review" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Complete Content Review" })
    .click();
  await page.goto(`/ops/auctions/${sessionId}/approval-package`);
  await page
    .getByRole("button", { name: "Chuẩn bị Approval Package" })
    .click();
  await page
    .getByRole("button", { name: "Gửi Approval Package" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit Approval Package" })
    .click();

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-approval-packages/${packageId}`);
  await page.getByRole("button", { name: "Bắt đầu xem xét" }).click();
  await page
    .getByRole("dialog", { name: "Bắt đầu Approval Review" })
    .getByRole("button", { name: "Bắt đầu xem xét" })
    .click();
  await page.getByRole("link", { name: "Mở Approval Review" }).click();
  await page.getByRole("button", { name: "Phê duyệt" }).click();
  await page
    .getByRole("dialog", { name: "Phê duyệt Approval Package" })
    .getByRole("button", { name: "Confirm Approval" })
    .click();
  await expect(page.getByText(decisionId).last()).toBeVisible();
}

export async function createCompleteScheduleDraft(page: Page) {
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/schedule`);
  await page.getByRole("button", { name: "Tạo Schedule Draft" }).click();
  await page.getByLabel("Timezone").fill("Asia/Ho_Chi_Minh");
  await page.getByLabel("Registration open").fill("2026-08-01T09:00");
  await page.getByLabel("Registration close").fill("2026-08-01T10:00");
  await page.getByLabel("Auction start").fill("2026-08-01T11:00");
  await page.getByLabel("Auction end").fill("2026-08-01T12:00");
  await page.getByRole("button", { name: "Lưu Schedule Draft" }).click();
  await expect(page.getByText("COMPLETE", { exact: true }).first()).toBeVisible();
}
