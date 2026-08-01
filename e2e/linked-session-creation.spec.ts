import { expect, test, type Page } from "@playwright/test";

const requestId = "ORQ-CUS-2026-001";
const acceptedVersion = 4;
const sessionId = "linked-orq-cus-2026-001-v4";
const auctionCode = "SGD-REQ-CUS-2026-001-V4";
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];

async function expectViewportIntegrity(page: Page, width: number) {
  await expect(page.locator("h1")).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => window.innerWidth)).toBe(width);
}

test("accepted Customer request creates one persisted linked Session", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/account/opening-requests/${requestId}`);
  await page.getByLabel("Mục đích đấu giá").fill(
    "Đề nghị SGDG tiếp nhận và tổ chức đấu giá",
  );
  await page.getByLabel("Giá khởi điểm đề xuất").fill("250000000");
  await page.getByLabel(/Tôi xác nhận thông tin cung cấp/).check();
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();
  await expect(page.getByText(`${requestId} · Phiên bản 2`)).toBeVisible();

  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill("content@sgdg.demo");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto(`/ops/opening-requests/${requestId}`);
  await page.getByRole("button", { name: "Bắt đầu review" }).click();
  await expect(
    page.getByText(
      `Đã bắt đầu review ${requestId} ở phiên bản 3.`,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept for Draft" }).click();
  await page
    .getByLabel("Căn cứ tiếp nhận")
    .fill("Hồ sơ hợp lệ để tiếp nhận cho bước chuẩn bị bản nháp.");
  await page
    .getByRole("button", { name: "Tiếp nhận để chuẩn bị" })
    .click();
  await expect(
    page.getByText(
      `Customer CUS-NMA-001 · Asset AST-CUS-WATCH-001 · phiên bản ${acceptedVersion}`,
    ),
  ).toBeVisible();

  await page.setViewportSize(viewports[0]);
  const createButton = page.getByRole("button", {
    name: "Tạo bản nháp phiên đấu giá",
  });
  await createButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Tạo bản nháp phiên đấu giá",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(requestId);
  await expect(dialog).toContainText(String(acceptedVersion));
  await expect(dialog).toContainText("AST-CUS-WATCH-001");
  await expect(dialog).toContainText("DRAFT · NOT_READY");
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(390);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(createButton).toBeFocused();

  await page.keyboard.press("Space");
  await expect(dialog).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Xác nhận tạo bản nháp",
  });
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByText(new RegExp(`Đã tạo bản nháp phiên ${sessionId}`))).toBeVisible();
  await expect(createButton).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Mở workspace phiên" }),
  ).toHaveAttribute("href", `/ops/auctions/${sessionId}`);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/ops/auctions?q=${requestId}`);
    await expectViewportIntegrity(page, viewport.width);
    const sessionLink = page.getByRole("link", { name: auctionCode });
    await expect(sessionLink).toBeVisible();
    const row = sessionLink.locator("xpath=ancestor::tr");
    await expect(row).toContainText("OPENING_REQUEST");
    await expect(row).toContainText("DRAFT");
    await expect(row).toContainText("NOT_READY");
    await expect(row).toContainText(`${requestId} · v${acceptedVersion}`);

    await sessionLink.click();
    await expectViewportIntegrity(page, viewport.width);
    await expect(page.getByRole("heading", { name: auctionCode })).toBeVisible();
    await expect(page.getByText(requestId, { exact: true })).toBeVisible();
    await expect(page.getByText(String(acceptedVersion), { exact: true })).toBeVisible();
    await expect(page.getByText(/OPENING_REQUEST/)).toBeVisible();
    await expect(page.getByText("CUSTOMER_REQUESTED")).toBeVisible();
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
    await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
    await expect(page.getByText(/Chưa phê duyệt/)).toBeVisible();
    await expect(page.getByText(/Chưa lập lịch/)).toBeVisible();
    await expect(page.getByText(/Chưa xuất bản/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit for Approval" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /APR-ROYAL-OAK-001/ }),
    ).toHaveCount(0);
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: auctionCode })).toBeVisible();
  await expect(page.getByText(requestId, { exact: true })).toBeVisible();

  await page.goto(`/account/opening-requests/${requestId}`);
  await expect(
    page.getByText(
      /Yêu cầu đã được tiếp nhận và bản nháp phiên đấu giá đã được tạo/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Phiên chưa được phê duyệt, lập lịch hoặc xuất bản/),
  ).toBeVisible();
  await expect(page.locator('a[href^="/ops"]')).toHaveCount(0);
});
