import { expect, test, type Page } from "@playwright/test";

test.setTimeout(240_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const configurationId = `configuration-${sessionId}`;
const snapshotId = `${configurationId}-snapshot-v4`;
const contentId = `auction-content-${sessionId}`;
const reviewId = `content-review-${sessionId}`;
const completionRecordId = `content-review-completion-${reviewId}`;
const packageId = `approval-package-${sessionId}`;
const submissionRecordId = `approval-package-submission-${packageId}`;
const directSessionId = "sgdg-managed-ast-omega-spd-001-s1";
const completeSummary =
  "Complete authoritative Auction Content for governed Package preparation.";
const changedSummary =
  "Changed after Package preparation and not adopted by completed Review.";
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];

async function expectViewportIntegrity(page: Page, width: number) {
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await page.evaluate(() => window.innerWidth)).toBe(width);
  expect(
    await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
}

async function loginStaff(
  page: Page,
  account: "content@sgdg.demo" | "admin@sgdg.demo",
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(account);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function resetBrowserState(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function createCustomerSession(page: Page) {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page
    .getByLabel("Mục đích đấu giá")
    .fill("Customer source purpose for Approval Package submission.");
  await page.getByLabel("Giá khởi điểm đề xuất").fill("2900000000");
  await page.getByLabel(/Tôi xác nhận thông tin cung cấp/).check();
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Accepted for governed Approval Package browser evidence.");
  await page
    .getByRole("button", { name: "Tiếp nhận để chuẩn bị" })
    .click();
  await page
    .getByRole("button", { name: "Tạo bản nháp phiên đấu giá" })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận tạo bản nháp" })
    .click();
}

async function confirmCustomerConfiguration(page: Page) {
  await page.goto(`/ops/auctions/${sessionId}/rules`);
  await page
    .getByRole("button", { name: "Tạo đề xuất cấu hình" })
    .click();
  await page.getByLabel("Giá khởi điểm").fill("2900000000");
  await page.getByLabel("Bước giá tối thiểu").fill("25000000");
  await page
    .getByLabel(/deposit policy reference/i)
    .selectOption("DEP-STD-01");
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
  await page
    .getByRole("button", { name: "Xác nhận cấu hình" })
    .click();
  await page
    .getByRole("dialog", { name: "Xác nhận cấu hình" })
    .getByRole("button", { name: "Xác nhận cấu hình" })
    .click();
  await loginStaff(page, "content@sgdg.demo");
}

async function completeCustomerContentReview(page: Page) {
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByRole("button", { name: "Khởi tạo nội dung phiên đấu giá" })
    .click();
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill(completeSummary);
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await page.goto(`/ops/auctions/${sessionId}/content-review`);
  await page
    .getByRole("button", { name: "Bắt đầu Content Review" })
    .click();
  await expect(page.getByText("CONTENT_REVIEW_READY_TO_COMPLETE")).toBeVisible();
  await page
    .getByRole("button", { name: "Hoàn tất Content Review" })
    .click();
  await page
    .getByRole("dialog", { name: "Hoàn tất Content Review" })
    .getByRole("button", { name: "Complete Content Review" })
    .click();
  await expect(page.getByText(/Completion record:/)).toBeVisible();
}

async function prepareCompletedCustomer(page: Page) {
  await resetBrowserState(page);
  await createCustomerSession(page);
  await confirmCustomerConfiguration(page);
  await completeCustomerContentReview(page);
}

async function createPackageDraft(page: Page) {
  await page.goto(`/ops/auctions/${sessionId}/approval-package`);
  await page
    .getByRole("button", { name: "Chuẩn bị Approval Package" })
    .click();
  await expect(
    page.getByRole("button", { name: "Gửi Approval Package" }),
  ).toBeVisible();
  await expect(page.getByText(/READY TO SUBMIT/)).toBeVisible();
}

async function submitPackage(page: Page) {
  await page
    .getByRole("button", { name: "Gửi Approval Package" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Gửi Approval Package",
  });
  await dialog
    .getByRole("button", { name: "Submit Approval Package" })
    .click();
  await expect(
    page.getByText("Đã gửi để ADMIN xem xét", { exact: true }),
  ).toBeVisible();
}

test("Customer prepares exact evidence, submits immutably, reloads, and preserves DRAFT / NOT_READY", async ({
  page,
}) => {
  await prepareCompletedCustomer(page);
  await createPackageDraft(page);
  await expect(page.getByText(packageId).first()).toBeVisible();
  await expect(page.getByText(contentId).first()).toBeVisible();
  await expect(page.getByText(snapshotId).first()).toBeVisible();
  await expect(page.getByText(completionRecordId).first()).toBeVisible();

  const openSubmit = page.getByRole("button", {
    name: "Gửi Approval Package",
  });
  await openSubmit.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Gửi Approval Package",
  });
  await expect(dialog).toContainText(`${packageId} · v1`);
  await expect(dialog).toContainText(`${sessionId} · v1`);
  await expect(dialog).toContainText(`${contentId} · v2`);
  await expect(dialog).toContainText(snapshotId);
  await expect(dialog).toContainText(`${reviewId} · v2`);
  await expect(dialog).toContainText(completionRecordId);
  await expect(dialog).toContainText(
    "This submits the Approval Package for ADMIN review only.",
  );
  await expect(dialog).toContainText(
    "No approval decision is made by this action.",
  );
  await expect(dialog).toContainText(
    "The Session remains DRAFT / NOT_READY.",
  );
  await expect(dialog).toContainText(
    "No Schedule or Publication is created.",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(openSubmit).toBeFocused();
  await openSubmit.click();
  await dialog
    .getByRole("button", { name: "Submit Approval Package" })
    .click();
  await expect(
    page.getByText("Đã gửi để ADMIN xem xét", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(submissionRecordId, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("AWAITING_ADMIN_REVIEW", { exact: true }),
  ).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expectViewportIntegrity(page, viewport.width);
    await expect(
      page.getByText("Đã gửi để ADMIN xem xét", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(submissionRecordId, { exact: true }),
    ).toBeVisible();
  }

  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Approval Package: SUBMITTED")).toBeVisible();
  await expect(page.getByText(/Queue: AWAITING_ADMIN_REVIEW/)).toBeVisible();
  await expect(page.getByText("Session Approval: NOT STARTED.")).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Schedule|Publish/i })).toHaveCount(
    0,
  );
});

