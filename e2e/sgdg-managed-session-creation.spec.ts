import { expect, test, type Page } from "@playwright/test";

const assetId = "AST-OMEGA-SPD-001";
const referenceId = "ARR-AST-OMEGA-SPD-001-V3-READY";
const sessionId = "sgdg-managed-ast-omega-spd-001-s1";
const auctionCode = "SGD-DIRECT-OMEGA-SPD-001-S1";
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

test("stale Asset reconfirmation creates one persisted SGDG-managed Session", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill("content@sgdg.demo");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await page.setViewportSize(viewports[0]);
  await page.goto("/ops/auctions/new?scenario=stale-asset-version");
  await expectViewportIntegrity(page, 390);
  await expect(page.getByText(/DIRECT_SGDG/)).toBeVisible();
  await expect(page.getByText(/SGDG_MANAGED/)).toBeVisible();
  await page.getByLabel("Tài sản").selectOption(assetId);
  await page
    .getByRole("button", { name: "Kiểm tra trạng thái tài sản" })
    .click();
  await expect(page.getByText(/nguồn hiện tại là v3/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Tạo bản nháp phiên đấu giá",
    }),
  ).toHaveCount(0);

  const refresh = page.getByRole("button", {
    name: "Làm mới tham chiếu tài sản",
  });
  await refresh.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(referenceId)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Mục đích đấu giá" })
    .fill("Đấu giá tài sản sau khi Product readiness được reconfirm");

  const create = page.getByRole("button", {
    name: "Tạo bản nháp phiên đấu giá",
  });
  await create.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Tạo SGDG-managed Session Draft",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(assetId);
  await expect(dialog).toContainText(referenceId);
  await expect(dialog).toContainText("SGDG_MANAGED");
  await expect(dialog).toContainText("DRAFT · NOT_READY");
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(create).toBeFocused();

  await page.keyboard.press("Space");
  await expect(dialog).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Xác nhận tạo bản nháp",
  });
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByText(new RegExp(`Đã tạo ${sessionId}`))).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở workspace phiên" }),
  ).toHaveAttribute("href", `/ops/auctions/${sessionId}`);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/ops/auctions?q=${assetId}`);
    await expectViewportIntegrity(page, viewport.width);
    const link = page.getByRole("link", { name: auctionCode });
    await expect(link).toBeVisible();
    const row = link.locator("xpath=ancestor::tr");
    await expect(row).toContainText(assetId);
    await expect(row).toContainText("DIRECT_SGDG");
    await expect(row).toContainText("SGDG_MANAGED");
    await expect(row).toContainText("DRAFT");
    await expect(row).toContainText("NOT_READY");
    await expect(row).toContainText("SGDG-managed · Asset v3");
    await expect(row).not.toContainText("Opening Request");

    await link.click();
    await expectViewportIntegrity(page, viewport.width);
    await expect(page.getByRole("heading", { name: auctionCode })).toBeVisible();
    await expect(page.getByText(/SGDG-managed initiation/)).toBeVisible();
    await expect(page.getByText("SGDG_MANAGED")).toBeVisible();
    await expect(page.getByText(referenceId)).toBeVisible();
    await expect(page.getByText("v3", { exact: true })).toBeVisible();
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
    await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();
    await expect(page.getByText(/Chưa phê duyệt/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit for Approval" }),
    ).toHaveCount(0);
    await expect(page.getByText("Opening Request")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /APR-ROYAL-OAK-001/ }),
    ).toHaveCount(0);
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: auctionCode })).toBeVisible();
  await expect(page.getByText(referenceId)).toBeVisible();
});
