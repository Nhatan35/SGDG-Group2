import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("sgdg-finance-overrides-v1");
    localStorage.removeItem("sgdg-eligibility-workflow-v1");
    localStorage.removeItem("sgdg-demo-state");
  });
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill("admin.checker@sgdg.demo");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test.beforeEach(async ({ page }) => {
  await loginAdmin(page);
});

test("finance override explains its impact and decision outcome", async ({
  page,
}) => {
  await page.goto("/governance/finance-overrides/FOV-2026-001");
  await expect(
    page.getByRole("heading", {
      name: "Chuyển sang quy trình xử lý khắc phục",
    }),
  ).toBeVisible();
  await expect(page.getByText("Không bị thay đổi")).toBeVisible();
  await page
    .getByPlaceholder(
      "Nêu kết quả kiểm tra và căn cứ phê duyệt hoặc từ chối",
    )
    .fill("Đã đối chiếu bằng chứng thanh toán");
  await expect(
    page.getByRole("button", {
      name: "Phê duyệt chuyển sang xử lý khắc phục",
    }),
  ).toBeEnabled();
});

test("eligibility review explains all three decision impacts", async ({
  page,
}) => {
  await page.goto("/governance/eligibility-reviews/ELR-2026-001");
  await expect(
    page.getByRole("heading", {
      name: "Bằng chứng địa chỉ eKYC cần được kiểm tra thủ công",
    }),
  ).toBeVisible();
  await expect(page.getByText("Nếu yêu cầu bổ sung")).toBeVisible();
  await expect(page.getByText("Nếu từ chối")).toBeVisible();
  await page
    .getByPlaceholder(/Đã đối chiếu địa chỉ trên eKYC/)
    .fill("Cần Customer cung cấp giấy xác nhận địa chỉ mới");
  await expect(
    page.getByRole("button", { name: "Yêu cầu bổ sung bằng chứng" }),
  ).toBeEnabled();
});
