import { expect, test, type Page } from "@playwright/test";
import {
  approveCustomerSession,
  confirmedScheduleId,
  createCompleteScheduleDraft,
  loginStaff,
  sessionId,
} from "./helpers/scheduleConfirmationWorkflow";

test.setTimeout(120_000);

const customerId = "CUS-NMA-001";
const registrationId = `customer-registration-${sessionId}-${customerId}`;
const validationId = `registration-validation-${registrationId}`;

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

async function submitCustomerRegistration(page: Page) {
  await switchToCustomer(page);
  await page.goto(`/customer/auctions/${sessionId}/registration`);
  await page
    .getByRole("button", { name: /Registration Draft$/ })
    .click();
  await page.getByRole("checkbox", { name: /accept/i }).check();
  await page.getByRole("button", { name: /Draft$/ }).click();
  await page.getByRole("button", { name: /Registration$/ }).click();
  await expect(page.getByText("SUBMITTED / v3")).toBeVisible();
}

test("A: ADMIN validates one submitted Registration and persistence stays validation-only", async ({
  page,
}) => {
  await prepareOpenRegistrationWindow(page);
  await submitCustomerRegistration(page);

  await page.evaluate(() => {
    const raw = localStorage.getItem("sgdg-auction-registration-windows-v1");
    if (!raw) throw new Error("Registration Window persistence is missing");
    const close = JSON.parse(raw).state.registrationWindows[0].window
      .registrationCloseAt;
    localStorage.setItem(
      "sgdg-registration-readiness-demo-clock",
      new Date(Date.parse(close) + 60_000).toISOString(),
    );
  });

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/customer-registrations/${registrationId}/validation`,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Registration Validation",
    }),
  ).toBeVisible();
  await expect(page.getByText("SUBMITTED", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Validate Registration" })
    .click();
  await expect(page.getByText(validationId)).toBeVisible();
  await expect(page.getByText("VALID", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Ready for Membership Check")).toBeVisible();
  await expect(
    page.getByText("Registration remains SUBMITTED and immutable."),
  ).toBeVisible();
  await expect(
    page.getByText("Membership and Deposit checks remain NOT STARTED."),
  ).toBeVisible();
  await expect(
    page.getByText("Eligibility remains NOT EVALUATED."),
  ).toBeVisible();

  for (const name of [
    /Correct Registration/i,
    /Resubmit/i,
    /Check Membership/i,
    /Check Deposit/i,
    /Evaluate Eligibility/i,
    /^Approve$/i,
    /^Reject$/i,
  ])
    await expect(page.getByRole("button", { name })).toHaveCount(0);

  const persisted = await page.evaluate(() => {
    const validationRaw = localStorage.getItem(
      "sgdg-auction-registration-validations-v1",
    );
    const registrationRaw = localStorage.getItem(
      "sgdg-auction-customer-registrations-v1",
    );
    if (!validationRaw || !registrationRaw)
      throw new Error("Validation or Registration persistence is missing");
    return {
      validations: JSON.parse(validationRaw).state.validations,
      registrations: JSON.parse(registrationRaw).state.registrations,
    };
  });
  expect(persisted.validations).toHaveLength(1);
  expect(persisted.validations[0]).toMatchObject({
    validationId,
    recordVersion: 1,
    registrationId,
    registrationVersion: 3,
    outcome: "VALID",
    correctability: "NOT_APPLICABLE",
    nextStep: "READY_FOR_MEMBERSHIP_CHECK",
  });
  expect(persisted.registrations).toHaveLength(1);
  expect(persisted.registrations[0].status).toBe("SUBMITTED");
  for (const field of [
    "membership",
    "deposit",
    "eligibility",
    "publication",
  ]) {
    expect(persisted.validations[0]).not.toHaveProperty(field);
    expect(persisted.registrations[0]).not.toHaveProperty(field);
  }

  await page.reload();
  await expect(page.getByText(validationId)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Validate Registration" }),
  ).toHaveCount(0);

  for (const width of [390, 1440]) {
    await page.setViewportSize({
      width,
      height: width === 390 ? 844 : 1000,
    });
    await page.goto(
      `/governance/customer-registrations/${registrationId}/validation`,
    );
    await expect(page.getByText(validationId)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
  }

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(
    page.getByText("Registration Validation: VALID."),
  ).toBeVisible();
  await expect(
    page.getByText("Next Step: READY FOR MEMBERSHIP CHECK."),
  ).toBeVisible();
  await expect(page.getByText("Membership: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Deposit: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Eligibility: NOT EVALUATED.")).toBeVisible();
  await expect(page.getByText(/Session: DRAFT/).first()).toBeVisible();
  await expect(page.getByText(/Publication: NOT_READY/).first()).toBeVisible();
});

test("B: submittedAt outside the confirmed Window creates INVALID_BLOCKING only", async ({
  page,
}) => {
  await prepareOpenRegistrationWindow(page);
  await submitCustomerRegistration(page);
  await page.evaluate(() => {
    const registrationKey = "sgdg-auction-customer-registrations-v1";
    const windowKey = "sgdg-auction-registration-windows-v1";
    const registrationRaw = localStorage.getItem(registrationKey);
    const windowRaw = localStorage.getItem(windowKey);
    if (!registrationRaw || !windowRaw)
      throw new Error("Registration evidence is missing");
    const registrationState = JSON.parse(registrationRaw);
    const close = JSON.parse(windowRaw).state.registrationWindows[0].window
      .registrationCloseAt;
    const outside = new Date(Date.parse(close) + 1).toISOString();
    const registration = registrationState.state.registrations[0];
    registration.submittedAt = outside;
    registration.submissionRecord.submittedAt = outside;
    localStorage.setItem(registrationKey, JSON.stringify(registrationState));
  });

  await page.reload();
  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/customer-registrations/${registrationId}/validation`,
  );
  await page
    .getByRole("button", { name: "Validate Registration" })
    .click();
  await expect(
    page.getByText("INVALID — BLOCKING", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Invalid — Blocking Issue")).toBeVisible();
  await expect(
    page.getByText("SUBMITTED_OUTSIDE_CONFIRMED_WINDOW"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Membership/i })).toHaveCount(
    0,
  );
  const record = await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-registration-validations-v1",
    );
    if (!raw) throw new Error("Validation persistence is missing");
    return JSON.parse(raw).state.validations[0];
  });
  expect(record.nextStep).toBe("INVALID_BLOCKING");
  expect(record).not.toHaveProperty("membership");
  expect(record).not.toHaveProperty("deposit");
  expect(record).not.toHaveProperty("eligibility");

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(
    page.getByText("Registration Validation: INVALID — BLOCKING."),
  ).toBeVisible();
  await expect(page.getByText("Next Step: STOPPED.")).toBeVisible();
  await expect(page.getByText("Membership: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Deposit: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Eligibility: NOT EVALUATED.")).toBeVisible();
});
