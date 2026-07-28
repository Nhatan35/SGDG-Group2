import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  type AuctionCustomerRegistration,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import {
  isSupportedRegistrationCorrectionFinding,
  type RegistrationCorrectionDraft,
  useAuctionRegistrationCorrectionDraftStore,
} from "./auctionRegistrationCorrectionDraftStore";
import { getRegistrationReadinessDeterministicNow } from "./auctionRegistrationOpeningReadinessStore";
import {
  type AuctionRegistrationValidation,
  useAuctionRegistrationValidationStore,
} from "./auctionRegistrationValidationStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";

export const AUCTION_REGISTRATION_RESUBMISSION_STORAGE_KEY =
  "sgdg-auction-registration-resubmissions-v1";
export const AUCTION_REGISTRATION_RESUBMISSION_SCHEMA_VERSION = 1;
export const PROTOTYPE_REGISTRATION_RESUBMISSION_POLICY =
  "PROTOTYPE POLICY — the current Registration Window need not remain open because the original submittedAt already passed historical Validation; resubmission time is recorded separately. Requires stakeholder confirmation.";

export interface RegistrationResubmissionHistoryEntry {
  readonly historyId: string;
  readonly action: "CORRECTED_REGISTRATION_RESUBMITTED";
  readonly resultingStatus: "SUBMITTED";
  readonly resultingNextStep: "REVALIDATION_REQUIRED";
  readonly actorId: string;
  readonly actorRole: "CUSTOMER";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "CUSTOMER_AND_STAFF";
}

export interface AuctionRegistrationResubmission {
  readonly resubmissionId: string;
  readonly recordVersion: 1;
  readonly registrationId: string;
  readonly originalRegistrationVersion: number;
  readonly previousValidationId: string;
  readonly correctionDraftId: string;
  readonly correctionDraftVersion: number;
  readonly sessionId: string;
  readonly customerId: string;
  readonly status: "SUBMITTED";
  readonly nextStep: "REVALIDATION_REQUIRED";
  readonly correctedEvidence: {
    readonly rulesAccepted: true;
    readonly rulesAcceptedAt: string;
  };
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly commandId: string;
  readonly history: readonly RegistrationResubmissionHistoryEntry[];
}

export interface ResubmitCorrectedRegistrationCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRegistrationVersion: number;
  expectedValidationId: string;
  expectedCorrectionDraftId: string;
  expectedCorrectionDraftVersion: number;
  commandId: string;
}

export type RegistrationResubmissionErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_ACTOR"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "REGISTRATION_NOT_FOUND"
  | "REGISTRATION_OWNERSHIP_MISMATCH"
  | "REGISTRATION_NOT_SUBMITTED"
  | "STALE_REGISTRATION_VERSION"
  | "VALIDATION_NOT_FOUND"
  | "VALIDATION_REFERENCE_MISMATCH"
  | "CORRECTION_REQUIRED"
  | "BLOCKING_VALIDATION"
  | "REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED"
  | "CORRECTION_DRAFT_NOT_FOUND"
  | "CORRECTION_DRAFT_REFERENCE_MISMATCH"
  | "STALE_CORRECTION_DRAFT_VERSION"
  | "RULES_ACCEPTANCE_REQUIRED"
  | "REGISTRATION_ALREADY_RESUBMITTED"
  | "LATER_PHASE_STATE_EXISTS"
  | "AUTHORITATIVE_STATE_CHANGED";

export type RegistrationResubmissionCommandResult =
  | {
      ok: true;
      resubmission: AuctionRegistrationResubmission;
      created: boolean;
    }
  | {
      ok: false;
      code: RegistrationResubmissionErrorCode;
      message: string;
      resubmission?: AuctionRegistrationResubmission;
    };

export interface AuctionRegistrationResubmissionState {
  resubmissions: AuctionRegistrationResubmission[];
  getByRegistrationId: (
    registrationId: string,
  ) => AuctionRegistrationResubmission | undefined;
  resubmitCorrectedRegistration: (
    command: ResubmitCorrectedRegistrationCommand,
  ) => RegistrationResubmissionCommandResult;
  resetDeterministicRegistrationResubmissionState: () => void;
}

type ResubmissionSources = {
  registration: AuctionCustomerRegistration;
  validation: AuctionRegistrationValidation;
  correctionDraft: RegistrationCorrectionDraft;
  session: PersistedAuctionSession;
};

