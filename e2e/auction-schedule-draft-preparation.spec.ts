import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const configurationId = `configuration-${sessionId}`;
const packageId = `approval-package-${sessionId}`;
const approvalReviewId = `approval-review-${packageId}`;
const decisionId = `approval-decision-${approvalReviewId}`;
const scheduleDraftId = `auction-schedule-draft-${sessionId}`;

async function loginStaff(
  page: Page,
  account: "content@sgdg.demo" | "admin@sgdg.demo",
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(account);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function approveCustomerSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page
    .locator("#purpose")
    .fill("Customer evidence for Schedule Draft preparation.");
  await page.locator("#proposedStartPrice").fill("2900000000");
  await page.locator("#declarationAccepted").check();
  await page.locator("form").getByRole("button").last().click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Accepted for governed Schedule Draft evidence.");
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
  await page.getByRole("button", { name: "Xác nhận cấu hình" }).click();
  await page
    .getByRole("dialog", { name: "Xác nhận cấu hình" })
    .getByRole("button", { name: "Xác nhận cấu hình" })
    .click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByRole("button", {
      name: "Khởi tạo nội dung phiên đấu giá",
    })
    .click();
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Complete evidence for Schedule Draft preparation.");
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

test("A: CONTENT_STAFF creates and persists a complete Schedule Draft", async ({
  page,
}) => {
  await approveCustomerSession(page);
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Approval Decision: APPROVED.")).toBeVisible();
  await expect(page.getByText("Schedule: NOT CREATED.")).toBeVisible();
  await page.getByRole("link", { name: "Chuẩn bị Schedule" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Schedule Preparation" }),
  ).toBeVisible();
  await expect(page.getByText("CURRENT", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tạo Schedule Draft" }).click();
  await expect(page.getByText("INCOMPLETE", { exact: true })).toBeVisible();
  await page.getByLabel("Timezone").fill("Asia/Ho_Chi_Minh");
  await page.getByLabel("Registration open").fill("2026-08-01T09:00");
  await page.getByLabel("Registration close").fill("2026-08-01T10:00");
  await page.getByLabel("Auction start").fill("2026-08-01T11:00");
  await page.getByLabel("Auction end").fill("2026-08-01T12:00");
  await page.getByRole("button", { name: "Lưu Schedule Draft" }).click();
  await expect(page.getByText("COMPLETE", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  await expect(page.getByText(/Registration: NOT OPEN/)).toBeVisible();
  for (const action of ["Confirm Schedule", "Open Registration", "Publish"])
    await expect(page.getByRole("button", { name: action })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("COMPLETE", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Timezone")).toHaveValue("Asia/Ho_Chi_Minh");
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-schedule-drafts-v1"),
    )) ?? "",
  ).toContain(scheduleDraftId);

  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Schedule: DRAFT.")).toBeVisible();
  await expect(page.getByText("Schedule completeness: COMPLETE.")).toBeVisible();
  await expect(page.getByText("Schedule Confirmation: NOT STARTED.")).toBeVisible();
  await expect(page.getByText("Registration: NOT OPEN.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();
  await expect(page.getByText(/Publication: NOT_READY/).first()).toBeVisible();

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`/ops/auctions/${sessionId}/schedule`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }
});

test("B: stale approved evidence blocks preparation and forged persistence", async ({
  page,
}) => {
  await approveCustomerSession(page);
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Canonical content drift after approved Decision.");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await page.goto(`/ops/auctions/${sessionId}/schedule`);
  await expect(
    page.getByText("SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạo Schedule Draft" }),
  ).toHaveCount(0);

  await page.evaluate(
    ({ draftId, targetSession }) => {
      localStorage.setItem(
        "sgdg-auction-schedule-drafts-v1",
        JSON.stringify({
          state: {
            drafts: [
              {
                scheduleDraftId: draftId,
                sessionId: targetSession,
                status: "CONFIRMED",
                publicationId: "forged-publication",
              },
            ],
          },
          version: 1,
        }),
      );
    },
    { draftId: scheduleDraftId, targetSession: sessionId },
  );
  await page.reload();
  await expect(
    page.getByText("SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE"),
  ).toBeVisible();
  await expect(page.getByText("Schedule: DRAFT")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lưu Schedule Draft" }),
  ).toHaveCount(0);
});
