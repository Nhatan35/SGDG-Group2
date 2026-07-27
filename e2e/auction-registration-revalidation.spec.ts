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
const revalidationId = `registration-revalidation-${resubmissionId}`;

async function switchToCustomer(page: Page) {
  await page.goto("/auth/login");
  await page.locator("form").getByRole("button").click();
}

async function prepareCorrectedResubmission(page: Page) {
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
  await expect(page.getByText("Correction Required")).toBeVisible();

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
  await page
    .getByRole("button", { name: "Resubmit Corrected Registration" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm Resubmission" })
    .click();
  await expect(page.getByText("REVALIDATION_REQUIRED")).toBeVisible();
}

test("ADMIN creates one immutable VALID Revalidation and requires Membership check next", async ({
  page,
}) => {
  await prepareCorrectedResubmission(page);
  const sourceBefore = await page.evaluate(() => {
    const keys = [
      "sgdg-auction-customer-registrations-v1",
      "sgdg-auction-registration-validations-v1",
      "sgdg-auction-registration-correction-drafts-v1",
      "sgdg-auction-registration-resubmissions-v1",
    ];
    const values = keys.map((key) => localStorage.getItem(key));
    if (values.some((value) => !value))
      throw new Error("Revalidation source persistence is missing");
    return values;
  });

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/customer-registration-resubmissions/${resubmissionId}/revalidation`,
  );
  await expect(
    page.getByRole("button", {
      name: "Revalidate Corrected Registration",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(registrationId, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(validationId, { exact: true })).toBeVisible();
  await expect(
    page.getByText(correctionDraftId, { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(resubmissionId, { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Revalidate Corrected Registration",
    })
    .click();
  await expect(page.getByText("READY_FOR_MEMBERSHIP_CHECK")).toBeVisible();
  await expect(page.getByText("Ready for Membership Check")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Revalidate Corrected Registration",
    }),
  ).toHaveCount(0);

  const persisted = await page.evaluate(() => {
    const keys = [
      "sgdg-auction-customer-registrations-v1",
      "sgdg-auction-registration-validations-v1",
      "sgdg-auction-registration-correction-drafts-v1",
      "sgdg-auction-registration-resubmissions-v1",
    ];
    const sources = keys.map((key) => localStorage.getItem(key));
    const raw = localStorage.getItem(
      "sgdg-auction-registration-revalidations-v1",
    );
    if (!raw) throw new Error("Revalidation persistence is missing");
    return {
      sources,
      records: JSON.parse(raw).state.revalidations,
    };
  });
  expect(persisted.sources).toEqual(sourceBefore);
  expect(persisted.records).toHaveLength(1);
  expect(persisted.records[0]).toMatchObject({
    revalidationId,
    recordVersion: 1,
    registrationId,
    previousValidationId: validationId,
    correctionDraftId,
    correctionDraftVersion: 2,
    resubmissionId,
    customerId,
    outcome: "VALID",
    correctability: "NOT_APPLICABLE",
    nextStep: "READY_FOR_MEMBERSHIP_CHECK",
    findings: [],
    evidence: { rulesAccepted: true },
  });
  for (const key of [
    "membership",
    "deposit",
    "eligibility",
    "approval",
    "rejection",
    "publication",
  ])
    expect(persisted.records[0]).not.toHaveProperty(key);

  await page.reload();
  await expect(page.getByText(revalidationId, { exact: false })).toBeVisible();
  await expect(page.getByText("READY_FOR_MEMBERSHIP_CHECK")).toBeVisible();
  const countAfterReload = await page.evaluate(() => {
    const raw = localStorage.getItem(
      "sgdg-auction-registration-revalidations-v1",
    );
    return raw ? JSON.parse(raw).state.revalidations.length : 0;
  });
  expect(countAfterReload).toBe(1);
});
