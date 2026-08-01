import { expect, test } from "@playwright/test";

test("customer deposits per auction and an unpaid live auction opens the deposit gate", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/auctions/diamond-gia/register");

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Kiểm tra điều kiện tham gia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  const ruleDeclarations = [
    "Tôi đã đọc phiên bản quy tắc hiện tại.",
    "Tôi đồng ý tuân thủ quy tắc đấu giá của phiên này.",
    "Tôi hiểu việc gửi đăng ký không đồng nghĩa điều kiện tham gia đã được phê duyệt.",
  ];
  for (const declaration of ruleDeclarations) {
    const checkbox = page.getByRole("checkbox", { name: declaration });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Kiểm tra và xác nhận đăng ký" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tiếp tục đặt cọc" }).click();

  await expect(
    page.getByRole("heading", { name: "Đặt cọc và gửi đăng ký" }),
  ).toBeVisible();
  await expect(page.getByText("Tiền cọc 10%")).toBeVisible();
  await expect(page.getByText("68.000.000 ₫")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Đặt cọc và gửi đăng ký" })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "Đặt cọc và gửi đăng ký thành công",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Đã gửi đăng ký · Đã ghi nhận tiền cọc · Đang chờ xét duyệt",
    ),
  ).toBeVisible();

  const persistedDeposit = await page.evaluate(() => {
    const raw = localStorage.getItem("sgdg-demo-state");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      amount: parsed.state.auctionDeposits["diamond-gia"],
      walletBalance: parsed.state.walletBalance,
    };
  });
  expect(persistedDeposit).toEqual({
    amount: 68_000_000,
    walletBalance: 57_000_000,
  });

  await page.goto("/auctions/rolex-126610lv/live");
  await expect(page.getByText("Chưa đặt cọc cho phiên này")).toBeVisible();
  await page.getByRole("button", { name: "Đặt giá thủ công" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Xác nhận đặt cọc để tham gia đấu giá",
    }),
  ).toBeVisible();
  await expect(page.getByText("38.000.000 ₫", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đồng ý đặt cọc" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Bạn đã đủ điều kiện tham gia đấu giá",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vào đấu giá" }).click();
  await expect(
    page.getByRole("heading", { name: "Nhập mức giá của bạn" }),
  ).toBeVisible();

  const liveDeposit = await page.evaluate(() => {
    const raw = localStorage.getItem("sgdg-demo-state");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      amount: parsed.state.auctionDeposits["rolex-126610lv"],
      walletBalance: parsed.state.walletBalance,
    };
  });
  expect(liveDeposit).toEqual({
    amount: 38_000_000,
    walletBalance: 19_000_000,
  });
});
