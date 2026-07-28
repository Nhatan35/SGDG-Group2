import { beforeEach, describe, expect, it } from "vitest";
import {
  prepareCorrectableRegistrationValidation,
  resetRegistrationCorrectionTestState,
} from "../test/registrationCorrectionTestHarness";
import { prepareSubmittedCustomerRegistration } from "../test/registrationValidationTestHarness";
import { useAuctionCustomerRegistrationStore } from "./auctionCustomerRegistrationStore";
import {
  getCustomerRegistrationSubmissionRecordId,
  useAuctionRegistrationValidationStore,
} from "./auctionRegistrationValidationStore";
import {
  REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED,
  sanitizePersistedAuctionRegistrationCorrectionDraftState,
  useAuctionRegistrationCorrectionDraftStore,
  type CreateRegistrationCorrectionDraftCommand,
} from "./auctionRegistrationCorrectionDraftStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import { CURRENT_CUSTOMER_ID } from "./openingRequestStore";

const createCommand = (
  prepared: ReturnType<typeof prepareCorrectableRegistrationValidation>,
  overrides: Partial<CreateRegistrationCorrectionDraftCommand> = {},
): CreateRegistrationCorrectionDraftCommand => ({
  registrationId: prepared.registration.registrationId,
  actorId: CURRENT_CUSTOMER_ID,
  actorRole: "CUSTOMER",
  expectedRegistrationVersion:
    prepared.registration.registrationVersion,
  expectedValidationId: prepared.validation.validationId,
  commandId: "create-registration-correction",
  ...overrides,
});

const createDraft = (
  prepared: ReturnType<typeof prepareCorrectableRegistrationValidation>,
) => {
  const result = useAuctionRegistrationCorrectionDraftStore
    .getState()
    .createRegistrationCorrectionDraft(createCommand(prepared));
  if (!result.ok) throw new Error(result.message);
  return result.correctionDraft;
};

