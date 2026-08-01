import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

const requestId = "ORQ-CUS-2026-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const configurationId = `configuration-${sessionId}`;
const disclaimer =
  "LEGACY SOURCE-BASED PROTOTYPE POLICY — USER-REQUESTED IMPLEMENTATION — NOT CURRENT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";
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

async function createLinkedCustomerSession(page: Page) {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page
    .getByLabel("Mục đích đấu giá")
    .fill("Customer-requested final hardening evidence");
  await page.getByLabel("Giá khởi điểm đề xuất").fill("2900000000");
  await page.getByLabel(/Tôi xác nhận thông tin cung cấp/).check();
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Current Customer and Membership reference are eligible.");
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

test("Customer-requested Configuration resolves, submits, confirms once, and remains DRAFT / NOT_READY", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await createLinkedCustomerSession(page);

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

  await expect(page.getByText(disclaimer).first()).toBeVisible();
  await expect(page.getByText("MEMBERSHIP-MOCK-V1")).toBeVisible();
  await expect(page.getByText("VANG")).toBeVisible();
  await expect(page.getByText(/30\.000/).first()).toBeVisible();
  await expect(page.getByText(/PRICE-BAND-ROOM-3/).first()).toBeVisible();
  await expect(page.getByText(/ROOM-3 · Phòng 3/)).toBeVisible();
  await expect(page.getByText("OUT_OF_CURRENT_CONFIGURATION_SCOPE").first()).toBeVisible();
  await page.getByRole("button", { name: "Gửi xác nhận" }).click();
  await expect(page.getByText("SUBMITTED", { exact: true })).toBeVisible();

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-configurations/${configurationId}`);
  const opener = page.getByRole("button", { name: "Confirm Configuration" });
  await expect(opener).toBeEnabled();
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Confirm Configuration" });
  await expect(dialog).toContainText("MEMBERSHIP-MOCK-V1");
  await expect(dialog).toContainText("VANG");
  await expect(dialog).toContainText("30.000");
  await expect(dialog).toContainText("This confirms Configuration only.");
  await expect(dialog).toContainText("The Session remains DRAFT / NOT_READY.");
  await expect(dialog).toContainText(
    "No Approval Package, Schedule or Publication is created.",
  );
  await dialog
    .getByRole("button", { name: "Confirm Configuration" })
    .click();
  await expect(page.getByText(/immutable snapshot/)).toBeVisible();
  await expect(page.getByText(/snapshot-v4/).first()).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/governance/auction-configurations/${configurationId}`);
    await expectViewportIntegrity(page, viewport.width);
    await expect(page.getByText(/snapshot-v4/).first()).toBeVisible();
  }

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText(/Configuration đã xác nhận/)).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
  await expect(page.getByText("Approval Package chưa được tạo.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Schedule|Publish/i })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByText(/Configuration đã xác nhận/)).toBeVisible();
});
