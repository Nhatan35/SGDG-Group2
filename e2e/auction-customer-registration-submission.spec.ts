import { expect, test, type Page } from "@playwright/test";
import {
  approveCustomerSession,
  confirmedScheduleId,
  createCompleteScheduleDraft,
  loginStaff,
  sessionId,
} from "./helpers/scheduleConfirmationWorkflow";

test.setTimeout(120_000);

async function prepareOpenRegistrationWindow(page: Page) {
  await approveCustomerSession(page);
  await createCompleteScheduleDraft(page);
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(`/governance/auction-schedules/${sessionId}`);
  await page.getByRole("button", { name: /Schedule$/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm Schedule" })
    .click();
  await expect(
    page.getByText(confirmedScheduleId, { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const raw = localStorage.getItem("sgdg-auction-confirmed-schedules-v1");
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
  await page.goto(`/governance/auction-registration-readiness/${sessionId}`);
  await page
    .getByRole("button", { name: /Registration Readiness$/ })
    .click();
  await page.getByRole("button", { name: /Registration$/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Open Registration" })
    .click();
  await expect(page.getByText("Status: OPEN")).toBeVisible();
}

async function switchToCustomer(page: Page) {
  await page.goto("/auth/login");
  await page.locator("form").getByRole("button").click();
}

test("A: Customer creates, saves, submits, and reloads one Registration", async ({
  page,
}) => {
  await prepareOpenRegistrationWindow(page);
  await switchToCustomer(page);
  await page.goto(`/customer/auctions/${sessionId}/registration`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Auction Registration" }),
  ).toBeVisible();
  await expect(page.getByText("CUS-NMA-001")).toBeVisible();
  await page
    .getByRole("button", { name: /Registration Draft$/ })
    .click();
  await expect(page.getByText("DRAFT / v1")).toBeVisible();
  const submit = page.getByRole("button", { name: /Registration$/ });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox", { name: /accept/i }).check();
  await page.getByRole("button", { name: /Draft$/ }).click();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText("SUBMITTED / v3")).toBeVisible();
  await expect(
    page.getByText("Submitting Registration does not confirm eligibility."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Registration$/ }))
    .toHaveCount(0);

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-customer-registrations-v1",
    );
    if (!raw) throw new Error("Customer Registration persistence is missing");
    return JSON.parse(raw).state.registrations;
  });
  expect(persisted).toHaveLength(1);
  expect(persisted[0].status).toBe("SUBMITTED");
  expect(persisted[0].submissionRecord.recordVersion).toBe(1);
  expect(persisted[0]).not.toHaveProperty("membership");
  expect(persisted[0]).not.toHaveProperty("deposit");
  expect(persisted[0]).not.toHaveProperty("eligibility");
  expect(persisted[0]).not.toHaveProperty("publication");

  await page.reload();
  await expect(page.getByText("SUBMITTED / v3")).toBeVisible();

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(page.getByText("Registration Window: OPEN.")).toBeVisible();
  await expect(
    page.getByText("Customer Registration: SUBMITTED."),
  ).toBeVisible();
  await expect(page.getByText("Membership: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Deposit: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Eligibility: NOT EVALUATED.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();
  await expect(page.getByText(/Publication: NOT_READY/).first()).toBeVisible();

  await switchToCustomer(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`/customer/auctions/${sessionId}/registration`);
    await expect(page.getByText("SUBMITTED / v3")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }
});

test("B: final time revalidation blocks submission at registrationCloseAt", async ({
  page,
}) => {
  await prepareOpenRegistrationWindow(page);
  await switchToCustomer(page);
  await page.goto(`/customer/auctions/${sessionId}/registration`);
  await page
    .getByRole("button", { name: /Registration Draft$/ })
    .click();
  await page.getByRole("checkbox", { name: /accept/i }).check();
  await page.getByRole("button", { name: /Draft$/ }).click();
  await page.evaluate(() => {
    const raw = localStorage.getItem("sgdg-auction-registration-windows-v1");
    if (!raw) throw new Error("Registration Window persistence is missing");
    const close = JSON.parse(raw).state.registrationWindows[0].window
      .registrationCloseAt;
    localStorage.setItem("sgdg-registration-readiness-demo-clock", close);
  });
  await page.getByRole("button", { name: /Registration$/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "CUSTOMER_REGISTRATION_WINDOW_EXPIRED",
  );
  const registration = await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-customer-registrations-v1",
    );
    if (!raw) throw new Error("Customer Registration persistence is missing");
    return JSON.parse(raw).state.registrations[0];
  });
  expect(registration.status).toBe("DRAFT");
  expect(registration.submissionRecord).toBeUndefined();
});
