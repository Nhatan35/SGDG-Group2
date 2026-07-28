import { beforeEach, describe, expect, it } from "vitest";
import {
  prepareCorrectedRegistrationResubmission,
  resetRegistrationRevalidationTestState,
} from "../test/registrationRevalidationTestHarness";
import { useAuctionCustomerRegistrationStore } from "./auctionCustomerRegistrationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "./auctionRegistrationCorrectionDraftStore";
import {
  evaluateCorrectedRegistrationEvidence,
  getRegistrationRevalidationId,
  sanitizePersistedAuctionRegistrationRevalidationState,
  type RevalidateCorrectedRegistrationCommand,
  useAuctionRegistrationRevalidationStore,
} from "./auctionRegistrationRevalidationStore";
import { useAuctionRegistrationResubmissionStore } from "./auctionRegistrationResubmissionStore";
import { useAuctionRegistrationValidationStore } from "./auctionRegistrationValidationStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

type Prepared = ReturnType<
  typeof prepareCorrectedRegistrationResubmission
>;

const commandFor = (
  prepared: Prepared,
  overrides: Partial<RevalidateCorrectedRegistrationCommand> = {},
): RevalidateCorrectedRegistrationCommand => ({
  resubmissionId: prepared.resubmission.resubmissionId,
  actorId: "admin.registration-revalidation@mock.local",
  actorRole: "ADMIN",
  expectedRegistrationId: prepared.registration.registrationId,
  expectedPreviousValidationId: prepared.validation.validationId,
  expectedCorrectionDraftId:
    prepared.correctionDraft.correctionDraftId,
  expectedCorrectionDraftVersion:
    prepared.correctionDraft.correctionVersion,
  commandId: "revalidate-corrected-registration",
  ...overrides,
});

const revalidate = (prepared: Prepared) => {
  const result = useAuctionRegistrationRevalidationStore
    .getState()
    .revalidateCorrectedRegistration(commandFor(prepared));
  if (!result.ok) throw new Error(result.message);
  return result.revalidation;
};

