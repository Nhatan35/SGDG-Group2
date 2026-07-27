import { beforeEach, describe, expect, it } from "vitest";
import {
  prepareOpenRegistrationWindow,
} from "../test/customerRegistrationTestHarness";
import {
  prepareSubmittedCustomerRegistration,
  resetRegistrationValidationTestState,
} from "../test/registrationValidationTestHarness";
import { useAuctionCustomerRegistrationStore } from "./auctionCustomerRegistrationStore";
import { useAuctionRegistrationWindowStore } from "./auctionRegistrationWindowStore";
import {
  evaluateRegistrationValidation,
  getCustomerRegistrationSubmissionRecordId,
  sanitizePersistedAuctionRegistrationValidationState,
  useAuctionRegistrationValidationStore,
  type ValidateCustomerRegistrationCommand,
} from "./auctionRegistrationValidationStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
} from "./openingRequestStore";
import { useAssetReadinessStore } from "./assetReadinessStore";

const commandFor = (
  prepared: ReturnType<typeof prepareSubmittedCustomerRegistration>,
  overrides: Partial<ValidateCustomerRegistrationCommand> = {},
): ValidateCustomerRegistrationCommand => ({
  registrationId: prepared.registration.registrationId,
  actorId: "admin.registration-validation@mock.local",
  actorRole: "ADMIN",
  expectedRegistrationVersion:
    prepared.registration.registrationVersion,
  expectedSubmissionRecordId:
    getCustomerRegistrationSubmissionRecordId(
      prepared.registration.registrationId,
    ),
  commandId: "validate-customer-registration",
  ...overrides,
});