test("ADMIN queue and detail are derived, exact, and strictly read-only", async ({
  page,
}) => {
  await prepareCompletedCustomer(page);
  await createPackageDraft(page);
  await submitPackage(page);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto("/governance/auction-approval-packages");
  await expect(page.getByText(packageId)).toHaveCount(1);
  await expect(page.getByText("AWAITING_ADMIN_REVIEW").last()).toBeVisible();
  await page
    .getByRole("link", { name: "Xem immutable package evidence" })
    .click();
  await expect(
    page.getByText(submissionRecordId),
  ).toBeVisible();
  await expect(page.getByText(completeSummary)).toBeVisible();
  await expect(page.getByText("No approval decision has been made.")).toBeVisible();
  for (const action of [/Approve/i, /Return/i, /Reject/i, /Schedule/i, /Publish/i])
    await expect(page.getByRole("button", { name: action })).toHaveCount(0);
});

test("stale Content blocks submission and creates no queue entry", async ({
  page,
}) => {
  await prepareCompletedCustomer(page);
  await createPackageDraft(page);
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page.getByLabel(/Tóm tắt phiên đấu giá/).fill(changedSummary);
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await page.goto(`/ops/auctions/${sessionId}/approval-package`);
  await page
    .getByRole("button", { name: "Gửi Approval Package" })
    .click();
  await page
    .getByRole("dialog", { name: "Gửi Approval Package" })
    .getByRole("button", { name: "Submit Approval Package" })
    .click();
  await expect(page.getByRole("alert").first()).toContainText(
    "CONTENT_REVIEW_COMPLETION_STALE",
  );
  await expect(
    page.getByRole("button", { name: "Kiểm tra và làm mới Package" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage
        .getItem("sgdg-auction-approval-packages-v1")
        ?.includes("submissionRecordId"),
    ),
  ).not.toBe(true);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto("/governance/auction-approval-packages");
  await expect(page.getByText(packageId)).toHaveCount(0);
});

test("SGDG-managed Session is blocked on workspace and direct Package route", async ({
  page,
}) => {
  await resetBrowserState(page);
  await loginStaff(page, "content@sgdg.demo");
  await page.goto("/ops/auctions/new?scenario=stale-asset-version");
  await page.getByLabel("Tài sản").selectOption("AST-OMEGA-SPD-001");
  await page
    .getByRole("button", { name: "Kiểm tra trạng thái tài sản" })
    .click();
  await page
    .getByRole("button", { name: "Làm mới tham chiếu tài sản" })
    .click();
  await page
    .getByRole("textbox", { name: "Mục đích đấu giá" })
    .fill("Preserve unresolved SGDG Listing Fee.");
  await page
    .getByRole("button", { name: "Tạo bản nháp phiên đấu giá" })
    .click();
  await page
    .getByRole("dialog", { name: "Tạo SGDG-managed Session Draft" })
    .getByRole("button", { name: "Xác nhận tạo bản nháp" })
    .click();
  await page.goto(`/ops/auctions/${directSessionId}`);
  await expect(
    page.getByText(/APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION/),
  ).toBeVisible();
  await page.goto(
    `/ops/auctions/${directSessionId}/approval-package`,
  );
  await expect(page.getByRole("alert")).toContainText(
    "APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION",
  );
  await expect(
    page.getByRole("button", { name: "Chuẩn bị Approval Package" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-approval-packages-v1"),
    ),
  ).toBeNull();
});

test("double submission produces one immutable record and one queue item", async ({
  page,
}) => {
  await prepareCompletedCustomer(page);
  await createPackageDraft(page);
  await page
    .getByRole("button", { name: "Gửi Approval Package" })
    .click();
  const submit = page
    .getByRole("dialog", { name: "Gửi Approval Package" })
    .getByRole("button", { name: "Submit Approval Package" });
  await submit.dblclick();
  await expect(
    page.getByText("Đã gửi để ADMIN xem xét", { exact: true }),
  ).toBeVisible();
  const persisted = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("sgdg-auction-approval-packages-v1") ?? "{}",
    ),
  );
  expect(persisted.state.submissionRecords).toHaveLength(1);
  expect(persisted.state.packages).toHaveLength(1);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto("/governance/auction-approval-packages");
  await expect(page.getByText(packageId)).toHaveCount(1);
});
