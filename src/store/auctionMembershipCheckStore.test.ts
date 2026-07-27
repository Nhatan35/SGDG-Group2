import { beforeEach, describe, expect, it } from "vitest";
import {
  getCustomerMembershipEvidence,
  type CustomerMembershipEvidence,
  type CustomerMembershipStatus,
} from "../services/membershipAccountReference";
import {
  prepareCorrectedValidRegistrationForMembership,
  prepareInitialValidRegistrationForMembership,
  resetMembershipCheckTestState,
} from "../test/membershipCheckTestHarness";
import { useAuctionCustomerRegistrationStore } from "./auctionCustomerRegistrationStore";
import {
  evaluateCustomerMembershipEvidence,
  getMembershipCheckId,
  sanitizePersistedAuctionMembershipCheckState,
  type CheckCustomerMembershipCommand,
  useAuctionMembershipCheckStore,
} from "./auctionMembershipCheckStore";
import { useAuctionRegistrationRevalidationStore } from "./auctionRegistrationRevalidationStore";
import { useAuctionRegistrationResubmissionStore } from "./auctionRegistrationResubmissionStore";
import { useAuctionRegistrationValidationStore } from "./auctionRegistrationValidationStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

type InitialPrepared = ReturnType<
  typeof prepareInitialValidRegistrationForMembership
>;

const commandFor = (
  prepared: InitialPrepared,
  overrides: Partial<CheckCustomerMembershipCommand> = {},
): CheckCustomerMembershipCommand => ({
  registrationId: prepared.registration.registrationId,
  actorId: "admin.membership-check@mock.local",
  actorRole: "ADMIN",
  expectedValidationSourceType: "REGISTRATION_VALIDATION",
  expectedValidationSourceId: prepared.finalValidation.validationId,
  commandId: "check-customer-membership",
  ...overrides,
});

const evidenceFor = (
  membershipStatus: CustomerMembershipStatus,
  overrides: Partial<CustomerMembershipEvidence> = {},
): CustomerMembershipEvidence => ({
  customerId: "CUS-NMA-001",
  membershipId: "MBR-CUS-NMA-001",
  membershipStatus,
  membershipValidUntil: "2027-12-31T23:59:59.999Z",
  referenceVersion: "MEMBERSHIP-MOCK-V1",
  sourceDomain: "MEMBERSHIP_ACCOUNT",
  ...overrides,
});

const evaluatedAt = "2026-07-20T12:00:00.000Z";