describe("Registration Validation aggregate", () => {
  beforeEach(resetRegistrationValidationTestState);

  it("lets ADMIN create one immutable VALID record with exact references", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const result = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration(commandFor(prepared));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validation).toMatchObject({
      validationId: `registration-validation-${prepared.registration.registrationId}`,
      recordVersion: 1,
      registrationId: prepared.registration.registrationId,
      registrationVersion: prepared.registration.registrationVersion,
      submissionRecordId:
        getCustomerRegistrationSubmissionRecordId(
          prepared.registration.registrationId,
        ),
      sessionId: prepared.session.sessionId,
      customerId: CURRENT_CUSTOMER_ID,
      registrationWindowId:
        prepared.registrationWindow.registrationWindowId,
      outcome: "VALID",
      correctability: "NOT_APPLICABLE",
      nextStep: "READY_FOR_MEMBERSHIP_CHECK",
      findings: [],
    });
    expect(Object.isFrozen(result.validation)).toBe(true);
    expect(Object.isFrozen(result.validation.validationEvidence)).toBe(true);
    expect(Object.isFrozen(result.validation.history)).toBe(true);
  });

  it.each(["CUSTOMER", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-ADMIN role %s",
    (actorRole) => {
      const prepared = prepareSubmittedCustomerRegistration();
      expect(
        useAuctionRegistrationValidationStore
          .getState()
          .validateCustomerRegistration(
            commandFor(prepared, {
              actorRole,
              commandId: `validate-as-${actorRole.toLowerCase()}`,
            }),
          ),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("rejects a DRAFT Registration", () => {
    const prepared = prepareOpenRegistrationWindow();
    const draft = useAuctionCustomerRegistrationStore
      .getState()
      .createRegistrationDraft({
        sessionId: prepared.session.sessionId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedSessionVersion: prepared.session.currentVersion,
        expectedRegistrationWindowId:
          prepared.registrationWindow.registrationWindowId,
        commandId: "validation-draft-create",
      });
    if (!draft.ok) throw new Error(draft.message);
    expect(
      useAuctionRegistrationValidationStore
        .getState()
        .validateCustomerRegistration({
          registrationId: draft.registration.registrationId,
          actorId: "admin.registration-validation@mock.local",
          actorRole: "ADMIN",
          expectedRegistrationVersion:
            draft.registration.registrationVersion,
          expectedSubmissionRecordId:
            getCustomerRegistrationSubmissionRecordId(
              draft.registration.registrationId,
            ),
          commandId: "validation-draft-attempt",
        }),
    ).toMatchObject({ ok: false, code: "REGISTRATION_NOT_SUBMITTED" });
  });

  it("classifies missing and internally invalid Submission Records as blocking", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    expect(
      evaluateRegistrationValidation({
        registration: prepared.registration,
        submissionRecord: undefined,
        session: prepared.session,
        registrationWindow: prepared.registrationWindow,
      }),
    ).toMatchObject({
      outcome: "INVALID",
      correctability: "BLOCKING",
      nextStep: "INVALID_BLOCKING",
      findings: [{ code: "SUBMISSION_RECORD_MISSING" }],
    });
    expect(
      evaluateRegistrationValidation({
        registration: prepared.registration,
        submissionRecord: {
          recordVersion: 1,
          submittedBy: "CUS-OTHER-001",
          submittedAt: prepared.registration.submittedAt ?? "",
        },
        session: prepared.session,
        registrationWindow: prepared.registrationWindow,
      }),
    ).toMatchObject({
      outcome: "INVALID",
      correctability: "BLOCKING",
      nextStep: "INVALID_BLOCKING",
      findings: [{ code: "CUSTOMER_IDENTITY_INVALID" }],
    });
  });

  it("maps accepted rules and valid submitted evidence to READY_FOR_MEMBERSHIP_CHECK", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    expect(
      evaluateRegistrationValidation({
        registration: prepared.registration,
        submissionRecord: prepared.registration.submissionRecord,
        session: prepared.session,
        registrationWindow: prepared.registrationWindow,
      }),
    ).toEqual({
      outcome: "VALID",
      correctability: "NOT_APPLICABLE",
      nextStep: "READY_FOR_MEMBERSHIP_CHECK",
      findings: [],
    });
  });

  it("maps only correctable findings to CORRECTION_REQUIRED", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const correctable = {
      ...prepared.registration,
      rulesAccepted: false,
      rulesAcceptedAt: undefined,
    };
    const evaluation = evaluateRegistrationValidation({
      registration: correctable,
      submissionRecord: correctable.submissionRecord,
      session: prepared.session,
      registrationWindow: prepared.registrationWindow,
    });
    expect(evaluation).toMatchObject({
      outcome: "INVALID",
      correctability: "CORRECTABLE",
      nextStep: "CORRECTION_REQUIRED",
    });
    expect(evaluation.findings.map((item) => item.code)).toEqual([
      "RULES_ACCEPTANCE_MISSING",
      "RULES_ACCEPTANCE_TIMESTAMP_MISSING",
    ]);
  });

  it("accepts submittedAt inside the confirmed half-open window", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const submittedAt = prepared.registration.submittedAt;
    expect(submittedAt).toBeTruthy();
    expect(Date.parse(submittedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(
        prepared.registrationWindow.window.registrationOpenAt,
      ),
    );
    expect(Date.parse(submittedAt ?? "")).toBeLessThan(
      Date.parse(
        prepared.registrationWindow.window.registrationCloseAt,
      ),
    );
    expect(
      evaluateRegistrationValidation({
        registration: prepared.registration,
        submissionRecord: prepared.registration.submissionRecord,
        session: prepared.session,
        registrationWindow: prepared.registrationWindow,
      }).outcome,
    ).toBe("VALID");
  });

  it("maps submittedAt outside the confirmed window to INVALID_BLOCKING", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const submittedAt = new Date(
      Date.parse(
        prepared.registrationWindow.window.registrationOpenAt,
      ) - 1,
    ).toISOString();
    const registration = {
      ...prepared.registration,
      submittedAt,
      submissionRecord: {
        recordVersion: 1 as const,
        submittedBy: prepared.registration.customerId,
        submittedAt,
      },
    };
    expect(
      evaluateRegistrationValidation({
        registration,
        submissionRecord: registration.submissionRecord,
        session: prepared.session,
        registrationWindow: prepared.registrationWindow,
      }),
    ).toMatchObject({
      outcome: "INVALID",
      correctability: "BLOCKING",
      nextStep: "INVALID_BLOCKING",
      findings: [{ code: "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW" }],
    });
  });

  it("enforces exact Registration version and Submission reference", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    expect(
      useAuctionRegistrationValidationStore
        .getState()
        .validateCustomerRegistration(
          commandFor(prepared, {
            expectedRegistrationVersion:
              prepared.registration.registrationVersion - 1,
          }),
        ),
    ).toMatchObject({ ok: false, code: "STALE_REGISTRATION_VERSION" });
    expect(
      useAuctionRegistrationValidationStore
        .getState()
        .validateCustomerRegistration(
          commandFor(prepared, {
            expectedSubmissionRecordId: "submission-record-other",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "SUBMISSION_RECORD_REFERENCE_MISMATCH",
    });
  });

  it("returns the same record for the same command and blocks a different command", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const store = useAuctionRegistrationValidationStore.getState();
    const first = store.validateCustomerRegistration(commandFor(prepared));
    const repeated = store.validateCustomerRegistration(commandFor(prepared));
    const different = store.validateCustomerRegistration(
      commandFor(prepared, { commandId: "validate-customer-registration-2" }),
    );
    expect(first).toMatchObject({ ok: true, created: true });
    expect(repeated).toMatchObject({ ok: true, created: false });
    expect(different).toMatchObject({
      ok: false,
      code: "REGISTRATION_ALREADY_VALIDATED",
    });
    expect(
      useAuctionRegistrationValidationStore.getState().validations,
    ).toHaveLength(1);
  });

  it("leaves Registration, Window, and Session unchanged and creates no later phase state", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const registrationBefore = JSON.stringify(
      useAuctionCustomerRegistrationStore.getState().registrations,
    );
    const windowBefore = JSON.stringify(
      useAuctionRegistrationWindowStore.getState().registrationWindows,
    );
    const sessionBefore = JSON.stringify(
      useAuctionSessionStore.getState().sessions,
    );
    const result = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration(commandFor(prepared));
    expect(result.ok).toBe(true);
    expect(
      JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
    ).toBe(registrationBefore);
    expect(
      JSON.stringify(
        useAuctionRegistrationWindowStore.getState().registrationWindows,
      ),
    ).toBe(windowBefore);
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      sessionBefore,
    );
    if (!result.ok) return;
    expect(result.validation).not.toHaveProperty("membership");
    expect(result.validation).not.toHaveProperty("deposit");
    expect(result.validation).not.toHaveProperty("eligibility");
    expect(result.validation).not.toHaveProperty("publication");
    expect(prepared.session.lifecycleStatus).toBe("DRAFT");
    expect(prepared.session.publicationStatus).toBe("NOT_READY");
  });

  it("rejects later-phase source state", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const withLaterPhase = { ...prepared.registration };
    Reflect.set(withLaterPhase, "membershipResult", "CHECKED");
    useAuctionCustomerRegistrationStore.setState({
      registrations: [withLaterPhase],
    });
    expect(
      useAuctionRegistrationValidationStore
        .getState()
        .validateCustomerRegistration(commandFor(prepared)),
    ).toMatchObject({ ok: false, code: "LATER_PHASE_STATE_EXISTS" });
  });

  it("rejects an SGDG-managed workflow at the command boundary", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    const reference = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId: "AST-OMEGA-SPD-001",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "registration-validation-sgdg-reference",
      });
    if (!reference.ok) throw new Error(reference.message);
    const direct = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession({
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "registration-validation-sgdg-session",
        ownerId: CONTENT_STAFF_ACTOR_ID,
        assetReadinessReferenceId: reference.reference.referenceId,
        expectedAssetVersion: reference.reference.assetVersion,
        draft: {
          assetId: reference.reference.assetId,
          title: "SGDG Registration Validation blocker",
          purpose: "Validation must remain Customer-only",
          region: "Hà Nội",
          ownerId: CONTENT_STAFF_ACTOR_ID,
        },
      });
    if (!direct.ok) throw new Error(direct.message);
    const sgdgRegistration = {
      ...prepared.registration,
      sessionId: direct.session.sessionId,
    };
    useAuctionCustomerRegistrationStore.setState({
      registrations: [sgdgRegistration],
    });
    expect(
      useAuctionRegistrationValidationStore
        .getState()
        .validateCustomerRegistration(
          commandFor(prepared, {
            registrationId: sgdgRegistration.registrationId,
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "DYNAMIC_CUSTOMER_REGISTRATION_REQUIRED",
    });
  });

  it("creates a correctable record without correcting or resubmitting Registration", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const correctable = {
      ...prepared.registration,
      rulesAccepted: false,
      rulesAcceptedAt: undefined,
    };
    useAuctionCustomerRegistrationStore.setState({
      registrations: [correctable],
    });
    const result = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration(commandFor(prepared));
    expect(result).toMatchObject({
      ok: true,
      validation: {
        outcome: "INVALID",
        correctability: "CORRECTABLE",
        nextStep: "CORRECTION_REQUIRED",
      },
    });
    expect(
      useAuctionCustomerRegistrationStore.getState().registrations[0],
    ).toBe(correctable);
  });

  it("creates a blocking record for a submittedAt outside the Window", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const submittedAt = new Date(
      Date.parse(
        prepared.registrationWindow.window.registrationCloseAt,
      ) + 1,
    ).toISOString();
    const outside = {
      ...prepared.registration,
      submittedAt,
      submissionRecord: {
        recordVersion: 1 as const,
        submittedBy: prepared.registration.customerId,
        submittedAt,
      },
    };
    useAuctionCustomerRegistrationStore.setState({
      registrations: [outside],
    });
    const result = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration(commandFor(prepared));
    expect(result).toMatchObject({
      ok: true,
      validation: {
        outcome: "INVALID",
        correctability: "BLOCKING",
        nextStep: "INVALID_BLOCKING",
        findings: [{ code: "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW" }],
      },
    });
  });

  it("fails closed for malformed, duplicate, mismatched, and later-phase persistence", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const result = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration(commandFor(prepared));
    if (!result.ok) throw new Error(result.message);
    const valid = JSON.parse(JSON.stringify(result.validation));
    expect(
      sanitizePersistedAuctionRegistrationValidationState({
        validations: [valid],
      }).validations,
    ).toHaveLength(1);
    for (const malformed of [
      { ...valid, outcome: "UNKNOWN" },
      { ...valid, recordVersion: 2 },
      {
        ...valid,
        nextStep: "CORRECTION_REQUIRED",
      },
      { ...valid, membershipResult: "CHECKED" },
      {
        ...valid,
        validationEvidence: {
          ...valid.validationEvidence,
          submittedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ])
      expect(
        sanitizePersistedAuctionRegistrationValidationState({
          validations: [malformed],
        }).validations,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationValidationState({
        validations: [valid, valid],
      }).validations,
    ).toEqual([]);
  });
});