export type RegistrationResubmissionEligibility =
  | { eligible: true; sources: ResubmissionSources }
  | {
      eligible: false;
      code: RegistrationResubmissionErrorCode;
      message: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
) => {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key))
  );
};

const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));

const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);

export const getRegistrationResubmissionId = (
  registrationId: string,
  previousValidationId: string,
) => `registration-resubmission-${registrationId}-${previousValidationId}`;

const commandKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedRegistrationVersion",
  "expectedValidationId",
  "expectedCorrectionDraftId",
  "expectedCorrectionDraftVersion",
  "commandId",
]);

const laterPhaseKeys = [
  "membership",
  "membershipResult",
  "deposit",
  "depositResult",
  "eligibility",
  "eligibilityResult",
  "publication",
  "publicationId",
  "publishedAt",
  "approval",
  "approvedAt",
  "rejection",
  "rejectedAt",
] as const;

const hasLaterPhaseState = (value: object) =>
  laterPhaseKeys.some((key) => Reflect.get(value, key) !== undefined);

const failure = (
  code: RegistrationResubmissionErrorCode,
  message: string,
  resubmission?: AuctionRegistrationResubmission,
): RegistrationResubmissionCommandResult => ({
  ok: false,
  code,
  message,
  ...(resubmission ? { resubmission } : {}),
});

const resolveResubmissionSources = (
  command: ResubmitCorrectedRegistrationCommand,
): RegistrationResubmissionEligibility => {
  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === command.registrationId,
    );
  if (!registration)
    return {
      eligible: false,
      code: "REGISTRATION_NOT_FOUND",
      message: "Submitted Customer Registration was not found.",
    };
  if (registration.customerId !== command.actorId)
    return {
      eligible: false,
      code: "REGISTRATION_OWNERSHIP_MISMATCH",
      message: "Customer cannot resubmit another Customer's Registration.",
    };
  if (registration.status !== "SUBMITTED")
    return {
      eligible: false,
      code: "REGISTRATION_NOT_SUBMITTED",
      message: "Only a SUBMITTED Registration can be resubmitted.",
    };
  if (
    registration.registrationVersion !==
    command.expectedRegistrationVersion
  )
    return {
      eligible: false,
      code: "STALE_REGISTRATION_VERSION",
      message: "Original Registration version changed.",
    };

  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validations.find(
      (item) => item.validationId === command.expectedValidationId,
    );
  if (!validation)
    return {
      eligible: false,
      code: "VALIDATION_NOT_FOUND",
      message: "Previous Registration Validation was not found.",
    };
  if (
    validation.registrationId !== registration.registrationId ||
    validation.registrationVersion !== registration.registrationVersion ||
    validation.customerId !== registration.customerId ||
    validation.sessionId !== registration.sessionId
  )
    return {
      eligible: false,
      code: "VALIDATION_REFERENCE_MISMATCH",
      message: "Validation does not reference the exact Registration.",
    };
  if (validation.findings.some((finding) => finding.severity === "BLOCKING"))
    return {
      eligible: false,
      code: "BLOCKING_VALIDATION",
      message: "A blocking Validation cannot be resubmitted.",
    };
  if (
    validation.outcome !== "INVALID" ||
    validation.correctability !== "CORRECTABLE" ||
    validation.nextStep !== "CORRECTION_REQUIRED" ||
    validation.findings.length === 0
  )
    return {
      eligible: false,
      code: "CORRECTION_REQUIRED",
      message: "A correctable CORRECTION_REQUIRED Validation is mandatory.",
    };
  const unsupported = validation.findings.find(
    (finding) =>
      !isSupportedRegistrationCorrectionFinding(finding.code),
  );
  if (unsupported)
    return {
      eligible: false,
      code: "REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED",
      message: `${unsupported.code} cannot be resubmitted using rulesAccepted.`,
    };
  if (
    !registration.submittedAt ||
    validation.validationEvidence.submittedAt !==
      registration.submittedAt ||
    validation.validationEvidence.findingCodes.includes(
      "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW",
    )
  )
    return {
      eligible: false,
      code: "VALIDATION_REFERENCE_MISMATCH",
      message:
        "The original submittedAt has not passed historical Validation.",
    };

  const correctionDraft = useAuctionRegistrationCorrectionDraftStore
    .getState()
    .correctionDrafts.find(
      (item) =>
        item.correctionDraftId === command.expectedCorrectionDraftId,
    );
  if (!correctionDraft)
    return {
      eligible: false,
      code: "CORRECTION_DRAFT_NOT_FOUND",
      message: "Registration Correction Draft was not found.",
    };
  if (
    correctionDraft.registrationId !== registration.registrationId ||
    correctionDraft.originalRegistrationVersion !==
      registration.registrationVersion ||
    correctionDraft.validationId !== validation.validationId ||
    correctionDraft.sessionId !== registration.sessionId ||
    correctionDraft.customerId !== registration.customerId ||
    correctionDraft.status !== "DRAFT"
  )
    return {
      eligible: false,
      code: "CORRECTION_DRAFT_REFERENCE_MISMATCH",
      message: "Correction Draft does not reference the exact sources.",
    };
  if (
    correctionDraft.correctionVersion !==
    command.expectedCorrectionDraftVersion
  )
    return {
      eligible: false,
      code: "STALE_CORRECTION_DRAFT_VERSION",
      message: "Correction Draft version changed.",
    };
  if (correctionDraft.rulesAccepted !== true)
    return {
      eligible: false,
      code: "RULES_ACCEPTANCE_REQUIRED",
      message: "Corrected Auction rules acceptance is required.",
    };

  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === registration.sessionId);
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED" ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY"
  )
    return {
      eligible: false,
      code: "VALIDATION_REFERENCE_MISMATCH",
      message: "Resubmission supports only a DRAFT Customer Session.",
    };
  if (
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(validation) ||
    hasLaterPhaseState(correctionDraft) ||
    hasLaterPhaseState(session)
  )
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message:
        "Membership, Deposit, Eligibility, Approval, Rejection, or Publication state exists.",
    };
  return {
    eligible: true,
    sources: { registration, validation, correctionDraft, session },
  };
};

