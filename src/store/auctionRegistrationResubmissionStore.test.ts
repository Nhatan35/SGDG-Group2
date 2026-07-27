import { beforeEach, describe, expect, it } from "vitest";
import {
  prepareAcceptedRegistrationCorrectionDraft,
  resetRegistrationResubmissionTestState,
} from "../test/registrationResubmissionTestHarness";
import { useAuctionCustomerRegistrationStore } from "./auctionCustomerRegistrationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "./auctionRegistrationCorrectionDraftStore";
import {
  getRegistrationResubmissionId,
  sanitizePersistedAuctionRegistrationResubmissionState,
  type ResubmitCorrectedRegistrationCommand,
  useAuctionRegistrationResubmissionStore,
} from "./auctionRegistrationResubmissionStore";
import { useAuctionRegistrationValidationStore } from "./auctionRegistrationValidationStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import { CURRENT_CUSTOMER_ID } from "./openingRequestStore";

type Prepared = ReturnType<
  typeof prepareAcceptedRegistrationCorrectionDraft
>;

const commandFor = (
  prepared: Prepared,
  overrides: Partial<ResubmitCorrectedRegistrationCommand> = {},
): ResubmitCorrectedRegistrationCommand => ({
  registrationId: prepared.registration.registrationId,
  actorId: CURRENT_CUSTOMER_ID,
  actorRole: "CUSTOMER",
  expectedRegistrationVersion:
    prepared.registration.registrationVersion,
  expectedValidationId: prepared.validation.validationId,
  expectedCorrectionDraftId:
    prepared.correctionDraft.correctionDraftId,
  expectedCorrectionDraftVersion:
    prepared.correctionDraft.correctionVersion,
  commandId: "resubmit-corrected-registration",
  ...overrides,
});

const resubmit = (prepared: Prepared) => {
  const result = useAuctionRegistrationResubmissionStore
    .getState()
    .resubmitCorrectedRegistration(commandFor(prepared));
  if (!result.ok) throw new Error(result.message);
  return result.resubmission;
};

