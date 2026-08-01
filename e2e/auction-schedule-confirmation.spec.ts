import { expect, test } from "@playwright/test";
import {
  approveCustomerSession,
  confirmedScheduleId,
  createCompleteScheduleDraft,
  decisionId,
  loginStaff,
  scheduleDraftId,
  sessionId,
} from "./helpers/scheduleConfirmationWorkflow";

test.setTimeout(120_000);

test("A: ADMIN confirms one exact complete Schedule Draft", async ({
  page,
}) => {
  await approveCustomerSession(page);
  await createCompleteScheduleDraft(page);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-schedules/${sessionId}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Schedule Confirmation" }),
  ).toBeVisible();
  await expect(page.getByText(scheduleDraftId, { exact: false })).toBeVisible();
  await expect(page.getByText(decisionId, { exact: true })).toBeVisible();
  await expect(page.getByText("COMPLETE", { exact: true })).toBeVisible();
  await expect(page.getByText("VALID", { exact: true })).toBeVisible();
  await expect(page.getByText("Asia/Ho_Chi_Minh")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  await page.getByRole("button", { name: "Xác nhận Schedule" }).click();
  const dialog = page.getByRole("dialog", { name: "Xác nhận Schedule" });
  await expect(dialog).toContainText(
    "This confirms the exact Schedule Draft version.",
  );
  await expect(dialog).toContainText("The Schedule Draft remains unchanged.");
  await expect(dialog).toContainText("Registration remains NOT OPEN.");
  await expect(dialog).toContainText("The Session remains DRAFT / NOT_READY.");
  await expect(dialog).toContainText("No Publication is created.");
  await dialog.getByRole("button", { name: "Confirm Schedule" }).click();

  await expect(
    page.getByText(confirmedScheduleId, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Status: CONFIRMED")).toBeVisible();
  await expect(page.getByText(/Registration: NOT OPEN/)).toBeVisible();
  for (const action of ["Publish", "Open Registration", "Reschedule", "Cancel"])
    await expect(page.getByRole("button", { name: action })).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-confirmed-schedules-v1"),
    )) ?? "",
  ).toContain(confirmedScheduleId);

  await page.reload();
  await expect(
    page.getByText(confirmedScheduleId, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Status: CONFIRMED")).toBeVisible();
  await expect(page.getByText(scheduleDraftId, { exact: false })).toBeVisible();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Schedule Draft: COMPLETE.")).toBeVisible();
  await expect(page.getByText("Confirmed Schedule: CONFIRMED.")).toBeVisible();
  await expect(page.getByText("Registration: NOT OPEN.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();
  await expect(page.getByText(/Publication: NOT_READY/).first()).toBeVisible();

  await loginStaff(page, "admin@sgdg.demo");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`/governance/auction-schedules/${sessionId}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }
});

test("B: stale approval evidence blocks Schedule confirmation", async ({
  page,
}) => {
  await approveCustomerSession(page);
  await createCompleteScheduleDraft(page);
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Canonical evidence drift before Schedule confirmation.");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-schedules/${sessionId}`);
  await expect(
    page.getByText("SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xác nhận Schedule" }),
  ).toHaveCount(0);
  await expect(page.getByText("Status: CONFIRMED")).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-confirmed-schedules-v1"),
    )) ?? "",
  ).not.toContain(confirmedScheduleId);
});
