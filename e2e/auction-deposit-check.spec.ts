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
const membershipCheckId = `membership-check-${registrationId}`;
const depositCheckId = `deposit-check-${registrationId}`;

async function switchToCustomer(page: Page) {
  await page.goto("/auth/login");
  await page.locator("form").getByRole("button").click();
}

async function loginFinance(page: Page) {
  await page.goto("/admin/login");
  await page.locator('input[type="email"]').fill("finance@sgdg.demo");
  await page.locator("form").getByRole("button").click();
  await expect(page).toHaveURL(/\/finance$/);
}

async function prepareValidMembership(page: Page) {
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

  await loginStaff(page, "admin@sgdg.demo");
  await page.goto(
    `/governance/customer-registrations/${registrationId}/validation`,
  );
  await page
    .getByRole("button", { name: "Validate Registration" })
    .click();
  await expect(page.getByText("Ready for Membership Check")).toBeVisible();
  await page.goto(
    `/governance/customer-registrations/${registrationId}/membership-check`,
  );
  await page.getByRole("button", { name: "Check Membership" }).click();
  await expect(page.getByText("READY_FOR_DEPOSIT_CHECK")).toBeVisible();
}

test("FINANCE creates one SATISFIED Deposit Check while Eligibility remains not evaluated", async ({
  page,
}) => {
  await prepareValidMembership(page);
  const sourceBefore = await page.evaluate(() => {
    const keys = [
      "sgdg-auction-customer-registrations-v1",
      "sgdg-auction-registration-validations-v1",
      "sgdg-auction-membership-checks-v1",
      "sgdg-auction-sessions-v1",
    ];
    return keys.map((key) => localStorage.getItem(key));
  });

  await loginFinance(page);
  await page.goto(
    `/finance/customer-registrations/${registrationId}/deposit-check`,
  );
  await expect(page.getByText(membershipCheckId)).toBeVisible();
  await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "PROTOTYPE DEPOSIT EVIDENCE — REQUIRES STAKEHOLDER CONFIRMATION",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check Deposit" }).click();
  await expect(
    page.getByText("READY_FOR_ELIGIBILITY_EVALUATION"),
  ).toBeVisible();
  await expect(
    page.getByText("Ready for Eligibility Evaluation"),
  ).toBeVisible();
  await expect(page.getByText("Eligibility remains NOT EVALUATED.")).toBeVisible();

  const persisted = await page.evaluate(() => {
    const sourceKeys = [
      "sgdg-auction-customer-registrations-v1",
      "sgdg-auction-registration-validations-v1",
      "sgdg-auction-membership-checks-v1",
      "sgdg-auction-sessions-v1",
    ];
    const raw = localStorage.getItem("sgdg-auction-deposit-checks-v1");
    if (!raw) throw new Error("Deposit Check persistence is missing");
    return {
      sources: sourceKeys.map((key) => localStorage.getItem(key)),
      records: JSON.parse(raw).state.depositChecks,
    };
  });
  expect(persisted.sources).toEqual(sourceBefore);
  expect(persisted.records).toHaveLength(1);
  expect(persisted.records[0]).toMatchObject({
    depositCheckId,
    recordVersion: 1,
    registrationId,
    customerId,
    sessionId,
    membershipCheckId,
    outcome: "SATISFIED",
    nextStep: "READY_FOR_ELIGIBILITY_EVALUATION",
    evidence: {
      depositReference: "DEP-CUS-NMA-001-LINKED-001",
      depositStatus: "CONFIRMED",
    },
  });
  expect(persisted.records[0]).not.toHaveProperty("eligibility");
  expect(persisted.records[0]).not.toHaveProperty("paymentAmount");
  expect(persisted.records[0]).not.toHaveProperty("refund");

  await page.reload();
  await expect(
    page.getByText(depositCheckId, { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("READY_FOR_ELIGIBILITY_EVALUATION"),
  ).toBeVisible();
  const countAfterReload = await page.evaluate(() => {
    const raw = localStorage.getItem("sgdg-auction-deposit-checks-v1");
    return raw ? JSON.parse(raw).state.depositChecks.length : 0;
  });
  expect(countAfterReload).toBe(1);
});