describe("Corrected Registration Resubmission aggregate", () => {
  beforeEach(resetRegistrationResubmissionTestState);

  it("lets the owning CUSTOMER create one immutable version-1 SUBMITTED record", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const record = resubmit(prepared);
    expect(record).toMatchObject({
      resubmissionId: getRegistrationResubmissionId(
        prepared.registration.registrationId,
        prepared.validation.validationId,
      ),
      recordVersion: 1,
      registrationId: prepared.registration.registrationId,
      originalRegistrationVersion:
        prepared.registration.registrationVersion,
      previousValidationId: prepared.validation.validationId,
      correctionDraftId:
        prepared.correctionDraft.correctionDraftId,
      correctionDraftVersion:
        prepared.correctionDraft.correctionVersion,
      customerId: CURRENT_CUSTOMER_ID,
      status: "SUBMITTED",
      nextStep: "REVALIDATION_REQUIRED",
      correctedEvidence: { rulesAccepted: true },
      submittedBy: CURRENT_CUSTOMER_ID,
    });
    expect(record.correctedEvidence.rulesAcceptedAt).toBe(
      record.submittedAt,
    );
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.correctedEvidence)).toBe(true);
    expect(Object.isFrozen(record.history)).toBe(true);
    expect(Object.isFrozen(record.history[0])).toBe(true);
  });

  it.each(["ADMIN", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-CUSTOMER role %s",
    (actorRole) => {
      const prepared = prepareAcceptedRegistrationCorrectionDraft();
      expect(
        useAuctionRegistrationResubmissionStore
          .getState()
          .resubmitCorrectedRegistration(
            commandFor(prepared, {
              actorRole,
              commandId: `resubmit-as-${actorRole.toLowerCase()}`,
            }),
          ),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("rejects a non-owner", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    expect(
      useAuctionRegistrationResubmissionStore
        .getState()
        .resubmitCorrectedRegistration(
          commandFor(prepared, {
            actorId: "CUS-OTHER-001",
            commandId: "resubmit-as-other-customer",
          }),
        ),
    ).toMatchObject({
      ok: false,
      code: "REGISTRATION_OWNERSHIP_MISMATCH",
    });
  });

  it("requires the exact CORRECTION_REQUIRED Validation references", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    useAuctionRegistrationValidationStore.setState({
      validations: [
        {
          ...prepared.validation,
          nextStep: "INVALID_BLOCKING",
          correctability: "BLOCKING",
          findings: [
            {
              code: "MALFORMED_REGISTRATION",
              severity: "BLOCKING",
              message: "Blocked.",
            },
          ],
          validationEvidence: {
            ...prepared.validation.validationEvidence,
            findingCodes: ["MALFORMED_REGISTRATION"],
          },
        },
      ],
    });
    expect(
      useAuctionRegistrationResubmissionStore
        .getState()
        .resubmitCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({ ok: false, code: "BLOCKING_VALIDATION" });
  });

  it("rejects unsupported correctable findings", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    useAuctionRegistrationValidationStore.setState({
      validations: [
        {
          ...prepared.validation,
          findings: [
            {
              code: "CORRECTABLE_REGISTRATION_DATA_MISSING",
              severity: "CORRECTABLE",
              message: "Unsupported correction.",
            },
          ],
          validationEvidence: {
            ...prepared.validation.validationEvidence,
            findingCodes: [
              "CORRECTABLE_REGISTRATION_DATA_MISSING",
            ],
          },
        },
      ],
    });
    expect(
      useAuctionRegistrationResubmissionStore
        .getState()
        .resubmitCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({
      ok: false,
      code: "REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED",
    });
  });

  it("rejects missing, mismatched, and stale Correction Draft references", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const store = useAuctionRegistrationResubmissionStore.getState();
    expect(
      store.resubmitCorrectedRegistration(
        commandFor(prepared, {
          expectedCorrectionDraftId: "missing-correction-draft",
          commandId: "missing-correction-draft",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "CORRECTION_DRAFT_NOT_FOUND",
    });
    expect(
      store.resubmitCorrectedRegistration(
        commandFor(prepared, {
          expectedCorrectionDraftVersion: 99,
          commandId: "stale-correction-draft",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "STALE_CORRECTION_DRAFT_VERSION",
    });
  });

  it("requires corrected rules acceptance", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    useAuctionRegistrationCorrectionDraftStore.setState({
      correctionDrafts: [
        { ...prepared.correctionDraft, rulesAccepted: false },
      ],
    });
    expect(
      useAuctionRegistrationResubmissionStore
        .getState()
        .resubmitCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({
      ok: false,
      code: "RULES_ACCEPTANCE_REQUIRED",
    });
  });

  it("returns the existing record for the same command", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const store = useAuctionRegistrationResubmissionStore.getState();
    expect(
      store.resubmitCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({ ok: true, created: true });
    expect(
      store.resubmitCorrectedRegistration(commandFor(prepared)),
    ).toMatchObject({ ok: true, created: false });
    expect(
      store.resubmitCorrectedRegistration(
        commandFor(prepared, { actorId: "CUS-OTHER-001" }),
      ),
    ).toMatchObject({
      ok: false,
      code: "REGISTRATION_OWNERSHIP_MISMATCH",
    });
    expect(
      useAuctionRegistrationResubmissionStore.getState().resubmissions,
    ).toHaveLength(1);
  });

  it("prevents a different command from creating a duplicate", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const store = useAuctionRegistrationResubmissionStore.getState();
    store.resubmitCorrectedRegistration(commandFor(prepared));
    expect(
      store.resubmitCorrectedRegistration(
        commandFor(prepared, {
          commandId: "different-resubmission-command",
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: "REGISTRATION_ALREADY_RESUBMITTED",
    });
    expect(
      useAuctionRegistrationResubmissionStore.getState().resubmissions,
    ).toHaveLength(1);
  });

  it("does not mutate Registration, Validation, Draft, Window, or Session", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
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
      session: JSON.stringify(useAuctionSessionStore.getState().sessions),
    };
    resubmit(prepared);
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
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      before.session,
    );
  });

  it("creates no later-phase state", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const record = resubmit(prepared);
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
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const record = resubmit(prepared);
    const valid = JSON.parse(JSON.stringify(record));
    expect(
      sanitizePersistedAuctionRegistrationResubmissionState({
        resubmissions: [valid],
      }).resubmissions,
    ).toHaveLength(1);
    for (const malformed of [
      { ...valid, status: "DRAFT" },
      { ...valid, nextStep: "READY_FOR_MEMBERSHIP_CHECK" },
      { ...valid, recordVersion: 2 },
      { ...valid, customerId: "CUS-OTHER-001" },
      { ...valid, originalRegistrationVersion: 99 },
      { ...valid, previousValidationId: "other-validation" },
      { ...valid, correctionDraftId: "other-draft" },
      {
        ...valid,
        correctedEvidence: {
          ...valid.correctedEvidence,
          rulesAccepted: false,
        },
      },
      {
        ...valid,
        correctedEvidence: {
          rulesAccepted: true,
          rulesAcceptedAt: "",
        },
      },
      { ...valid, submittedAt: "" },
      { ...valid, membership: { status: "CHECKED" } },
      { ...valid, history: [] },
    ])
      expect(
        sanitizePersistedAuctionRegistrationResubmissionState({
          resubmissions: [malformed],
        }).resubmissions,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationResubmissionState({
        resubmissions: [valid, valid],
      }).resubmissions,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationResubmissionState({
        resubmissions: [
          valid,
          {
            ...valid,
            resubmissionId: `${valid.resubmissionId}-two`,
          },
        ],
      }).resubmissions,
    ).toEqual([]);
  });
});