export const evaluateRegistrationResubmissionEligibility = (
  command: ResubmitCorrectedRegistrationCommand,
): RegistrationResubmissionEligibility => {
  if (command.actorRole !== "CUSTOMER")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Only CUSTOMER can resubmit a corrected Registration.",
    };
  if (!command.actorId.trim())
    return {
      eligible: false,
      code: "INVALID_ACTOR",
      message: "Authenticated Customer identity is required.",
    };
  if (!validCommandId(command.commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID is invalid.",
    };
  return resolveResubmissionSources(command);
};

const sourceFingerprint = (sources: ResubmissionSources) =>
  JSON.stringify({
    registration: sources.registration,
    validation: sources.validation,
    correctionDraft: sources.correctionDraft,
    session: {
      sessionId: sources.session.sessionId,
      currentVersion: sources.session.currentVersion,
      lifecycleStatus: sources.session.lifecycleStatus,
      publicationStatus: sources.session.publicationStatus,
    },
  });

const freezeResubmission = (
  value: AuctionRegistrationResubmission,
): AuctionRegistrationResubmission =>
  Object.freeze({
    ...value,
    correctedEvidence: Object.freeze({ ...value.correctedEvidence }),
    history: Object.freeze(
      value.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

const forbiddenPersistenceKeys = new Set<string>(laterPhaseKeys);

const containsForbiddenPersistenceKey = (value: unknown): boolean => {
  if (Array.isArray(value))
    return value.some(containsForbiddenPersistenceKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      forbiddenPersistenceKeys.has(key) ||
      containsForbiddenPersistenceKey(nested),
  );
};

const sanitizeResubmission = (
  value: unknown,
): AuctionRegistrationResubmission | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "resubmissionId",
      "recordVersion",
      "registrationId",
      "originalRegistrationVersion",
      "previousValidationId",
      "correctionDraftId",
      "correctionDraftVersion",
      "sessionId",
      "customerId",
      "status",
      "nextStep",
      "correctedEvidence",
      "submittedBy",
      "submittedAt",
      "commandId",
      "history",
    ]) ||
    typeof value.registrationId !== "string" ||
    typeof value.previousValidationId !== "string" ||
    value.resubmissionId !==
      getRegistrationResubmissionId(
        value.registrationId,
        value.previousValidationId,
      ) ||
    value.recordVersion !== 1 ||
    !positiveInteger(value.originalRegistrationVersion) ||
    typeof value.correctionDraftId !== "string" ||
    !positiveInteger(value.correctionDraftVersion) ||
    typeof value.sessionId !== "string" ||
    typeof value.customerId !== "string" ||
    !value.customerId.trim() ||
    value.status !== "SUBMITTED" ||
    value.nextStep !== "REVALIDATION_REQUIRED" ||
    !isRecord(value.correctedEvidence) ||
    !exactKeys(value.correctedEvidence, [
      "rulesAccepted",
      "rulesAcceptedAt",
    ]) ||
    value.correctedEvidence.rulesAccepted !== true ||
    !validIsoTime(value.correctedEvidence.rulesAcceptedAt) ||
    value.submittedBy !== value.customerId ||
    !validIsoTime(value.submittedAt) ||
    value.correctedEvidence.rulesAcceptedAt !== value.submittedAt ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId) ||
    !Array.isArray(value.history) ||
    value.history.length !== 1
  )
    return undefined;
  const history = value.history[0];
  if (
    !isRecord(history) ||
    !exactKeys(history, [
      "historyId",
      "action",
      "resultingStatus",
      "resultingNextStep",
      "actorId",
      "actorRole",
      "commandId",
      "occurredAt",
      "visibility",
    ]) ||
    history.historyId !== `${value.resubmissionId}-history-1` ||
    history.action !== "CORRECTED_REGISTRATION_RESUBMITTED" ||
    history.resultingStatus !== "SUBMITTED" ||
    history.resultingNextStep !== "REVALIDATION_REQUIRED" ||
    history.actorId !== value.customerId ||
    history.actorRole !== "CUSTOMER" ||
    history.commandId !== value.commandId ||
    history.occurredAt !== value.submittedAt ||
    history.visibility !== "CUSTOMER_AND_STAFF"
  )
    return undefined;

  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === value.registrationId,
    );
  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validations.find(
      (item) => item.validationId === value.previousValidationId,
    );
  const correctionDraft = useAuctionRegistrationCorrectionDraftStore
    .getState()
    .correctionDrafts.find(
      (item) => item.correctionDraftId === value.correctionDraftId,
    );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === value.sessionId);
  if (
    !registration ||
    registration.status !== "SUBMITTED" ||
    registration.registrationVersion !==
      value.originalRegistrationVersion ||
    registration.customerId !== value.customerId ||
    registration.sessionId !== value.sessionId ||
    !validation ||
    validation.registrationId !== registration.registrationId ||
    validation.registrationVersion !== registration.registrationVersion ||
    validation.outcome !== "INVALID" ||
    validation.correctability !== "CORRECTABLE" ||
    validation.nextStep !== "CORRECTION_REQUIRED" ||
    validation.findings.length === 0 ||
    validation.findings.some(
      (finding) =>
        finding.severity === "BLOCKING" ||
        !isSupportedRegistrationCorrectionFinding(finding.code),
    ) ||
    !correctionDraft ||
    correctionDraft.registrationId !== registration.registrationId ||
    correctionDraft.originalRegistrationVersion !==
      registration.registrationVersion ||
    correctionDraft.validationId !== validation.validationId ||
    correctionDraft.correctionVersion !==
      value.correctionDraftVersion ||
    correctionDraft.customerId !== value.customerId ||
    correctionDraft.sessionId !== value.sessionId ||
    correctionDraft.status !== "DRAFT" ||
    correctionDraft.rulesAccepted !== true ||
    !session ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY" ||
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(validation) ||
    hasLaterPhaseState(correctionDraft) ||
    hasLaterPhaseState(session)
  )
    return undefined;
  return freezeResubmission(
    value as unknown as AuctionRegistrationResubmission,
  );
};

