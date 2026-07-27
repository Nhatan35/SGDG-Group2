import { beforeEach, describe, expect, it } from "vitest";
import {
  getCustomerDepositEvidence,
  type CustomerDepositEvidence,
  type CustomerDepositStatus,
} from "../services/depositEvidenceReference";
import {
  prepareValidMembershipForDeposit,
  resetDepositCheckTestState,
} from "../test/depositCheckTestHarness";
import { useAuctionCustomerRegistrationStore } from "./auctionCustomerRegistrationStore";
import {
  evaluateCustomerDepositEvidence,
  getDepositCheckId,
  sanitizePersistedAuctionDepositCheckState,
  type CheckCustomerDepositCommand,
  useAuctionDepositCheckStore,
} from "./auctionDepositCheckStore";
import { useAuctionMembershipCheckStore } from "./auctionMembershipCheckStore";
import { useAuctionRegistrationValidationStore } from "./auctionRegistrationValidationStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

type Prepared = ReturnType<typeof prepareValidMembershipForDeposit>;

const commandFor = (
  prepared: Prepared,
  overrides: Partial<CheckCustomerDepositCommand> = {},
): CheckCustomerDepositCommand => ({
  registrationId: prepared.registration.registrationId,
  actorId: "finance.deposit-check@mock.local",
  actorRole: "FINANCE",
  expectedMembershipCheckId:
    prepared.membershipCheck.membershipCheckId,
  commandId: "check-customer-deposit",
  ...overrides,
});

const evidenceFor = (
  prepared: Prepared,
  depositStatus: CustomerDepositStatus,
  overrides: Partial<CustomerDepositEvidence> = {},
): CustomerDepositEvidence => ({
  registrationId: prepared.registration.registrationId,
  customerId: prepared.registration.customerId,
  sessionId: prepared.registration.sessionId,
  depositReference: "DEP-CUS-NMA-001-LINKED-001",
  depositStatus,
  confirmedAt: "2026-07-20T08:00:00.000Z",
  sourceReferenceVersion: "DEPOSIT-MOCK-V1",
  sourceDomain: "FINANCIAL_MANAGEMENT",
  ...overrides,
});

const evaluatedAt = "2026-07-20T12:00:00.000Z";