describe("Customer Membership Check aggregate", () => {
  beforeEach(resetMembershipCheckTestState);

  it("maps ACTIVE current Membership to VALID and READY_FOR_DEPOSIT_CHECK", () => {
    expect(
      evaluateCustomerMembershipEvidence({
        customerId: "CUS-NMA-001",
        evidence: evidenceFor("ACTIVE"),
        evaluatedAt,
      }),
    ).toEqual({
      outcome: "VALID",
      nextStep: "READY_FOR_DEPOSIT_CHECK",
      findings: [],
    });
  });

  it.each(["INACTIVE", "SUSPENDED", "EXPIRED"] as const)(
    "maps %s Membership to INVALID and MEMBERSHIP_INELIGIBLE",
    (membershipStatus) => {
      expect(
        evaluateCustomerMembershipEvidence({
          customerId: "CUS-NMA-001",
          evidence: evidenceFor(membershipStatus),
          evaluatedAt,
        }),
      ).toMatchObject({
        outcome: "INVALID",
        nextStep: "MEMBERSHIP_INELIGIBLE",
      });
    },
  );

  it("maps UNKNOWN, missing, mismatched, and inconsistent evidence to REVIEW_REQUIRED", () => {
    for (const evidence of [
      evidenceFor("UNKNOWN"),
      undefined,
      evidenceFor("ACTIVE", { customerId: "CUS-OTHER-001" }),
      evidenceFor("ACTIVE", {
        membershipValidUntil: "2025-01-01T00:00:00.000Z",
      }),
    ])
      expect(
        evaluateCustomerMembershipEvidence({
          customerId: "CUS-NMA-001",
          evidence,
          evaluatedAt,
        }),
      ).toMatchObject({
        outcome: "REVIEW_REQUIRED",
        nextStep: "MEMBERSHIP_REVIEW_REQUIRED",
      });
  });

  it("creates one immutable VALID record from the initial Validation", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    const result = useAuctionMembershipCheckStore
      .getState()
      .checkCustomerMembership(commandFor(prepared));
    expect(result).toMatchObject({
      ok: true,
      created: true,
      membershipCheck: {
        membershipCheckId: getMembershipCheckId(
          prepared.registration.registrationId,
        ),
        recordVersion: 1,
        registrationId: prepared.registration.registrationId,
        customerId: prepared.registration.customerId,
        validationSourceType: "REGISTRATION_VALIDATION",
        validationSourceId: prepared.finalValidation.validationId,
        outcome: "VALID",
        nextStep: "READY_FOR_DEPOSIT_CHECK",
        evidence: {
          membershipId: "MBR-CUS-NMA-001",
          membershipStatus: "ACTIVE",
        },
      },
    });
    if (!result.ok) throw new Error(result.message);
    expect(Object.isFrozen(result.membershipCheck)).toBe(true);
    expect(Object.isFrozen(result.membershipCheck.evidence)).toBe(true);
    expect(Object.isFrozen(result.membershipCheck.history)).toBe(true);
  });

  it.each([
    "CUSTOMER",
    "CONTENT_STAFF",
    "FINANCE",
    "CUSTOMER_SUPPORT",
  ] as const)("rejects non-ADMIN role %s", (actorRole) => {
    const prepared = prepareInitialValidRegistrationForMembership();
    expect(
      useAuctionMembershipCheckStore
        .getState()
        .checkCustomerMembership(
          commandFor(prepared, {
            actorRole,
            commandId: `membership-as-${actorRole.toLowerCase()}`,
          }),
        ),
    ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
  });

  it("rejects invalid or stale final Validation sources", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    expect(
      useAuctionMembershipCheckStore
        .getState()
        .checkCustomerMembership(
          commandFor(prepared, {
            expectedValidationSourceId: "other-validation",
            commandId: "stale-membership-validation-source",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "VALIDATION_SOURCE_MISMATCH",
    });
    useAuctionRegistrationValidationStore.setState({
      validations: [
        {
          ...prepared.finalValidation,
          outcome: "INVALID",
          correctability: "BLOCKING",
          nextStep: "INVALID_BLOCKING",
        },
      ],
    });
    expect(
      useAuctionMembershipCheckStore
        .getState()
        .checkCustomerMembership(
          commandFor(prepared, {
            commandId: "invalid-membership-validation-source",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "FINAL_VALIDATION_NOT_VALID",
    });
  });

  it("prefers the VALID Revalidation after corrected Resubmission", () => {
    const prepared = prepareCorrectedValidRegistrationForMembership();
    const result = useAuctionMembershipCheckStore
      .getState()
      .checkCustomerMembership({
        registrationId: prepared.registration.registrationId,
        actorId: "admin.membership-check@mock.local",
        actorRole: "ADMIN",
        expectedValidationSourceType: "REGISTRATION_REVALIDATION",
        expectedValidationSourceId: prepared.finalValidation.revalidationId,
        commandId: "check-corrected-customer-membership",
      });
    expect(result).toMatchObject({
      ok: true,
      membershipCheck: {
        validationSourceType: "REGISTRATION_REVALIDATION",
        validationSourceId: prepared.finalValidation.revalidationId,
        outcome: "VALID",
      },
    });
  });

  it("enforces exact Registration, Customer, and final source references", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    useAuctionCustomerRegistrationStore.setState({
      registrations: [
        { ...prepared.registration, customerId: "CUS-OTHER-001" },
      ],
    });
    expect(
      useAuctionMembershipCheckStore
        .getState()
        .checkCustomerMembership(commandFor(prepared)),
    ).toMatchObject({
      ok: false,
      code: "SOURCE_REFERENCE_MISMATCH",
    });
  });

  it("is idempotent for the same command and prevents a different duplicate", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    const store = useAuctionMembershipCheckStore.getState();
    expect(store.checkCustomerMembership(commandFor(prepared))).toMatchObject({
      ok: true,
      created: true,
    });
    expect(store.checkCustomerMembership(commandFor(prepared))).toMatchObject({
      ok: true,
      created: false,
    });
    expect(
      store.checkCustomerMembership(
        commandFor(prepared, {
          commandId: "different-membership-check",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "MEMBERSHIP_ALREADY_CHECKED",
    });
    expect(
      useAuctionMembershipCheckStore.getState().membershipChecks,
    ).toHaveLength(1);
  });

  it("leaves all sources and read-only Membership evidence unchanged", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    const before = {
      registration: JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
      validation: JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
      revalidation: JSON.stringify(
        useAuctionRegistrationRevalidationStore.getState().revalidations,
      ),
      resubmission: JSON.stringify(
        useAuctionRegistrationResubmissionStore.getState().resubmissions,
      ),
      session: JSON.stringify(useAuctionSessionStore.getState().sessions),
      membership: JSON.stringify(
        getCustomerMembershipEvidence(prepared.registration.customerId),
      ),
    };
    useAuctionMembershipCheckStore
      .getState()
      .checkCustomerMembership(commandFor(prepared));
    expect(
      JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
    ).toBe(before.registration);
    expect(
      JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
    ).toBe(before.validation);
    expect(
      JSON.stringify(
        useAuctionRegistrationRevalidationStore.getState().revalidations,
      ),
    ).toBe(before.revalidation);
    expect(
      JSON.stringify(
        useAuctionRegistrationResubmissionStore.getState().resubmissions,
      ),
    ).toBe(before.resubmission);
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      before.session,
    );
    expect(
      JSON.stringify(
        getCustomerMembershipEvidence(prepared.registration.customerId),
      ),
    ).toBe(before.membership);
  });

  it("creates no Deposit, Eligibility, approval, rejection, or Publication state", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    const result = useAuctionMembershipCheckStore
      .getState()
      .checkCustomerMembership(commandFor(prepared));
    if (!result.ok) throw new Error(result.message);
    for (const key of [
      "deposit",
      "eligibility",
      "approval",
      "rejection",
      "publication",
    ])
      expect(result.membershipCheck).not.toHaveProperty(key);
  });

  it("fails closed for malformed, mismatched, duplicate, and downstream persistence", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    const result = useAuctionMembershipCheckStore
      .getState()
      .checkCustomerMembership(commandFor(prepared));
    if (!result.ok) throw new Error(result.message);
    const valid = JSON.parse(JSON.stringify(result.membershipCheck));
    expect(
      sanitizePersistedAuctionMembershipCheckState({
        membershipChecks: [valid],
      }).membershipChecks,
    ).toHaveLength(1);
    for (const malformed of [
      { ...valid, recordVersion: 2 },
      { ...valid, outcome: "UNKNOWN" },
      { ...valid, nextStep: "READY_FOR_ELIGIBILITY" },
      { ...valid, registrationId: "other-registration" },
      { ...valid, customerId: "CUS-OTHER-001" },
      {
        ...valid,
        outcome: "VALID",
        nextStep: "READY_FOR_DEPOSIT_CHECK",
        evidence: {
          ...valid.evidence,
          membershipStatus: "INACTIVE",
        },
      },
      { ...valid, deposit: { status: "CHECKED" } },
      { ...valid, history: [] },
    ])
      expect(
        sanitizePersistedAuctionMembershipCheckState({
          membershipChecks: [malformed],
        }).membershipChecks,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionMembershipCheckState({
        membershipChecks: [valid, valid],
      }).membershipChecks,
    ).toEqual([]);
  });
});
