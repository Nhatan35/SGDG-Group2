import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const configurationId = `configuration-${sessionId}`;
const packageId = `approval-package-${sessionId}`;
const approvalReviewId = `approval-review-${packageId}`;
const decisionId = `approval-decision-${approvalReviewId}`;

async function loginStaff(
  page: Page,
  account: "content@sgdg.demo" | "admin@sgdg.demo",
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(account);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function createSubmittedPackage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page
    .locator("#purpose")
    .fill("Customer evidence for Approval Decision.");
  await page.locator("#proposedStartPrice").fill("2900000000");
  await page.locator("#declarationAccepted").check();
  await page.locator("form").getByRole("button").last().click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Accepted for governed Approval Decision evidence.");
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
  await page.getByRole("button", { name: "Tạo đề xuất cấu hình" }).click();
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
    .fill("Complete evidence for immutable APPROVED Decision.");
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
}

async function startApprovalReview(page: Page) {
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-approval-packages/${packageId}`);
  await page.getByRole("button", { name: "Bắt đầu xem xét" }).click();
  await page
    .getByRole("dialog", { name: "Bắt đầu Approval Review" })
    .getByRole("button", { name: "Bắt đầu xem xét" })
    .click();
  await page.getByRole("link", { name: "Mở Approval Review" }).click();
}

async function driftContent(page: Page) {
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Evidence changed after Approval Review intake.");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
}

test("A: ADMIN records one immutable APPROVED Decision", async ({ page }) => {
  await createSubmittedPackage(page);
  await startApprovalReview(page);
  await expect(page.getByText("IN_REVIEW", { exact: true })).toBeVisible();
  await expect(page.getByText("CURRENT", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Phê duyệt" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Phê duyệt Approval Package",
  });
  await expect(dialog).toContainText(
    "This records an APPROVED decision for the submitted Approval Package.",
  );
  await expect(dialog).toContainText(
    "The submitted Package remains immutable.",
  );
  await expect(dialog).toContainText(
    "The Session remains DRAFT / NOT_READY.",
  );
  await expect(dialog).toContainText(
    "No Schedule or Publication is created.",
  );
  await expect(dialog).toContainText(
    "Return and Reject are not included in this task.",
  );
  await dialog.getByRole("button", { name: "Confirm Approval" }).click();
  await expect(page.getByText(decisionId).last()).toBeVisible();
  await expect(page.getByText("APPROVED", { exact: true }).first()).toBeVisible();
  for (const action of ["Return", "Reject", "Schedule", "Publish"])
    await expect(page.getByRole("button", { name: action })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(decisionId).last()).toBeVisible();

  await page.goto("/governance/auction-approval-packages");
  await expect(
    page.getByText("APPROVED_DECISION_RECORDED", { exact: true }),
  ).toBeVisible();
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Approval Package: SUBMITTED")).toBeVisible();
  await expect(page.getByText("Approval Decision: APPROVED.")).toBeVisible();
  await expect(page.getByText("Session Approval: APPROVED.")).toBeVisible();
  await expect(page.getByText("Schedule: NOT CREATED.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();

  await loginStaff(page, "admin@sgdg.demo");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(
      `/governance/auction-approval-reviews/${approvalReviewId}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }
});

test("B: stale Review evidence blocks Approve and creates no Decision", async ({
  page,
}) => {
  await createSubmittedPackage(page);
  await startApprovalReview(page);
  await driftContent(page);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/auction-approval-reviews/${approvalReviewId}`,
  );
  await page
    .getByRole("button", { name: "Kiểm tra lại evidence" })
    .click();
  await expect(page.getByText(/STALE/).first()).toBeVisible();
  await expect(
    page.getByText(/APPROVAL_REVIEW_NOT_APPROVABLE/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Phê duyệt" }),
  ).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-approval-decisions-v1"),
    )) ?? "",
  ).not.toContain(decisionId);
});
