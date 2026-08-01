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

test("owning Customer creates and saves one Correction Draft without resubmitting", async ({
  page,
}) => {
  await prepareCorrectableValidation(page);
  const sourceBefore = await page.evaluate(() => {
    const registration = localStorage.getItem(
      "sgdg-auction-customer-registrations-v1",
    );
    const validation = localStorage.getItem(
      "sgdg-auction-registration-validations-v1",
    );
    if (!registration || !validation)
      throw new Error("Correction source persistence is missing");
    return { registration, validation };
  });
  await switchToCustomer(page);
  await page.goto(
    `/customer/auctions/${sessionId}/registration/correction`,
  );
  await page
    .getByRole("button", { name: "Create Correction Draft" })
    .click();
  await expect(page.getByText("DRAFT / v1")).toBeVisible();
  await page.getByRole("checkbox", { name: /accept/i }).check();
  await page
    .getByRole("button", { name: "Save Correction Draft" })
    .click();
  await expect(page.getByText("DRAFT / v2")).toBeVisible();
  await expect(
    page.getByText("This saves a correction draft only."),
  ).toBeVisible();
  await expect(
    page.getByText("Resubmission has not started."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Resubmit Corrected Registration",
    }),
  ).toBeVisible();

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
    if (!registration || !validation || !correction)
      throw new Error("Correction persistence is missing");
    return {
      registration,
      validation,
      draft: JSON.parse(correction).state.correctionDrafts[0],
      resubmission,
    };
  });
  expect(persisted.registration).toBe(sourceBefore.registration);
  expect(persisted.validation).toBe(sourceBefore.validation);
  expect(persisted.draft).toMatchObject({
    correctionDraftId,
    correctionVersion: 2,
    registrationId,
    validationId,
    status: "DRAFT",
    rulesAccepted: true,
  });
  expect(persisted.resubmission).toBeNull();

  await page.reload();
  await expect(page.getByText("DRAFT / v2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Correction Draft" }),
  ).toHaveCount(0);
});