describe("Customer Deposit Check aggregate", () => {
  beforeEach(resetDepositCheckTestState);

  it("maps consistent CONFIRMED evidence to SATISFIED", () => {
    const prepared = prepareValidMembershipForDeposit();
    expect(
      evaluateCustomerDepositEvidence({
        registrationId: prepared.registration.registrationId,
        customerId: prepared.registration.customerId,
        sessionId: prepared.registration.sessionId,
        evidence: evidenceFor(prepared, "CONFIRMED"),
        evaluatedAt,
      }),
    ).toEqual({
      outcome: "SATISFIED",
      nextStep: "READY_FOR_ELIGIBILITY_EVALUATION",
      findings: [],
    });
  });

  it.each(["FAILED", "REFUNDED"] as const)(
    "maps %s evidence to NOT_SATISFIED",
    (depositStatus) => {
      const prepared = prepareValidMembershipForDeposit();
      expect(
        evaluateCustomerDepositEvidence({
          registrationId: prepared.registration.registrationId,
          customerId: prepared.registration.customerId,
          sessionId: prepared.registration.sessionId,
          evidence: evidenceFor(prepared, depositStatus),
          evaluatedAt,
        }),
      ).toMatchObject({
        outcome: "NOT_SATISFIED",
        nextStep: "DEPOSIT_NOT_SATISFIED",
      });
    },
  );

  it("maps PENDING to REVIEW_REQUIRED", () => {
    const prepared = prepareValidMembershipForDeposit();
    expect(
      evaluateCustomerDepositEvidence({
        registrationId: prepared.registration.registrationId,
        customerId: prepared.registration.customerId,
        sessionId: prepared.registration.sessionId,
        evidence: evidenceFor(prepared, "PENDING"),
        evaluatedAt,
      }),
    ).toMatchObject({
      outcome: "REVIEW_REQUIRED",
      nextStep: "DEPOSIT_REVIEW_REQUIRED",
    });
  });

  it("maps UNKNOWN, missing, mismatched, and inconsistent evidence to REVIEW_REQUIRED", () => {
    const prepared = prepareValidMembershipForDeposit();
    for (const evidence of [
      evidenceFor(prepared, "UNKNOWN"),
      undefined,
      evidenceFor(prepared, "CONFIRMED", {
        customerId: "CUS-OTHER-001",
      }),
      evidenceFor(prepared, "CONFIRMED", { confirmedAt: undefined }),
    ])
      expect(
        evaluateCustomerDepositEvidence({
          registrationId: prepared.registration.registrationId,
          customerId: prepared.registration.customerId,
          sessionId: prepared.registration.sessionId,
          evidence,
          evaluatedAt,
        }),
      ).toMatchObject({
        outcome: "REVIEW_REQUIRED",
        nextStep: "DEPOSIT_REVIEW_REQUIRED",
      });
  });

  it("creates one immutable SATISFIED record at version 1", () => {
    const prepared = prepareValidMembershipForDeposit();
    const result = useAuctionDepositCheckStore
      .getState()
      .checkCustomerDeposit(commandFor(prepared));
    expect(result).toMatchObject({
      ok: true,
      created: true,
      depositCheck: {
        depositCheckId: getDepositCheckId(
          prepared.registration.registrationId,
        ),
        recordVersion: 1,
        registrationId: prepared.registration.registrationId,
        customerId: prepared.registration.customerId,
        membershipCheckId:
          prepared.membershipCheck.membershipCheckId,
        outcome: "SATISFIED",
        nextStep: "READY_FOR_ELIGIBILITY_EVALUATION",
        evidence: {
          depositStatus: "CONFIRMED",
          depositReference: "DEP-CUS-NMA-001-LINKED-001",
        },
      },
    });
    if (!result.ok) throw new Error(result.message);
    expect(Object.isFrozen(result.depositCheck)).toBe(true);
    expect(Object.isFrozen(result.depositCheck.evidence)).toBe(true);
    expect(Object.isFrozen(result.depositCheck.history)).toBe(true);
  });

  it.each([
    "ADMIN",
    "CUSTOMER",
    "CONTENT_STAFF",
    "CUSTOMER_SUPPORT",
  ] as const)("rejects non-FINANCE role %s", (actorRole) => {
    const prepared = prepareValidMembershipForDeposit();
    expect(
      useAuctionDepositCheckStore
        .getState()
        .checkCustomerDeposit(
          commandFor(prepared, {
            actorRole,
            commandId: `deposit-as-${actorRole.toLowerCase()}`,
          }),
        ),
    ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
  });

  it("requires Membership VALID and READY_FOR_DEPOSIT_CHECK", () => {
    const prepared = prepareValidMembershipForDeposit();
    useAuctionMembershipCheckStore.setState({
      membershipChecks: [
        {
          ...prepared.membershipCheck,
          outcome: "INVALID",
          nextStep: "MEMBERSHIP_INELIGIBLE",
        },
      ],
    });
    expect(
      useAuctionDepositCheckStore
        .getState()
        .checkCustomerDeposit(commandFor(prepared)),
    ).toMatchObject({
      ok: false,
      code: "MEMBERSHIP_NOT_VALID",
    });
  });

  it("enforces exact Registration, Customer, and Membership references", () => {
    const prepared = prepareValidMembershipForDeposit();
    expect(
      useAuctionDepositCheckStore
        .getState()
        .checkCustomerDeposit(
          commandFor(prepared, {
            expectedMembershipCheckId: "other-membership-check",
            commandId: "stale-membership-for-deposit",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "SOURCE_REFERENCE_MISMATCH",
    });
    useAuctionCustomerRegistrationStore.setState({
      registrations: [
        { ...prepared.registration, customerId: "CUS-OTHER-001" },
      ],
    });
    expect(
      useAuctionDepositCheckStore
        .getState()
        .checkCustomerDeposit(
          commandFor(prepared, {
            commandId: "mismatched-customer-for-deposit",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "SOURCE_REFERENCE_MISMATCH",
    });
  });

  it("is idempotent for the same command and prevents a different duplicate", () => {
    const prepared = prepareValidMembershipForDeposit();
    const store = useAuctionDepositCheckStore.getState();
    expect(store.checkCustomerDeposit(commandFor(prepared))).toMatchObject({
      ok: true,
      created: true,
    });
    expect(store.checkCustomerDeposit(commandFor(prepared))).toMatchObject({
      ok: true,
      created: false,
    });
    expect(
      store.checkCustomerDeposit(
        commandFor(prepared, {
          commandId: "different-deposit-check",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "DEPOSIT_ALREADY_CHECKED",
    });
    expect(useAuctionDepositCheckStore.getState().depositChecks).toHaveLength(
      1,
    );
  });

  it("leaves Registration, Membership, Validation, Session, and Deposit evidence unchanged", () => {
    const prepared = prepareValidMembershipForDeposit();
    const before = {
      registration: JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
      membership: JSON.stringify(
        useAuctionMembershipCheckStore.getState().membershipChecks,
      ),
      validation: JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
      session: JSON.stringify(useAuctionSessionStore.getState().sessions),
      deposit: JSON.stringify(
        getCustomerDepositEvidence({
          registrationId: prepared.registration.registrationId,
          customerId: prepared.registration.customerId,
          sessionId: prepared.registration.sessionId,
        }),
      ),
    };
    useAuctionDepositCheckStore
      .getState()
      .checkCustomerDeposit(commandFor(prepared));
    expect(
      JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
    ).toBe(before.registration);
    expect(
      JSON.stringify(
        useAuctionMembershipCheckStore.getState().membershipChecks,
      ),
    ).toBe(before.membership);
    expect(
      JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
    ).toBe(before.validation);
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      before.session,
    );
    expect(
      JSON.stringify(
        getCustomerDepositEvidence({
          registrationId: prepared.registration.registrationId,
          customerId: prepared.registration.customerId,
          sessionId: prepared.registration.sessionId,
        }),
      ),
    ).toBe(before.deposit);
  });

  it("creates no Eligibility, approval, rejection, or Publication state", () => {
    const prepared = prepareValidMembershipForDeposit();
    const result = useAuctionDepositCheckStore
      .getState()
      .checkCustomerDeposit(commandFor(prepared));
    if (!result.ok) throw new Error(result.message);
    for (const key of [
      "eligibility",
      "approval",
      "rejection",
      "publication",
    ])
      expect(result.depositCheck).not.toHaveProperty(key);
  });

  it("fails closed for malformed, mismatched, duplicate, mutation, and downstream persistence", () => {
    const prepared = prepareValidMembershipForDeposit();
    const result = useAuctionDepositCheckStore
      .getState()
      .checkCustomerDeposit(commandFor(prepared));
    if (!result.ok) throw new Error(result.message);
    const valid = JSON.parse(JSON.stringify(result.depositCheck));
    expect(
      sanitizePersistedAuctionDepositCheckState({
        depositChecks: [valid],
      }).depositChecks,
    ).toHaveLength(1);
    for (const malformed of [
      { ...valid, recordVersion: 2 },
      { ...valid, outcome: "UNKNOWN" },
      { ...valid, nextStep: "READY_FOR_APPROVAL" },
      { ...valid, registrationId: "other-registration" },
      { ...valid, membershipCheckId: "other-membership-check" },
      {
        ...valid,
        outcome: "SATISFIED",
        nextStep: "READY_FOR_ELIGIBILITY_EVALUATION",
        evidence: { ...valid.evidence, depositStatus: "PENDING" },
      },
      { ...valid, paymentAmount: 1000 },
      { ...valid, refund: { status: "CREATED" } },
      { ...valid, eligibility: { status: "EVALUATED" } },
      { ...valid, history: [] },
    ])
      expect(
        sanitizePersistedAuctionDepositCheckState({
          depositChecks: [malformed],
        }).depositChecks,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionDepositCheckState({
        depositChecks: [valid, valid],
      }).depositChecks,
    ).toEqual([]);
  });
});
