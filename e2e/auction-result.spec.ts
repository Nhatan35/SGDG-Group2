import { expect, test } from "@playwright/test";

const resultRoute = "/me/auctions/patek-nautilus/result";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sgdg-demo-state",
      JSON.stringify({ state: { authenticated: true }, version: 0 }),
    );
  });
  await page.clock.setFixedTime(new Date("2026-07-18T15:00:00.000Z"));
});

test("candidate result prioritizes closing price, outcome, deadline and action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(resultRoute);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Patek Philippe Nautilus 5711/1R",
    }),
  ).toBeVisible();
  await expect(page.locator(".result-closing-price")).toHaveText(
    "3.500.000.000 ₫",
  );
  await expect(
    page.getByText(
      "Thứ hạng khi đóng phiên chưa phải kết quả trúng đấu giá chính thức.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByText("Candidate · Closing Rank #1")).toBeVisible();
  await expect(page.getByText("Hạn phản hồi Candidate")).toBeVisible();
  const primary = page.getByRole("link", {
    name: "Phản hồi tư cách ứng viên",
  });
  await expect(primary).toHaveAttribute(
    "href",
    /\/me\/auctions\/patek-nautilus\/candidate$/,
  );
  await expect(page.getByText("Bạn đã thắng")).toHaveCount(0);

  const priceBox = await page.locator(".result-closing-price").boundingBox();
  const outcomeBox = await page.locator(".result-user-outcome").boundingBox();
  const deadlineBox = await page.locator(".candidate-deadline").boundingBox();
  const actionBox = await primary.boundingBox();
  expect(priceBox).not.toBeNull();
  expect(outcomeBox).not.toBeNull();
  expect(deadlineBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(priceBox!.y).toBeLessThan(outcomeBox!.y);
  expect(outcomeBox!.y).toBeLessThan(deadlineBox!.y);
  expect(deadlineBox!.y).toBeLessThan(actionBox!.y);
  await expect(page.locator(".result-primary-actions .button.primary")).toHaveCount(1);
});

test("result variants do not create a false winner claim", async ({ page }) => {
  await page.goto(`${resultRoute}?scenario=not-top-3`);
  await expect(page.getByText("Bạn không thuộc Top 3 khi đóng phiên")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Phản hồi tư cách ứng viên" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Xem lịch sử bid" })).toBeVisible();

  await page.goto(`${resultRoute}?scenario=payment-ambiguous`);
  await expect(page.getByText("Đang chờ xác nhận nghĩa vụ")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Phản hồi tư cách ứng viên" }),
  ).toHaveCount(0);

  await page.goto(`${resultRoute}?scenario=top3-exhausted`);
  await expect(page.getByText("Không hình thành ứng viên hợp lệ")).toBeVisible();
  await expect(page.getByText("Bạn đã thắng")).toHaveCount(0);

  await page.goto(`${resultRoute}?scenario=cancelled`);
  await expect(page.getByText("Phiên không xác lập kết quả")).toBeVisible();
  await expect(page.locator(".result-closing-price")).toHaveCount(0);
  await expect(page.locator(".result-top-three")).toHaveCount(0);
  await expect(page.locator(".candidate-timeline")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Quay lại chi tiết phiên" }),
  ).toBeVisible();
});

test("result hierarchy remains contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(resultRoute);

  await expect(page.locator(".result-closing-price")).toBeVisible();
  await expect(page.locator(".result-user-outcome")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});
