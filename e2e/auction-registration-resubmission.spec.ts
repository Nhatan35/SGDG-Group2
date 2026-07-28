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
const correctionDraftId = `registration-correction-draft-${registrationId}`;
const resubmissionId =
  `registration-resubmission-${registrationId}-${validationId}`;

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
    const raw = localStorage.getItem(
      "sgdg-auction-confirmed-schedules-v1",
    );
    if (!raw) throw new Error("Confirmed Schedule persistence is missing");
    const schedule = JSON.parse(raw).state.confirmedSchedules[0].schedule;
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

async function prepareCorrectableValidation(page: Page) {
  await prepareOpenRegistrationWindow(page);
  await switchToCustomer(page);
  await page.goto(`/customer/auctions/${sessionId}/registration`);
  await page
    .getByRole("button", { name: /Registration Draft$/ })
    .click();
  await page.getByRole("checkbox", { name: /accept/i }).check();
  await page.getByRole("button", { name: /Draft$/ }).click();
  await page.getByRole("button", { name: /Registration$/ }).click();
  await expect(page.getByText("SUBMITTED / v3")).toBeVisible();

  await page.evaluate(() => {
    const key = "sgdg-auction-customer-registrations-v1";
    const raw = localStorage.getItem(key);
    if (!raw)
      throw new Error("Customer Registration persistence is missing");
    const persisted = JSON.parse(raw);
    const registration = persisted.state.registrations[0];
    registration.rulesAccepted = false;
    registration.history[registration.history.length - 1].rulesAccepted =
      false;
    localStorage.setItem(key, JSON.stringify(persisted));
  });
  await page.reload();

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/customer-registrations/${registrationId}/validation`,
  );
  await page
    .getByRole("button", { name: "Validate Registration" })
    .click();
  await expect(page.getByText(validationId)).toBeVisible();
  await expect(page.getByText("Correction Required")).toBeVisible();
}

test("owning Customer creates exactly one corrected Resubmission and requires revalidation", async ({
  page,
}) => {
  await prepareCorrectableValidation(page);
  await switchToCustomer(page);
  await page.goto(
    `/customer/auctions/${sessionId}/registration/correction`,
  );
  await page
    .getByRole("button", { name: "Create Correction Draft" })
    .click();
  await page.getByRole("checkbox", { name: /accept/i }).check();
  await page
    .getByRole("button", { name: "Save Correction Draft" })
    .click();
  await expect(page.getByText("DRAFT / v2")).toBeVisible();
  await expect(
    page.getByText("Resubmission: NOT STARTED"),
  ).toBeVisible();

  const sourceBefore = await page.evaluate(() => {
    const registration = localStorage.getItem(
      "sgdg-auction-customer-registrations-v1",
    );
    const validation = localStorage.getItem(
      "sgdg-auction-registration-validations-v1",
    );
    const correction = localStorage.getItem(
      "sgdg-auction-registration-correction-drafts-v1",
    );
    if (!registration || !validation || !correction)
      throw new Error("Resubmission source persistence is missing");
    return { registration, validation, correction };
  });

  await page
    .getByRole("button", { name: "Resubmit Corrected Registration" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Confirm Corrected Registration Resubmission",
  });
  await expect(dialog).toContainText(registrationId);
  await expect(dialog).toContainText(validationId);
  await expect(dialog).toContainText(correctionDraftId);
  await expect(dialog).toContainText(
    "This creates a corrected Resubmission Record.",
  );
  await expect(dialog).toContainText(
    "The original Registration and previous Validation remain unchanged.",
  );
  await expect(dialog).toContainText(
    "Membership, Deposit, and Eligibility checks do not start.",
  );
  await dialog
    .getByRole("button", { name: "Confirm Resubmission" })
    .click();

  await expect(page.getByText("REVALIDATION_REQUIRED")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Resubmit Corrected Registration",
    }),
  ).toHaveCount(0);
  for (const name of [
    /Validate Resubmission/i,
    /Check Membership/i,
    /Check Deposit/i,
    /Evaluate Eligibility/i,
    /^Approve$/i,
    /^Reject$/i,
  ])
    await expect(page.getByRole("button", { name })).toHaveCount(0);

  const persisted = await page.evaluate(() => {
    const registration = localStorage.getItem(
      "sgdg-auction-customer-registrations-v1",
    );
    const validation = localStorage.getItem(
      "sgdg-auction-registration-validations-v1",
    );
    const correction = localStorage.getItem(
      "sgdg-auction-registration-correction-drafts-v1",
    );
    const resubmission = localStorage.getItem(
      "sgdg-auction-registration-resubmissions-v1",
    );
    if (!registration || !validation || !correction || !resubmission)
      throw new Error("Corrected Resubmission persistence is missing");
    return {
      registration,
      validation,
      correction,
      records: JSON.parse(resubmission).state.resubmissions,
    };
  });
  expect(persisted.registration).toBe(sourceBefore.registration);
  expect(persisted.validation).toBe(sourceBefore.validation);
  expect(persisted.correction).toBe(sourceBefore.correction);
  expect(persisted.records).toHaveLength(1);
  expect(persisted.records[0]).toMatchObject({
    resubmissionId,
    recordVersion: 1,
    registrationId,
    previousValidationId: validationId,
    correctionDraftId,
    correctionDraftVersion: 2,
    customerId,
    status: "SUBMITTED",
    nextStep: "REVALIDATION_REQUIRED",
    correctedEvidence: { rulesAccepted: true },
  });
  expect(persisted.records[0].correctedEvidence.rulesAcceptedAt).toBe(
    persisted.records[0].submittedAt,
  );

  await page.reload();
  await expect(page.getByText("REVALIDATION_REQUIRED")).toBeVisible();
  const recordsAfterReload = await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-registration-resubmissions-v1",
    );
    return raw ? JSON.parse(raw).state.resubmissions : [];
  });
  expect(recordsAfterReload).toHaveLength(1);

  await loginStaff(page, "content@sgdg.demo");
  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(
    page.getByText("Corrected Resubmission: SUBMITTED."),
  ).toBeVisible();
  await expect(
    page.getByText("Next Step: REVALIDATION_REQUIRED."),
  ).toBeVisible();
  await expect(page.getByText("Membership: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Deposit: NOT CHECKED.")).toBeVisible();
  await expect(page.getByText("Eligibility: NOT EVALUATED.")).toBeVisible();
});
