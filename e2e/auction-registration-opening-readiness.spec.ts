import { expect, test, type Page } from "@playwright/test";
import {
  approveCustomerSession,
  confirmedScheduleId,
  createCompleteScheduleDraft,
  loginStaff,
  sessionId,
} from "./helpers/scheduleConfirmationWorkflow";

test.setTimeout(120_000);

async function prepareConfirmedSchedule(page: Page) {
  await approveCustomerSession(page);
  await createCompleteScheduleDraft(page);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-schedules/${sessionId}`);
  await page.getByRole("button", { name: "Xác nhận Schedule" }).click();
  await page
    .getByRole("dialog", { name: "Xác nhận Schedule" })
    .getByRole("button", { name: "Confirm Schedule" })
    .click();
  await expect(
    page.getByText(confirmedScheduleId, { exact: true }),
  ).toBeVisible();
}

test("A: ADMIN explicitly reassesses from WAITING to READY without opening Registration", async ({
  page,
}) => {
  await prepareConfirmedSchedule(page);
  await page.goto(
    `/governance/auction-registration-readiness/${sessionId}`,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Registration Opening Readiness",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(confirmedScheduleId, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kiểm tra Registration Readiness" })
    .click();
  await expect(
    page.getByText("WAITING_FOR_OPEN_TIME", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("1", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-confirmed-schedules-v1",
    );
    if (!raw) throw new Error("Confirmed Schedule persistence is missing");
    const persisted = JSON.parse(raw);
    const schedule =
      persisted.state.confirmedSchedules[0].schedule;
    const open = Date.parse(schedule.registrationOpenAt);
    const close = Date.parse(schedule.registrationCloseAt);
    localStorage.setItem(
      "sgdg-registration-readiness-demo-clock",
      new Date(open + (close - open) / 2).toISOString(),
    );
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Kiểm tra Registration Readiness" })
    .click();
  await expect(
    page.getByText("READY_TO_OPEN_REGISTRATION", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  await expect(page.getByText("Registration remains NOT OPEN.")).toBeVisible();
  await expect(
    page.getByText(
      "No Customer Registration form or Publication is created.",
    ),
  ).toBeVisible();
  for (const action of [
    "Open Registration",
    "Close Registration",
    "Publish",
    "Reschedule",
    "Cancel Auction",
  ])
    await expect(page.getByRole("button", { name: action })).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem(
        "sgdg-auction-registration-opening-readiness-v1",
      ),
    )) ?? "",
  ).toContain("READY_TO_OPEN_REGISTRATION");

  await page.reload();
  await expect(
    page.getByText("READY_TO_OPEN_REGISTRATION", { exact: true }).first(),
  ).toBeVisible();
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(
    page.getByText("Registration Readiness: READY TO OPEN."),
  ).toBeVisible();
  await expect(page.getByText("Registration: NOT OPEN.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();
  await expect(page.getByText(/Publication: NOT_READY/).first()).toBeVisible();

  await loginStaff(page, "admin@sgdg.demo");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(
      `/governance/auction-registration-readiness/${sessionId}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }
});

test("B: stale confirmed authority explicitly assesses as BLOCKED", async ({
  page,
}) => {
  await prepareConfirmedSchedule(page);
  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}/content`);
  await page
    .getByLabel(/Tóm tắt phiên đấu giá/)
    .fill("Canonical evidence drift before readiness assessment.");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/auction-registration-readiness/${sessionId}`,
  );
  await page
    .getByRole("button", { name: "Kiểm tra Registration Readiness" })
    .click();
  await expect(
    page.getByText("BLOCKED", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("APPROVAL_EVIDENCE_STALE")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({
      hasText: "CONFIRMED_SCHEDULE_EVIDENCE_STALE",
    }),
  ).toBeVisible();
  await expect(page.getByText("Registration remains NOT OPEN.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Registration" }),
  ).toHaveCount(0);
});