describe("Corrected Registration Revalidation aggregate", () => {
  beforeEach(resetRegistrationRevalidationTestState);

  it("lets ADMIN create one immutable version-1 VALID record with exact references", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const record = revalidate(prepared);
    expect(record).toMatchObject({
      revalidationId: getRegistrationRevalidationId(
        prepared.resubmission.resubmissionId,
      ),
      recordVersion: 1,
      registrationId: prepared.registration.registrationId,
      previousValidationId: prepared.validation.validationId,
      correctionDraftId:
        prepared.correctionDraft.correctionDraftId,
      correctionDraftVersion:
        prepared.correctionDraft.correctionVersion,
      resubmissionId: prepared.resubmission.resubmissionId,
      customerId: prepared.registration.customerId,
      outcome: "VALID",
      correctability: "NOT_APPLICABLE",
      nextStep: "READY_FOR_MEMBERSHIP_CHECK",
      findings: [],
      evidence: {
        rulesAccepted: true,
        rulesAcceptedAt:
          prepared.resubmission.correctedEvidence.rulesAcceptedAt,
        resubmittedAt: prepared.resubmission.submittedAt,
      },
    });
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.findings)).toBe(true);
    expect(Object.isFrozen(record.evidence)).toBe(true);
    expect(Object.isFrozen(record.history)).toBe(true);
  });

  it.each([
    "CUSTOMER",
    "CONTENT_STAFF",
    "FINANCE",
    "CUSTOMER_SUPPORT",
  ] as const)("rejects non-ADMIN role %s", (actorRole) => {
    const prepared = prepareCorrectedRegistrationResubmission();
    expect(
      useAuctionRegistrationRevalidationStore
        .getState()
        .revalidateCorrectedRegistration(
          commandFor(prepared, {
            actorRole,
            commandId: `revalidation-as-${actorRole.toLowerCase()}`,
          }),
        ),
    ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
  });

  it("rejects missing and mismatched source chains", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    expect(
      useAuctionRegistrationRevalidationStore
        .getState()
        .revalidateCorrectedRegistration(
          commandFor(prepared, {
            expectedCorrectionDraftVersion: 99,
            commandId: "mismatched-revalidation-source",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "SOURCE_REFERENCE_MISMATCH",
    });
    useAuctionRegistrationCorrectionDraftStore.setState({
      correctionDrafts: [],
    });
    expect(
      useAuctionRegistrationRevalidationStore
        .getState()
        .revalidateCorrectedRegistration(
          commandFor(prepared, {
            commandId: "missing-revalidation-source",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "CORRECTION_DRAFT_NOT_FOUND",
    });
  });

  it("maps valid corrected evidence to READY_FOR_MEMBERSHIP_CHECK", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    expect(
      evaluateCorrectedRegistrationEvidence(prepared.resubmission),
    ).toEqual({
      outcome: "VALID",
      correctability: "NOT_APPLICABLE",
      nextStep: "READY_FOR_MEMBERSHIP_CHECK",
      findings: [],
    });
  });

  it("maps only correctable findings to CORRECTION_REQUIRED_AGAIN", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const invalid = {
      ...prepared.resubmission,
      correctedEvidence: {
        ...prepared.resubmission.correctedEvidence,
        rulesAccepted: false,
      },
    };
    expect(evaluateCorrectedRegistrationEvidence(invalid)).toMatchObject({
      outcome: "INVALID",
      correctability: "CORRECTABLE",
      nextStep: "CORRECTION_REQUIRED_AGAIN",
      findings: [
        {
          code: "CORRECTED_RULES_ACCEPTANCE_MISSING",
          severity: "CORRECTABLE",
        },
      ],
    });
  });

  it("gives blocking findings precedence and derives INVALID_BLOCKING", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const invalid = {
      ...prepared.resubmission,
      submittedAt: "",
      correctedEvidence: {
        ...prepared.resubmission.correctedEvidence,
        rulesAccepted: false,
      },
    };
    expect(evaluateCorrectedRegistrationEvidence(invalid)).toMatchObject({
      outcome: "INVALID",
      correctability: "BLOCKING",
      nextStep: "INVALID_BLOCKING",
    });
  });

  it("creates correctable and blocking records when eligible runtime evidence contains those findings", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    useAuctionRegistrationResubmissionStore.setState({
      resubmissions: [
        {
          ...prepared.resubmission,
          correctedEvidence: {
            ...prepared.resubmission.correctedEvidence,
            rulesAccepted: false,
          },
        } as unknown as typeof prepared.resubmission,
      ],
    });
    expect(
      useAuctionRegistrationRevalidationStore
        .getState()
        .revalidateCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({
      ok: true,
      revalidation: {
        outcome: "INVALID",
        correctability: "CORRECTABLE",
        nextStep: "CORRECTION_REQUIRED_AGAIN",
      },
    });

    resetRegistrationRevalidationTestState();
    const blockingPrepared =
      prepareCorrectedRegistrationResubmission();
    useAuctionRegistrationResubmissionStore.setState({
      resubmissions: [
        { ...blockingPrepared.resubmission, submittedAt: "" },
      ],
    });
    expect(
      useAuctionRegistrationRevalidationStore
        .getState()
        .revalidateCorrectedRegistration(
          commandFor(blockingPrepared, {
            commandId: "blocking-revalidation",
          }),
        ),
    ).toMatchObject({
      ok: true,
      revalidation: {
        outcome: "INVALID",
        correctability: "BLOCKING",
        nextStep: "INVALID_BLOCKING",
      },
    });
  });

  it("returns the existing result for the same command", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const store = useAuctionRegistrationRevalidationStore.getState();
    expect(
      store.revalidateCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({ ok: true, created: true });
    expect(
      store.revalidateCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({ ok: true, created: false });
    expect(
      useAuctionRegistrationRevalidationStore.getState().revalidations,
    ).toHaveLength(1);
  });

  it("prevents a different command from duplicating Revalidation", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const store = useAuctionRegistrationRevalidationStore.getState();
    store.revalidateCorrectedRegistration(commandFor(prepared));
    expect(
      store.revalidateCorrectedRegistration(
        commandFor(prepared, {
          commandId: "different-revalidation-command",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "REGISTRATION_ALREADY_REVALIDATED",
    });
    expect(
      useAuctionRegistrationRevalidationStore.getState().revalidations,
    ).toHaveLength(1);
  });

  it("does not mutate Registration, Validation, Draft, Resubmission, or Session", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const before = {
      registration: JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
      validation: JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
      draft: JSON.stringify(
        useAuctionRegistrationCorrectionDraftStore.getState()
          .correctionDrafts,
      ),
      resubmission: JSON.stringify(
        useAuctionRegistrationResubmissionStore.getState().resubmissions,
      ),
      session: JSON.stringify(useAuctionSessionStore.getState().sessions),
    };
    revalidate(prepared);
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
        useAuctionRegistrationCorrectionDraftStore.getState()
          .correctionDrafts,
      ),
    ).toBe(before.draft);
    expect(
      JSON.stringify(
        useAuctionRegistrationResubmissionStore.getState().resubmissions,
      ),
    ).toBe(before.resubmission);
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      before.session,
    );
  });

  it("creates no downstream state", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const record = revalidate(prepared);
    for (const key of [
      "membership",
      "deposit",
      "eligibility",
      "approval",
      "rejection",
      "publication",
    ])
      expect(record).not.toHaveProperty(key);
  });

  it("fails closed for malformed, mismatched, duplicate, and later-phase persistence", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const record = revalidate(prepared);
    const valid = JSON.parse(JSON.stringify(record));
    expect(
      sanitizePersistedAuctionRegistrationRevalidationState({
        revalidations: [valid],
      }).revalidations,
    ).toHaveLength(1);
    for (const malformed of [
      { ...valid, recordVersion: 2 },
      { ...valid, outcome: "UNKNOWN" },
      { ...valid, nextStep: "REVALIDATION_REQUIRED" },
      { ...valid, registrationId: "other-registration" },
      { ...valid, correctionDraftVersion: 99 },
      {
        ...valid,
        outcome: "VALID",
        correctability: "NOT_APPLICABLE",
        nextStep: "READY_FOR_MEMBERSHIP_CHECK",
        findings: [
          {
            code: "CORRECTED_RULES_ACCEPTANCE_MISSING",
            severity: "CORRECTABLE",
            message: "Invalid mapping.",
          },
        ],
      },
      { ...valid, membership: { status: "CHECKED" } },
      { ...valid, history: [] },
    ])
      expect(
        sanitizePersistedAuctionRegistrationRevalidationState({
          revalidations: [malformed],
        }).revalidations,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationRevalidationState({
        revalidations: [valid, valid],
      }).revalidations,
    ).toEqual([]);
  });
});
