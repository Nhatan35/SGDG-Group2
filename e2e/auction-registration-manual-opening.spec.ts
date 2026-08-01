import { expect, test, type Page } from "@playwright/test";
import {
  approveCustomerSession,
  confirmedScheduleId,
  createCompleteScheduleDraft,
  loginStaff,
  sessionId,
} from "./helpers/scheduleConfirmationWorkflow";

test.setTimeout(120_000);

async function prepareReadyAssessment(page: Page) {
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
  await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-confirmed-schedules-v1",
    );
    if (!raw) throw new Error("Confirmed Schedule persistence is missing");
    const persisted = JSON.parse(raw);
    const schedule = persisted.state.confirmedSchedules[0].schedule;
    const open = Date.parse(schedule.registrationOpenAt);
    const close = Date.parse(schedule.registrationCloseAt);
    localStorage.setItem(
      "sgdg-registration-readiness-demo-clock",
      new Date(open + (close - open) / 2).toISOString(),
    );
  });
  await page.goto(
    `/governance/auction-registration-readiness/${sessionId}`,
  );
  await page
    .getByRole("button", { name: "Kiểm tra Registration Readiness" })
    .click();
  await expect(
    page.getByText("READY_TO_OPEN_REGISTRATION", { exact: true }).first(),
  ).toBeVisible();
}

test("A: ADMIN manually opens one internal Registration Window", async ({
  page,
}) => {
  await prepareReadyAssessment(page);
  await page.getByRole("button", { name: "Mở Registration" }).click();
  const dialog = page.getByRole("dialog", { name: "Mở Registration" });
  for (const statement of [
    "This opens the internal Registration Window.",
    "It does not create Customer Registration forms.",
    "It does not publish the Auction.",
    "The Session remains DRAFT / NOT_READY.",
    "Registration closing is not included in this task.",
  ])
    await expect(dialog).toContainText(statement);
  await dialog.getByRole("button", { name: "Open Registration" }).click();

  const registrationWindowId = `registration-window-${sessionId}`;
  await expect(
    page.getByText(registrationWindowId, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Status: OPEN")).toBeVisible();
  await expect(
    page.getByText("Internal Registration Window: OPEN."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No Customer Registration form or Publication is created.",
    ),
  ).toBeVisible();
  for (const action of [
    "Close Registration",
    "Extend Registration",
    "Publish",
    "Reschedule",
    "Cancel Auction",
  ])
    await expect(page.getByRole("button", { name: action })).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-registration-windows-v1"),
    )) ?? "",
  ).toContain(registrationWindowId);

  await page.reload();
  await expect(
    page.getByText(registrationWindowId, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Status: OPEN")).toBeVisible();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Registration Window: OPEN.")).toBeVisible();
  await expect(
    page.getByText("Customer Registrations: NONE."),
  ).toBeVisible();
  await expect(page.getByText("Membership: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Deposit: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Eligibility: NOT EVALUATED.")).toBeVisible();
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

test("B: final time revalidation blocks opening outside the confirmed window", async ({
  page,
}) => {
  await prepareReadyAssessment(page);
  await page.getByRole("button", { name: "Mở Registration" }).click();
  await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-confirmed-schedules-v1",
    );
    if (!raw) throw new Error("Confirmed Schedule persistence is missing");
    const persisted = JSON.parse(raw);
    const close =
      persisted.state.confirmedSchedules[0].schedule.registrationCloseAt;
    localStorage.setItem("sgdg-registration-readiness-demo-clock", close);
  });
  const dialog = page.getByRole("dialog", { name: "Mở Registration" });
  await dialog.getByRole("button", { name: "Open Registration" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW",
  );
  await expect(page.getByText("Status: OPEN")).toHaveCount(0);
  expect(
    (await page.evaluate(() =>
      localStorage.getItem("sgdg-auction-registration-windows-v1"),
    )) ?? "",
  ).not.toContain(`registration-window-${sessionId}`);
});