export const sanitizePersistedAuctionRegistrationResubmissionState = (
  persisted: unknown,
): Pick<AuctionRegistrationResubmissionState, "resubmissions"> => {
  const empty = {
    resubmissions: [] as AuctionRegistrationResubmission[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["resubmissions"]) ||
    !Array.isArray(persisted.resubmissions)
  )
    return empty;
  const records = persisted.resubmissions.map(sanitizeResubmission);
  if (records.some((record) => !record)) return empty;
  const safe = records.filter(
    (record): record is AuctionRegistrationResubmission =>
      Boolean(record),
  );
  if (
    new Set(safe.map((record) => record.resubmissionId)).size !==
      safe.length ||
    new Set(safe.map((record) => record.registrationId)).size !==
      safe.length ||
    new Set(safe.map((record) => record.correctionDraftId)).size !==
      safe.length
  )
    return empty;
  return { resubmissions: safe };
};

export const useAuctionRegistrationResubmissionStore =
  create<AuctionRegistrationResubmissionState>()(
    persist(
      (set, get) => ({
        resubmissions: [],
        getByRegistrationId: (registrationId) =>
          get().resubmissions.find(
            (record) => record.registrationId === registrationId,
          ),
        resubmitCorrectedRegistration: (command) => {
          if (command.actorRole !== "CUSTOMER")
            return failure(
              "ACCESS_DENIED",
              "Only CUSTOMER can resubmit a corrected Registration.",
            );
          if (!command.actorId.trim())
            return failure(
              "INVALID_ACTOR",
              "Authenticated Customer identity is required.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID is invalid.");
          if (Object.keys(command).some((key) => !commandKeys.has(key)))
            return failure(
              "UNSUPPORTED_FIELD",
              "Resubmission command contains unsupported fields.",
            );
          const sameCommand = get().resubmissions.find(
            (record) => record.commandId === command.commandId,
          );
          if (sameCommand) {
            if (sameCommand.customerId !== command.actorId)
              return failure(
                "REGISTRATION_OWNERSHIP_MISMATCH",
                "Customer cannot replay another Customer's Resubmission command.",
              );
            if (
              sameCommand.registrationId !== command.registrationId ||
              sameCommand.originalRegistrationVersion !==
                command.expectedRegistrationVersion ||
              sameCommand.previousValidationId !==
                command.expectedValidationId ||
              sameCommand.correctionDraftId !==
                command.expectedCorrectionDraftId ||
              sameCommand.correctionDraftVersion !==
                command.expectedCorrectionDraftVersion
            )
              return failure(
                "INVALID_COMMAND",
                "Idempotent replay does not match the original Resubmission command.",
              );
            return { ok: true, resubmission: sameCommand, created: false };
          }
          const duplicate = get().resubmissions.find(
            (record) =>
              record.registrationId === command.registrationId ||
              record.correctionDraftId ===
                command.expectedCorrectionDraftId,
          );
          if (duplicate)
            return failure(
              "REGISTRATION_ALREADY_RESUBMITTED",
              "Registration already has a corrected Resubmission.",
              duplicate,
            );
          const eligibility =
            evaluateRegistrationResubmissionEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const firstFingerprint = sourceFingerprint(eligibility.sources);
          const finalEligibility =
            evaluateRegistrationResubmissionEligibility(command);
          if (!finalEligibility.eligible)
            return failure(
              finalEligibility.code,
              finalEligibility.message,
            );
          if (
            sourceFingerprint(finalEligibility.sources) !==
            firstFingerprint
          )
            return failure(
              "AUTHORITATIVE_STATE_CHANGED",
              "Registration, Validation, Draft, or Session changed before commit.",
            );

          const { registration, validation, correctionDraft } =
            finalEligibility.sources;
          const submittedAt = getRegistrationReadinessDeterministicNow();
          const resubmissionId = getRegistrationResubmissionId(
            registration.registrationId,
            validation.validationId,
          );
          const resubmission = freezeResubmission({
            resubmissionId,
            recordVersion: 1,
            registrationId: registration.registrationId,
            originalRegistrationVersion:
              registration.registrationVersion,
            previousValidationId: validation.validationId,
            correctionDraftId: correctionDraft.correctionDraftId,
            correctionDraftVersion:
              correctionDraft.correctionVersion,
            sessionId: registration.sessionId,
            customerId: registration.customerId,
            status: "SUBMITTED",
            nextStep: "REVALIDATION_REQUIRED",
            correctedEvidence: {
              rulesAccepted: true,
              rulesAcceptedAt: submittedAt,
            },
            submittedBy: command.actorId,
            submittedAt,
            commandId: command.commandId,
            history: [
              {
                historyId: `${resubmissionId}-history-1`,
                action: "CORRECTED_REGISTRATION_RESUBMITTED",
                resultingStatus: "SUBMITTED",
                resultingNextStep: "REVALIDATION_REQUIRED",
                actorId: command.actorId,
                actorRole: "CUSTOMER",
                commandId: command.commandId,
                occurredAt: submittedAt,
                visibility: "CUSTOMER_AND_STAFF",
              },
            ],
          });
          set({
            resubmissions: [...get().resubmissions, resubmission],
          });
          return { ok: true, resubmission, created: true };
        },
        resetDeterministicRegistrationResubmissionState: () =>
          set({ resubmissions: [] }),
      }),
      {
        name: AUCTION_REGISTRATION_RESUBMISSION_STORAGE_KEY,
        version: AUCTION_REGISTRATION_RESUBMISSION_SCHEMA_VERSION,
        partialize: (state) => ({
          resubmissions: state.resubmissions,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionRegistrationResubmissionState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