describe("Registration Correction Draft aggregate", () => {
  beforeEach(resetRegistrationCorrectionTestState);

  it("lets the owning CUSTOMER create one DRAFT at version 1 with exact references", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const draft = createDraft(prepared);
    expect(draft).toMatchObject({
      correctionDraftId: `registration-correction-draft-${prepared.registration.registrationId}`,
      correctionVersion: 1,
      registrationId: prepared.registration.registrationId,
      originalRegistrationVersion:
        prepared.registration.registrationVersion,
      validationId: prepared.validation.validationId,
      sessionId: prepared.registration.sessionId,
      customerId: CURRENT_CUSTOMER_ID,
      status: "DRAFT",
      rulesAccepted: false,
      createdBy: CURRENT_CUSTOMER_ID,
    });
    expect(Object.isFrozen(draft)).toBe(true);
    expect(Object.isFrozen(draft.history)).toBe(true);
  });

  it.each(["ADMIN", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-CUSTOMER role %s",
    (actorRole) => {
      const prepared = prepareCorrectableRegistrationValidation();
      expect(
        useAuctionRegistrationCorrectionDraftStore
          .getState()
          .createRegistrationCorrectionDraft(
            createCommand(prepared, {
              actorRole,
              commandId: `correction-as-${actorRole.toLowerCase()}`,
            }),
          ),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("rejects a non-owner for create and save", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .createRegistrationCorrectionDraft(
          createCommand(prepared, {
            actorId: "CUS-OTHER-001",
            commandId: "other-customer-correction",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "REGISTRATION_OWNERSHIP_MISMATCH",
    });
    const draft = createDraft(prepared);
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .saveRegistrationCorrectionDraft({
          correctionDraftId: draft.correctionDraftId,
          actorId: "CUS-OTHER-001",
          actorRole: "CUSTOMER",
          expectedCorrectionVersion: draft.correctionVersion,
          rulesAccepted: true,
          commandId: "other-customer-save-correction",
        }),
    ).toMatchObject({
      ok: false,
      code: "CORRECTION_DRAFT_OWNERSHIP_MISMATCH",
    });
  });

  it("requires CORRECTION_REQUIRED", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const validation = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration({
        registrationId: prepared.registration.registrationId,
        actorId: "admin.registration-validation@mock.local",
        actorRole: "ADMIN",
        expectedRegistrationVersion:
          prepared.registration.registrationVersion,
        expectedSubmissionRecordId:
          getCustomerRegistrationSubmissionRecordId(
            prepared.registration.registrationId,
          ),
        commandId: "valid-registration-before-correction",
      });
    if (!validation.ok) throw new Error(validation.message);
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .createRegistrationCorrectionDraft({
          registrationId: prepared.registration.registrationId,
          actorId: CURRENT_CUSTOMER_ID,
          actorRole: "CUSTOMER",
          expectedRegistrationVersion:
            prepared.registration.registrationVersion,
          expectedValidationId: validation.validation.validationId,
          commandId: "correction-not-required",
        }),
    ).toMatchObject({ ok: false, code: "CORRECTION_REQUIRED" });
  });

  it("rejects a blocking Validation", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    const submittedAt = new Date(
      Date.parse(
        prepared.registrationWindow.window.registrationCloseAt,
      ) + 1,
    ).toISOString();
    const blockingRegistration = {
      ...prepared.registration,
      submittedAt,
      submissionRecord: {
        recordVersion: 1 as const,
        submittedBy: prepared.registration.customerId,
        submittedAt,
      },
    };
    useAuctionCustomerRegistrationStore.setState({
      registrations: [blockingRegistration],
    });
    const validation = useAuctionRegistrationValidationStore
      .getState()
      .validateCustomerRegistration({
        registrationId: blockingRegistration.registrationId,
        actorId: "admin.registration-validation@mock.local",
        actorRole: "ADMIN",
        expectedRegistrationVersion:
          blockingRegistration.registrationVersion,
        expectedSubmissionRecordId:
          getCustomerRegistrationSubmissionRecordId(
            blockingRegistration.registrationId,
          ),
        commandId: "blocking-registration-before-correction",
      });
    if (!validation.ok) throw new Error(validation.message);
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .createRegistrationCorrectionDraft({
          registrationId: blockingRegistration.registrationId,
          actorId: CURRENT_CUSTOMER_ID,
          actorRole: "CUSTOMER",
          expectedRegistrationVersion:
            blockingRegistration.registrationVersion,
          expectedValidationId: validation.validation.validationId,
          commandId: "blocking-correction-attempt",
        }),
    ).toMatchObject({ ok: false, code: "BLOCKING_VALIDATION" });
  });

  it("blocks correctable findings unsupported by rulesAccepted", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const unsupportedValidation = {
      ...prepared.validation,
      findings: [
        {
          code: "CORRECTABLE_REGISTRATION_DATA_MISSING" as const,
          severity: "CORRECTABLE" as const,
          message: "Unsupported correction field is missing.",
        },
      ],
      validationEvidence: {
        ...prepared.validation.validationEvidence,
        findingCodes: [
          "CORRECTABLE_REGISTRATION_DATA_MISSING" as const,
        ],
      },
    };
    useAuctionRegistrationValidationStore.setState({
      validations: [unsupportedValidation],
    });
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .createRegistrationCorrectionDraft(
          createCommand(prepared, {
            expectedValidationId: unsupportedValidation.validationId,
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED,
    });
  });

  it("is idempotent for the same create command and prevents another Draft", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const store = useAuctionRegistrationCorrectionDraftStore.getState();
    expect(
      store.createRegistrationCorrectionDraft(createCommand(prepared)),
    ).toMatchObject({ ok: true, created: true });
    expect(
      store.createRegistrationCorrectionDraft(createCommand(prepared)),
    ).toMatchObject({ ok: true, created: false, changed: false });
    expect(
      store.createRegistrationCorrectionDraft(
        createCommand(prepared, {
          commandId: "create-registration-correction-other",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "CORRECTION_DRAFT_ALREADY_EXISTS",
    });
    expect(
      useAuctionRegistrationCorrectionDraftStore.getState().correctionDrafts,
    ).toHaveLength(1);
  });

  it("allows only rulesAccepted to change and rejects stale versions", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const draft = createDraft(prepared);
    const unsupported = {
      correctionDraftId: draft.correctionDraftId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER" as const,
      expectedCorrectionVersion: draft.correctionVersion,
      rulesAccepted: true,
      customerId: "MUTATION-NOT-ALLOWED",
      commandId: "unsupported-correction-save",
    };
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .saveRegistrationCorrectionDraft(unsupported),
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_FIELD" });
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .saveRegistrationCorrectionDraft({
          correctionDraftId: draft.correctionDraftId,
          actorId: CURRENT_CUSTOMER_ID,
          actorRole: "CUSTOMER",
          expectedCorrectionVersion: draft.correctionVersion + 1,
          rulesAccepted: true,
          commandId: "stale-correction-save",
        }),
    ).toMatchObject({ ok: false, code: "STALE_CORRECTION_VERSION" });
  });

  it("increments once for a meaningful save and keeps same-command idempotency", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const draft = createDraft(prepared);
    const command = {
      correctionDraftId: draft.correctionDraftId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER" as const,
      expectedCorrectionVersion: 1,
      rulesAccepted: true,
      commandId: "save-registration-correction",
    };
    const saved = useAuctionRegistrationCorrectionDraftStore
      .getState()
      .saveRegistrationCorrectionDraft(command);
    expect(saved).toMatchObject({
      ok: true,
      changed: true,
      correctionDraft: {
        correctionVersion: 2,
        rulesAccepted: true,
      },
    });
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .saveRegistrationCorrectionDraft(command),
    ).toMatchObject({
      ok: true,
      changed: false,
      correctionDraft: { correctionVersion: 2 },
    });
    expect(
      useAuctionRegistrationCorrectionDraftStore.getState().correctionDrafts,
    ).toHaveLength(1);
  });

  it("does not increment for a no-op save", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const draft = createDraft(prepared);
    expect(
      useAuctionRegistrationCorrectionDraftStore
        .getState()
        .saveRegistrationCorrectionDraft({
          correctionDraftId: draft.correctionDraftId,
          actorId: CURRENT_CUSTOMER_ID,
          actorRole: "CUSTOMER",
          expectedCorrectionVersion: 1,
          rulesAccepted: false,
          commandId: "noop-registration-correction",
        }),
    ).toMatchObject({
      ok: true,
      changed: false,
      correctionDraft: { correctionVersion: 1 },
    });
  });

  it("leaves Registration, Validation, Window, and Session immutable with no later phase state", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const registrationBefore = JSON.stringify(
      useAuctionCustomerRegistrationStore.getState().registrations,
    );
    const validationBefore = JSON.stringify(
      useAuctionRegistrationValidationStore.getState().validations,
    );
    const sessionBefore = JSON.stringify(
      useAuctionSessionStore.getState().sessions,
    );
    const draft = createDraft(prepared);
    useAuctionRegistrationCorrectionDraftStore
      .getState()
      .saveRegistrationCorrectionDraft({
        correctionDraftId: draft.correctionDraftId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedCorrectionVersion: draft.correctionVersion,
        rulesAccepted: true,
        commandId: "save-with-source-immutability",
      });
    expect(
      JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
    ).toBe(registrationBefore);
    expect(
      JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
    ).toBe(validationBefore);
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      sessionBefore,
    );
    const current = useAuctionRegistrationCorrectionDraftStore
      .getState()
      .correctionDrafts[0];
    expect(current.status).toBe("DRAFT");
    expect(current).not.toHaveProperty("submissionRecord");
    expect(current).not.toHaveProperty("resubmission");
    expect(current).not.toHaveProperty("membership");
    expect(current).not.toHaveProperty("deposit");
    expect(current).not.toHaveProperty("eligibility");
    expect(current).not.toHaveProperty("publication");
  });

  it("fails closed for malformed, duplicate, mismatched, and later-phase persistence", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    const draft = createDraft(prepared);
    const valid = JSON.parse(JSON.stringify(draft));
    expect(
      sanitizePersistedAuctionRegistrationCorrectionDraftState({
        correctionDrafts: [valid],
      }).correctionDrafts,
    ).toHaveLength(1);
    for (const malformed of [
      { ...valid, status: "SUBMITTED" },
      { ...valid, correctionVersion: 0 },
      { ...valid, originalRegistrationVersion: 99 },
      { ...valid, validationId: "validation-other" },
      { ...valid, resubmittedAt: "2026-08-01T02:00:00.000Z" },
      { ...valid, rulesAccepted: true },
      { ...valid, history: [] },
    ])
      expect(
        sanitizePersistedAuctionRegistrationCorrectionDraftState({
          correctionDrafts: [malformed],
        }).correctionDrafts,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationCorrectionDraftState({
        correctionDrafts: [valid, valid],
      }).correctionDrafts,
    ).toEqual([]);
  });
});
