import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const configurationId = `configuration-${sessionId}`;
const packageId = `approval-package-${sessionId}`;
const approvalReviewId = `approval-review-${packageId}`;

async function loginStaff(
  page: Page,
  account: "content@sgdg.demo" | "admin@sgdg.demo",
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(account);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function reset(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function createCustomerSession(page: Page) {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page
    .locator("#purpose")
    .fill("Customer source for Approval Review intake.");
  await page.locator("#proposedStartPrice").fill("2900000000");
  await page.locator("#declarationAccepted").check();
  await page.locator("form").getByRole("button").last().click();
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Accepted for governed Approval Review intake.");
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

async function confirmConfiguration(page: Page) {
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
}

async function completeContentReview(page: Page) {
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByRole("button", { name: "Khởi tạo nội dung phiên đấu giá" })
    .click();
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Complete evidence for Approval Review browser intake.");
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
}

async function submitPackage(page: Page) {
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

async function prepareSubmittedPackage(page: Page) {
  await reset(page);
  await createCustomerSession(page);
  await confirmConfiguration(page);
  await completeContentReview(page);
  await submitPackage(page);
}

async function startReview(page: Page) {
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-approval-packages/${packageId}`);
  await page.getByRole("button", { name: "Bắt đầu xem xét" }).click();
  await page
    .getByRole("dialog", { name: "Bắt đầu thẩm định hồ sơ" })
    .getByRole("button", { name: "Bắt đầu xem xét" })
    .click();
}

async function driftContent(page: Page, suffix: string) {
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill(`Current content drift ${suffix}.`);
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
}

test("A: ADMIN starts one persisted Review without a decision", async ({
  page,
}) => {
  await prepareSubmittedPackage(page);
  await startReview(page);
  await expect(page.getByText("IN_REVIEW").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Bắt đầu thẩm định" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Bắt đầu thẩm định" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Thẩm định hồ sơ" }),
  ).toBeVisible();
  await expect(page.getByText(/chưa có quyết định phê duyệt/)).toBeVisible();
  for (const name of ["Approve", "Return", "Reject"])
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(approvalReviewId)).toBeVisible();
  await page.goto("/governance/auction-approval-packages");
  await expect(page.getByText("IN_REVIEW", { exact: true })).toBeVisible();
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Approval Package: SUBMITTED")).toBeVisible();
  await expect(page.getByText("Approval Decision: NOT MADE.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();
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

test("B: current-evidence drift blocks Review intake", async ({ page }) => {
  await prepareSubmittedPackage(page);
  await driftContent(page, "before intake");
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-approval-packages/${packageId}`);
  await expect(
    page.getByText(/APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu xem xét" }),
  ).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-approval-reviews-v1"),
    )) ?? "",
  ).not.toContain(approvalReviewId);
});

test("C: explicit revalidation marks an existing Review STALE", async ({
  page,
}) => {
  await prepareSubmittedPackage(page);
  await startReview(page);
  await driftContent(page, "after intake");
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/auction-approval-reviews/${approvalReviewId}`,
  );
  await page
    .getByRole("button", { name: "Kiểm tra lại bằng chứng" })
    .click();
  await expect(page.getByText(/Evidence đã được kiểm tra lại: STALE/)).toBeVisible();
  await expect(
    page.getByText("PACKAGE_EVIDENCE_STALE_AFTER_SUBMISSION"),
  ).toBeVisible();
  const packageState = await page.evaluate(() =>
    localStorage.getItem("sgdg-auction-approval-packages-v1"),
  );
  expect(packageState).toContain('"status":"SUBMITTED"');
});
