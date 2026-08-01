import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const sourcePurpose =
  "Nguồn Customer dành cho content foundation và phải giữ nguyên.";
const workingTitle = "Phiên đồng hồ tuyển chọn — Content Staff Draft";
const workingSummary =
  "Tóm tắt làm việc do Content Staff biên tập.\n\nChưa được xuất bản.";
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

async function resetAndCreateLinkedSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page.getByLabel("Mục đích đấu giá").fill(sourcePurpose);
  await page.getByLabel("Giá khởi điểm đề xuất").fill("480000000");
  await page.getByLabel(/Tôi xác nhận thông tin cung cấp/).check();
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Opening Request đủ điều kiện cho content foundation prototype.");
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

test("Customer content initializes, versions independently, persists, and keeps source immutable", async ({
  page,
}) => {
  await resetAndCreateLinkedSession(page);
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("NOT INITIALIZED")).toBeVisible();
  await page
    .getByRole("link", { name: "Khởi tạo hoặc mở Content workspace" })
    .click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Auction Content",
  );
  await expect(page.getByRole("note")).toContainText(
    "NOT STAKEHOLDER-APPROVED",
  );
  await page
    .getByRole("button", { name: "Khởi tạo nội dung phiên đấu giá" })
    .click();

  const sourceTitle = await page.getByLabel("Tiêu đề gốc").inputValue();
  await expect(page.getByLabel("Mục đích gốc")).toHaveValue(sourcePurpose);
  await expect(page.getByLabel("Tiêu đề gốc")).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Mục đích gốc")).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Source owner")).toHaveValue("CUS-NMA-001");
  await expect(page.getByLabel("Accepted state")).toHaveValue(
    "ACCEPTED_FOR_DRAFT",
  );

  await page.getByLabel(/Tiêu đề phiên đấu giá/).fill(workingTitle);
  await page.getByLabel(/Tóm tắt phiên đấu giá/).fill(workingSummary);
  await page.getByLabel(/Ghi chú thay đổi/).fill("Biên tập content foundation");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await expect(page.getByText(/Đã lưu Auction Content phiên bản 2/)).toBeVisible();
  await expect(page.getByText("Content v2")).toBeVisible();
  await expect(page.getByLabel("Tiêu đề gốc")).toHaveValue(sourceTitle);
  await expect(page.getByLabel("Mục đích gốc")).toHaveValue(sourcePurpose);

  await page.reload();
  await expect(page.getByLabel(/Tiêu đề phiên đấu giá/)).toHaveValue(
    workingTitle,
  );
  await expect(page.getByLabel(/Tóm tắt phiên đấu giá/)).toHaveValue(
    workingSummary,
  );
  await expect(page.getByText(/Content version/)).toContainText("v2");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expectViewportIntegrity(page, viewport.width);
    await expect(page.getByLabel(/Tiêu đề phiên đấu giá/)).toHaveValue(
      workingTitle,
    );
  }

  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("CONTENT DRAFT COMPLETE")).toBeVisible();
  await expect(page.getByText(/Content version: v2/)).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
  await expect(page.getByText("Approval Package chưa được tạo.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit for Approval" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Complete Content Review/i }),
  ).toHaveCount(0);
});

test("incomplete working summary persists as Draft with a textual finding", async ({
  page,
}) => {
  await resetAndCreateLinkedSession(page);
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByRole("button", { name: "Khởi tạo nội dung phiên đấu giá" })
    .click();
  await page.getByLabel(/Tóm tắt phiên đấu giá/).fill("");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await expect(page.getByText("AUCTION_SUMMARY_REQUIRED")).toBeVisible();
  await expect(page.getByText(/Owner: CONTENT_STAFF/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/Tóm tắt phiên đấu giá/)).toHaveValue("");
  await expect(page.getByText(/DRAFT — còn finding/)).toBeVisible();
});

test("ADMIN and CUSTOMER cannot access the internal working-content route", async ({
  page,
}) => {
  await resetAndCreateLinkedSession(page);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("button", { name: /Lưu nội dung|Lưu bản nháp/ }),
  ).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await expect(page).toHaveURL(/\/admin\/login$/);
});
