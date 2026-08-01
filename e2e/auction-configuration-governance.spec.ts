import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

const assetId = "AST-OMEGA-SPD-001";
const sessionId = "sgdg-managed-ast-omega-spd-001-s1";
const configurationId = `configuration-${sessionId}`;
const blocker =
  "Phạm vi áp dụng phí niêm yết cho phiên SGDG-managed chưa được phê duyệt. Không thể gửi hoặc xác nhận cấu hình cho đến khi có quyết định nghiệp vụ.";
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

async function createDirectSession(page: Page) {
  await page.goto("/ops/auctions/new");
  await page.getByLabel("Tài sản").selectOption(assetId);
  await page
    .getByRole("button", { name: "Kiểm tra trạng thái tài sản" })
    .click();
  await page
    .getByRole("textbox", { name: "Mục đích đấu giá" })
    .fill("Verify final SGDG-managed fee hardening");
  await page
    .getByRole("button", { name: "Tạo bản nháp phiên đấu giá" })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận tạo bản nháp" })
    .click();
}

async function prepareSgdgConfiguration(page: Page) {
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
}

test("SGDG-managed Configuration derives the ordinary Room but blocks submission and confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await loginStaff(page, "content@sgdg.demo");
  await createDirectSession(page);
  await prepareSgdgConfiguration(page);

  await expect(page.getByText(disclaimer).first()).toBeVisible();
  await expect(page.getByText(/PRICE-BAND-ROOM-3/).first()).toBeVisible();
  await expect(page.getByText(/ROOM-3 · Phòng 3/)).toBeVisible();
  await expect(page.getByText(blocker).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Gửi xác nhận" }),
  ).toBeDisabled();
  await expect(page.getByLabel(/Room/i)).toHaveCount(0);
  await expect(page.getByLabel(/Member Title/i)).toHaveCount(0);
  await expect(page.getByLabel(/Listing Fee/i)).toHaveCount(0);
  await expect(page.getByLabel(/VIP|Event/i)).toHaveCount(0);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/ops/auctions/${sessionId}/rules`);
    await expectViewportIntegrity(page, viewport.width);
    await expect(page.getByText("BUSINESS_DECISION_REQUIRED").last()).toBeVisible();
  }

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-configurations/${configurationId}`);
  await expect(page.getByText(blocker).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm Configuration" }),
  ).toHaveCount(0);
  await expect(page.getByText(/snapshot-v/)).toHaveCount(0);

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
  await expect(page.getByText(/BUSINESS DECISION REQUIRED/)).toBeVisible();
  await expect(page.getByText(/Configuration đã xác nhận/)).toHaveCount(0);
  await expect(page.getByText("Approval Package chưa được tạo.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Schedule|Publish/i })).toHaveCount(
    0,
  );
});
