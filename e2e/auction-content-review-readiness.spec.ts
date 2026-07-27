import { expect, test, type Page } from "@playwright/test";

test.setTimeout(180_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const configurationId = `configuration-${sessionId}`;
const snapshotId = `${configurationId}-snapshot-v4`;
const directSessionId = "sgdg-managed-ast-omega-spd-001-s1";
const correctedSummary =
  "Corrected Auction Content summary adopted only by explicit revalidation.";
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
    .fill("Customer source purpose for Content Review readiness.");
  await page.getByLabel("Giá khởi điểm đề xuất").fill("2900000000");
  await page.getByLabel(/Tôi xác nhận thông tin cung cấp/).check();
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Accepted for authoritative Content Review browser evidence.");
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
    .getByRole("button", { name: "Confirm Configuration" })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm Configuration" })
    .getByRole("button", { name: "Confirm Configuration" })
    .click();
  await loginStaff(page, "content@sgdg.demo");
}

async function initializeIncompleteContent(page: Page) {
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByRole("button", { name: "Khởi tạo nội dung phiên đấu giá" })
    .click();
  await page.getByLabel(/Tóm tắt phiên đấu giá/).fill("");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await expect(page.getByText("AUCTION_SUMMARY_REQUIRED")).toBeVisible();
}

async function prepareCustomerReview(page: Page) {
  await resetBrowserState(page);
  await createCustomerSession(page);
  await confirmCustomerConfiguration(page);
  await initializeIncompleteContent(page);
  await page.goto(`/ops/auctions/${sessionId}/content-review`);
  await page
    .getByRole("button", { name: "Bắt đầu Content Review" })
    .click();
  await expect(page.getByText("AUCTION_SUMMARY_REQUIRED")).toBeVisible();
}

test("Customer correction, explicit revalidation, immutable completion, reload, and Session projection", async ({
  page,
}) => {
  await prepareCustomerReview(page);
  const correction = page.getByRole("link", {
    name: "Mở Auction Content để chỉnh sửa auctionSummary",
  });
  await expect(correction).toHaveAttribute(
    "href",
    `/ops/auctions/${sessionId}/content`,
  );
  await correction.click();
  await page.getByLabel(/Tóm tắt phiên đấu giá/).fill(correctedSummary);
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.getByText(/phiên bản 3/)).toBeVisible();

  await page.goto(`/ops/auctions/${sessionId}/content-review`);
  await expect(page.getByRole("alert")).toContainText(
    "Review đang giữ Content v2; current Content là v3",
  );
  await expect(
    page.getByRole("button", { name: "Hoàn tất Content Review" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kiểm tra lại Session Package" })
    .click();
  await expect(page.getByText("CONTENT_REVIEW_READY_TO_COMPLETE")).toBeVisible();
  await expect(page.getByText("AUCTION_SUMMARY_REQUIRED")).toHaveCount(0);

  const openComplete = page.getByRole("button", {
    name: "Hoàn tất Content Review",
  });
  await openComplete.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Hoàn tất Content Review",
  });
  await expect(dialog).toContainText(`${sessionId} · v1`);
  await expect(dialog).toContainText(
    `auction-content-${sessionId} · v3`,
  );
  await expect(dialog).toContainText(snapshotId);
  await expect(dialog).toContainText("This completes Content Review only.");
  await expect(dialog).toContainText(
    "No Approval Package is created or submitted.",
  );
  await expect(dialog).toContainText(
    "PROTOTYPE CONTENT MODEL — USER-REQUESTED IMPLEMENTATION",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(openComplete).toBeFocused();
  await openComplete.click();
  await dialog
    .getByRole("button", { name: "Complete Content Review" })
    .click();
  await expect(page.getByText(/Completion record:/)).toBeVisible();
  await expect(
    page.getByText("Ready for Approval Package preparation").first(),
  ).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expectViewportIntegrity(page, viewport.width);
    await expect(
      page.getByText("Completion record", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Ready for Approval Package preparation").first(),
    ).toBeVisible();
  }

  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Ready for Approval Package preparation/),
  ).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
  await expect(page.getByText(/Approval Package: NOT CREATED/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit for Approval" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Schedule|Publish/i })).toHaveCount(
    0,
  );
});

test("SGDG-managed Session is blocked by Configuration on workspace and direct route", async ({
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
    .getByRole("button", {
      name: "Tạo bản nháp phiên đấu giá",
    })
    .click();
  await page
    .getByRole("dialog", { name: "Tạo SGDG-managed Session Draft" })
    .getByRole("button", { name: "Xác nhận tạo bản nháp" })
    .click();

  await page.goto(`/ops/auctions/${directSessionId}`);
  await expect(page.getByText(/CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION/)).toBeVisible();
  await expect(page.getByText(/Session Package: NOT READY/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu Content Review" }),
  ).toHaveCount(0);
  await page.goto(`/ops/auctions/${directSessionId}/content-review`);
  await expect(page.getByRole("alert")).toContainText(
    "CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Phiên SGDG-managed chưa có cấu hình hiện hành được xác nhận.",
  );
  await expect(
    page.getByRole("button", { name: "Bắt đầu Content Review" }),
  ).toHaveCount(0);
  const persisted = await page.evaluate(() =>
    localStorage.getItem("sgdg-auction-content-reviews-v1"),
  );
  expect(persisted ?? "").not.toContain("content-review-sgdg-managed");
});

test("changed Content cannot complete with old review evidence and is adopted only by explicit revalidation", async ({
  page,
}) => {
  await prepareCustomerReview(page);
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page.getByLabel(/Tóm tắt phiên đấu giá/).fill(correctedSummary);
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await page.goto(`/ops/auctions/${sessionId}/content-review`);
  await expect(page.getByRole("alert")).toContainText(
    "Review đang giữ Content v2; current Content là v3",
  );
  await expect(
    page.getByRole("button", { name: "Hoàn tất Content Review" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage
        .getItem("sgdg-auction-content-reviews-v1")
        ?.includes("completionRecordId"),
    ),
  ).not.toBe(true);
  await page
    .getByRole("button", { name: "Kiểm tra lại Session Package" })
    .click();
  await expect(page.getByText("CONTENT_REVIEW_READY_TO_COMPLETE")).toBeVisible();
  await expect(page.getByText(/Last evaluated Content/).locator("..")).toContainText(
    "v3",
  );
});

test("missing current Configuration after persisted review fails closed and exposes no completion action", async ({
  page,
}) => {
  await prepareCustomerReview(page);
  await page.evaluate(() => {
    const key = "sgdg-auction-configurations-v1";
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      state?: { snapshots?: unknown[] };
    };
    if (parsed.state) parsed.state.snapshots = [];
    localStorage.setItem(key, JSON.stringify(parsed));
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "CONFIGURATION_SNAPSHOT_MISSING",
  );
  await expect(
    page.getByRole("button", { name: "Hoàn tất Content Review" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Completion record:/),
  ).toHaveCount(0);
});
