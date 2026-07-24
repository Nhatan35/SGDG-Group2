import { expect, test, type Page } from "@playwright/test";

const badEncoding = /Ã|Ä|áº|á»|Æ|â€|\u00e2\u2030\u00a0|\u00e2\u2020\u2019|�/;
async function login(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(email);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}
async function loginCustomer(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email hoặc số điện thoại").fill("customer@sgdg.demo");
  await page.getByLabel("Mật khẩu").fill("Demo@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}
async function audit(page: Page, routes: string[]) {
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    expect(text, `runtime error boundary at ${route}`).not.toContain(
      "Không thể tải dữ liệu",
    );
    expect(text, `encoding at ${route}`).not.toMatch(badEncoding);
    const broken = await page
      .locator("img")
      .evaluateAll((images) =>
        images
          .filter(
            (image) =>
              image.getAttribute("src") &&
              (!image.complete || image.naturalWidth === 0),
          )
          .map((image) => image.getAttribute("src")),
      );
    expect(broken, `broken images at ${route}`).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `horizontal overflow at ${route}`).toBeLessThanOrEqual(2);
  }
}
test("Content Staff CMS and operations pages are visually sound", async ({
  page,
}) => {
  await login(page, "content@sgdg.demo");
  await audit(page, [
    "/cms",
    "/cms/contents",
    "/cms/contents/new",
    "/cms/media",
    "/cms/categories",
    "/cms/policies",
    "/cms/faqs",
    "/cms/knowledge-base",
    "/cms/knowledge-proposals",
    "/cms/livestreams",
    "/cms/replays",
    "/cms/contents/CMS-004/edit",
    "/cms/livestreams/LIVE-CMS-01/edit",
    "/ops",
    "/ops/opening-requests",
    "/ops/auctions",
    "/ops/opening-requests/ORQ-ROYAL-OAK-001?scenario=request-under-review",
    "/ops/auctions/new",
    "/ops/auctions/royal-oak-15500st-draft?scenario=session-draft",
    "/ops/auctions/royal-oak-15500st-draft/rules?scenario=draft",
    "/ops/auctions/royal-oak-15500st-draft/schedule-publication?scenario=published",
    "/ops/live/patek-nautilus?scenario=healthy",
    "/ops/results/RES-PATEK-5711R?scenario=closed-with-top3",
    "/ops/results/RES-PATEK-5711R/candidates?scenario=rank1-active",
    "/ops/handover/HO-5711R-2026?scenario=active",
    "/ops/finance-packages/FIN-PKG-PATEK-5711R-V1",
  ]);
  await page.goto("/cms/media");
  await expect(page).toHaveScreenshot("cms-media.png", { fullPage: true });
});
test("Admin workspace pages are visually sound", async ({ page }) => {
  await audit(page, ["/admin/login"]);
  await login(page, "admin@sgdg.demo");
  await audit(page, [
    "/admin",
    "/admin/workforce",
    "/admin/access-requests",
    "/admin/access-requests/AR-2026-041",
    "/admin/roles",
    "/admin/approval-tasks",
    "/admin/approval-tasks/AT-7102",
    "/admin/workflows",
    "/admin/configurations",
    "/admin/notifications",
    "/admin/search-governance",
    "/governance/approvals",
    "/governance/content-approvals",
    "/governance/content-approvals/CMS-002",
    "/governance/approvals/APR-ROYAL-OAK-001?scenario=ready&user=admin.checker@mock.local",
    "/governance/failed-auctions/FAIL-PATEK-001?scenario=potential-failure&demo=1",
    "/governance/failed-auctions/FAIL-PATEK-001/reauction?scenario=draft&demo=1",
    "/governance/changes/CHG-ROYAL-OAK-001?scenario=pending&demo=1",
    "/governance/cancellations/CAN-ROYAL-OAK-001?scenario=requested&demo=1",
    "/governance/publication/royal-oak-15500st-draft?scenario=published&demo=1",
    "/governance/remediation/REM-PATEK-REVERSAL-001?scenario=investigating&demo=1",
    "/admin/audit",
    "/admin/reports",
    "/admin/report-snapshots",
  ]);
  await page.goto("/admin");
  await expect(page).toHaveScreenshot("admin-dashboard.png", {
    fullPage: true,
  });
});
test("Finance workspace pages are visually sound", async ({ page }) => {
  await login(page, "finance@sgdg.demo");
  await audit(page, [
    "/finance",
    "/admin/payments",
    "/finance/refunds",
    "/finance/reconciliation",
    "/finance/settlements",
    "/finance/reports",
    "/finance/investigations",
    "/finance/investigations/FIN-INV-088",
    "/ops/finance-packages/FIN-PKG-PATEK-5711R-V1",
  ]);
  await page.goto("/finance");
  await expect(page).toHaveScreenshot("finance-dashboard.png", {
    fullPage: true,
  });
});
test("Customer Support workspace pages are visually sound", async ({
  page,
}) => {
  await login(page, "support@sgdg.demo");
  await audit(page, [
    "/support",
    "/support/conversations",
    "/support/conversations/CHAT-298",
    "/support/tickets",
    "/support/tickets/TKT-2407",
    "/support/tickets/TKT-2380",
    "/support/complaints",
    "/support/complaints/CMP-173",
    "/support/disputes",
    "/support/disputes/DSP-088",
    "/support/disputes/DSP-091",
    "/support/customers",
    "/support/knowledge-gaps",
  ]);
  await page.goto("/support");
  await expect(page).toHaveScreenshot("support-dashboard.png", {
    fullPage: true,
  });
});

test("Public CMS projections and route directory are visually sound", async ({
  page,
}) => {
  await audit(page, [
    "/auctions/upcoming",
    "/news",
    "/content/huong-dan-tham-gia-dau-gia",
    "/livestreams/LIVE-CMS-01",
    "/demo",
  ]);
  await page.goto("/auctions/upcoming");
  const primaryNavigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(primaryNavigation.getByRole("link", { name: "Sắp diễn ra", exact: true })).toHaveClass(/active/);
  await expect(primaryNavigation.getByRole("link", { name: "Phiên đấu giá", exact: true })).not.toHaveClass(/active/);
});

test("Customer-facing support journeys are visually sound", async ({
  page,
}) => {
  await loginCustomer(page);
  await audit(page, [
    "/account/support",
    "/account/support/chat",
    "/account/support/tickets",
    "/account/support/tickets/new",
    "/account/support/tickets/TKT-2407",
    "/account/support/complaints/new",
  ]);
});
