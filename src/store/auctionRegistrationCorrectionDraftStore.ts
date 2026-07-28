import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  type AuctionCustomerRegistration,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import {
  type AuctionRegistrationValidation,
  type RegistrationValidationFindingCode,
  useAuctionRegistrationValidationStore,
} from "./auctionRegistrationValidationStore";
import { getRegistrationReadinessDeterministicNow } from "./auctionRegistrationOpeningReadinessStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";

export const AUCTION_REGISTRATION_CORRECTION_DRAFT_STORAGE_KEY =
  "sgdg-auction-registration-correction-drafts-v1";
export const AUCTION_REGISTRATION_CORRECTION_DRAFT_SCHEMA_VERSION = 1;
export const PROTOTYPE_REGISTRATION_CORRECTION_MODEL =
  "PROTOTYPE REGISTRATION CORRECTION DRAFT — USER-REQUESTED IMPLEMENTATION — NOT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";
export const REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED =
  "REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED";

export interface RegistrationCorrectionHistoryEntry {
  readonly historyId: string;
  readonly correctionVersion: number;
  readonly action:
    | "REGISTRATION_CORRECTION_DRAFT_CREATED"
    | "REGISTRATION_CORRECTION_DRAFT_SAVED";
  readonly resultingStatus: "DRAFT";
  readonly rulesAccepted: boolean;
  readonly actorId: string;
  readonly actorRole: "CUSTOMER";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "CUSTOMER_AND_STAFF";
}

export interface RegistrationCorrectionDraft {
  readonly correctionDraftId: string;
  readonly correctionVersion: number;
  readonly registrationId: string;
  readonly originalRegistrationVersion: number;
  readonly validationId: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly status: "DRAFT";
  readonly rulesAccepted: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly history: readonly RegistrationCorrectionHistoryEntry[];
}

export interface CreateRegistrationCorrectionDraftCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRegistrationVersion: number;
  expectedValidationId: string;
  commandId: string;
}

export interface SaveRegistrationCorrectionDraftCommand {
  correctionDraftId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedCorrectionVersion: number;
  rulesAccepted: boolean;
  commandId: string;
}

export type RegistrationCorrectionErrorCode =
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
  | typeof REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED
  | "CORRECTION_DRAFT_ALREADY_EXISTS"
  | "CORRECTION_DRAFT_NOT_FOUND"
  | "CORRECTION_DRAFT_OWNERSHIP_MISMATCH"
  | "STALE_CORRECTION_VERSION"
  | "LATER_PHASE_STATE_EXISTS"
  | "AUTHORITATIVE_STATE_CHANGED";

export type RegistrationCorrectionCommandResult =
  | {
      ok: true;
      correctionDraft: RegistrationCorrectionDraft;
      created: boolean;
      changed: boolean;
    }
  | {
      ok: false;
      code: RegistrationCorrectionErrorCode;
      message: string;
      correctionDraft?: RegistrationCorrectionDraft;
    };

export interface AuctionRegistrationCorrectionDraftState {
  correctionDrafts: RegistrationCorrectionDraft[];
  getByRegistrationId: (
    registrationId: string,
  ) => RegistrationCorrectionDraft | undefined;
  createRegistrationCorrectionDraft: (
    command: CreateRegistrationCorrectionDraftCommand,
  ) => RegistrationCorrectionCommandResult;
  saveRegistrationCorrectionDraft: (
    command: SaveRegistrationCorrectionDraftCommand,
  ) => RegistrationCorrectionCommandResult;
  resetDeterministicRegistrationCorrectionDraftState: () => void;
}

type CorrectionSources = {
  registration: AuctionCustomerRegistration;
  validation: AuctionRegistrationValidation;
  session: PersistedAuctionSession;
};

export type RegistrationCorrectionEligibility =
  | {
      eligible: true;
      sources: CorrectionSources;
    }
  | {
      eligible: false;
      code: RegistrationCorrectionErrorCode;
      message: string;
    };

const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));

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

const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);

const correctionDraftIdFor = (registrationId: string) =>
  `registration-correction-draft-${registrationId}`;

const supportedFindingCodes =
  new Set<RegistrationValidationFindingCode>([
    "RULES_ACCEPTANCE_MISSING",
    "RULES_ACCEPTANCE_TIMESTAMP_MISSING",
  ]);

export const isSupportedRegistrationCorrectionFinding = (
  code: RegistrationValidationFindingCode,
) => supportedFindingCodes.has(code);

const createKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedRegistrationVersion",
  "expectedValidationId",
  "commandId",
]);

const saveKeys = new Set([
  "correctionDraftId",
  "actorId",
  "actorRole",
  "expectedCorrectionVersion",
  "rulesAccepted",
  "commandId",
]);

const laterPhaseKeys = [
  "resubmission",
  "resubmittedAt",
  "membership",
  "membershipResult",
  "deposit",
  "depositResult",
  "eligibility",
  "eligibilityResult",
  "publication",
  "publicationId",
  "publishedAt",
] as const;

const hasLaterPhaseState = (value: object) =>
  laterPhaseKeys.some((key) => Reflect.get(value, key) !== undefined);

const failure = (
  code: RegistrationCorrectionErrorCode,
  message: string,
  correctionDraft?: RegistrationCorrectionDraft,
): RegistrationCorrectionCommandResult => ({
  ok: false,
  code,
  message,
  ...(correctionDraft ? { correctionDraft } : {}),
});

const resolveCorrectionSources = ({
  registrationId,
  actorId,
  expectedRegistrationVersion,
  expectedValidationId,
}: {
  registrationId: string;
  actorId: string;
  expectedRegistrationVersion: number;
  expectedValidationId: string;
}): RegistrationCorrectionEligibility => {
  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find((item) => item.registrationId === registrationId);
  if (!registration)
    return {
      eligible: false,
      code: "REGISTRATION_NOT_FOUND",
      message: "Submitted Customer Registration was not found.",
    };
  if (registration.customerId !== actorId)
    return {
      eligible: false,
      code: "REGISTRATION_OWNERSHIP_MISMATCH",
      message: "Customer cannot correct another Customer's Registration.",
    };
  if (registration.status !== "SUBMITTED")
    return {
      eligible: false,
      code: "REGISTRATION_NOT_SUBMITTED",
      message: "Only a SUBMITTED Registration can start correction.",
    };
  if (registration.registrationVersion !== expectedRegistrationVersion)
    return {
      eligible: false,
      code: "STALE_REGISTRATION_VERSION",
      message: "Original Registration version changed.",
    };
  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validations.find(
      (item) => item.registrationId === registration.registrationId,
    );
  if (!validation)
    return {
      eligible: false,
      code: "VALIDATION_NOT_FOUND",
      message: "Registration Validation Record was not found.",
    };
  if (
    validation.validationId !== expectedValidationId ||
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
  if (validation.findings.some((item) => item.severity === "BLOCKING"))
    return {
      eligible: false,
      code: "BLOCKING_VALIDATION",
      message: "A blocking Validation cannot create a Correction Draft.",
    };
  if (
    validation.outcome !== "INVALID" ||
    validation.correctability !== "CORRECTABLE" ||
    validation.nextStep !== "CORRECTION_REQUIRED"
  )
    return {
      eligible: false,
      code: "CORRECTION_REQUIRED",
      message: "Validation must require a correctable correction.",
    };
  const unsupported = validation.findings.find(
    (item) => !supportedFindingCodes.has(item.code),
  );
  if (unsupported)
    return {
      eligible: false,
      code: REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED,
      message: `${unsupported.code} cannot be corrected using rulesAccepted.`,
    };
  if (validation.findings.length === 0)
    return {
      eligible: false,
      code: "CORRECTION_REQUIRED",
      message: "Correctable Validation findings are required.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === registration.sessionId);
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "VALIDATION_REFERENCE_MISMATCH",
      message: "Correction supports only a dynamic Customer Session.",
    };
  if (
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(validation) ||
    hasLaterPhaseState(session)
  )
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message:
        "Resubmission, Membership, Deposit, Eligibility, or Publication state exists.",
    };
  return { eligible: true, sources: { registration, validation, session } };
};

export const evaluateRegistrationCorrectionEligibility = ({
  registrationId,
  actorId,
  actorRole,
  expectedRegistrationVersion,
  expectedValidationId,
  commandId,
}: CreateRegistrationCorrectionDraftCommand): RegistrationCorrectionEligibility => {
  if (actorRole !== "CUSTOMER")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Only CUSTOMER can create a Registration Correction Draft.",
    };
  if (!actorId.trim())
    return {
      eligible: false,
      code: "INVALID_ACTOR",
      message: "Authenticated Customer identity is required.",
    };
  if (!validCommandId(commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID is invalid.",
    };
  return resolveCorrectionSources({
    registrationId,
    actorId,
    expectedRegistrationVersion,
    expectedValidationId,
  });
};

const freezeCorrectionDraft = (
  draft: RegistrationCorrectionDraft,
): RegistrationCorrectionDraft =>
  Object.freeze({
    ...draft,
    history: Object.freeze(
      draft.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

const sourceFingerprint = (sources: CorrectionSources) =>
  JSON.stringify({
    registration: sources.registration,
    validation: sources.validation,
    session: {
      sessionId: sources.session.sessionId,
      currentVersion: sources.session.currentVersion,
      lifecycleStatus: sources.session.lifecycleStatus,
      publicationStatus: sources.session.publicationStatus,
    },
  });

const forbiddenPersistenceKeys = new Set([
  ...laterPhaseKeys,
  "submissionRecord",
  "submittedAt",
  "approval",
  "approvedAt",
  "rejection",
  "rejectedAt",
  "correctionSubmittedAt",
]);

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

const validHistory = (
  value: unknown,
  correctionDraftId: string,
  maxVersion: number,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "historyId",
    "correctionVersion",
    "action",
    "resultingStatus",
    "rulesAccepted",
    "actorId",
    "actorRole",
    "commandId",
    "occurredAt",
    "visibility",
  ]) &&
  value.historyId ===
    `${correctionDraftId}-history-${String(value.correctionVersion)}` &&
  positiveInteger(value.correctionVersion) &&
  value.correctionVersion <= maxVersion &&
  (value.action === "REGISTRATION_CORRECTION_DRAFT_CREATED" ||
    value.action === "REGISTRATION_CORRECTION_DRAFT_SAVED") &&
  value.resultingStatus === "DRAFT" &&
  typeof value.rulesAccepted === "boolean" &&
  typeof value.actorId === "string" &&
  value.actorRole === "CUSTOMER" &&
  typeof value.commandId === "string" &&
  validCommandId(value.commandId) &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "CUSTOMER_AND_STAFF";

const sanitizeCorrectionDraft = (
  value: unknown,
): RegistrationCorrectionDraft | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "correctionDraftId",
      "correctionVersion",
      "registrationId",
      "originalRegistrationVersion",
      "validationId",
      "sessionId",
      "customerId",
      "status",
      "rulesAccepted",
      "createdBy",
      "createdAt",
      "updatedAt",
      "history",
    ]) ||
    typeof value.registrationId !== "string" ||
    value.correctionDraftId !== correctionDraftIdFor(value.registrationId) ||
    !positiveInteger(value.correctionVersion) ||
    !positiveInteger(value.originalRegistrationVersion) ||
    typeof value.validationId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.customerId !== "string" ||
    !value.customerId.trim() ||
    value.status !== "DRAFT" ||
    typeof value.rulesAccepted !== "boolean" ||
    value.createdBy !== value.customerId ||
    !validIsoTime(value.createdAt) ||
    !validIsoTime(value.updatedAt) ||
    Date.parse(value.updatedAt) < Date.parse(value.createdAt) ||
    !Array.isArray(value.history) ||
    value.history.length !== value.correctionVersion ||
    !value.history.every((entry) =>
      validHistory(
        entry,
        value.correctionDraftId as string,
        value.correctionVersion as number,
      ),
    )
  )
    return undefined;
  const history = value.history as Record<string, unknown>[];
  if (
    history.some(
      (entry, index) => entry.correctionVersion !== index + 1,
    ) ||
    history[0].action !== "REGISTRATION_CORRECTION_DRAFT_CREATED" ||
    history.slice(1).some(
      (entry) => entry.action !== "REGISTRATION_CORRECTION_DRAFT_SAVED",
    ) ||
    history.some((entry) => entry.actorId !== value.customerId) ||
    history[history.length - 1].rulesAccepted !== value.rulesAccepted ||
    history[0].occurredAt !== value.createdAt ||
    history[history.length - 1].occurredAt !== value.updatedAt
  )
    return undefined;

  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === value.registrationId,
    );
  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validations.find((item) => item.validationId === value.validationId);
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === value.sessionId);
  if (
    !registration ||
    registration.status !== "SUBMITTED" ||
    registration.registrationVersion !== value.originalRegistrationVersion ||
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
      (item) =>
        item.severity === "BLOCKING" ||
        !supportedFindingCodes.has(item.code),
    ) ||
    !session ||
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(validation) ||
    hasLaterPhaseState(session)
  )
    return undefined;
  return freezeCorrectionDraft(
    value as unknown as RegistrationCorrectionDraft,
  );
};

export const sanitizePersistedAuctionRegistrationCorrectionDraftState = (
  persisted: unknown,
): Pick<AuctionRegistrationCorrectionDraftState, "correctionDrafts"> => {
  const empty = {
    correctionDrafts: [] as RegistrationCorrectionDraft[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["correctionDrafts"]) ||
    !Array.isArray(persisted.correctionDrafts)
  )
    return empty;
  const drafts = persisted.correctionDrafts.map(sanitizeCorrectionDraft);
  if (drafts.some((draft) => !draft)) return empty;
  const safe = drafts.filter(
    (draft): draft is RegistrationCorrectionDraft => Boolean(draft),
  );
  if (
    new Set(safe.map((draft) => draft.correctionDraftId)).size !==
      safe.length ||
    new Set(safe.map((draft) => draft.registrationId)).size !== safe.length
  )
    return empty;
  return { correctionDrafts: safe };
};

export const useAuctionRegistrationCorrectionDraftStore =
  create<AuctionRegistrationCorrectionDraftState>()(
    persist(
      (set, get) => ({
        correctionDrafts: [],
        getByRegistrationId: (registrationId) =>
          get().correctionDrafts.find(
            (draft) => draft.registrationId === registrationId,
          ),
        createRegistrationCorrectionDraft: (command) => {
          if (command.actorRole !== "CUSTOMER")
            return failure(
              "ACCESS_DENIED",
              "Only CUSTOMER can create a Registration Correction Draft.",
            );
          if (!command.actorId.trim())
            return failure(
              "INVALID_ACTOR",
              "Authenticated Customer identity is required.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID is invalid.");
          if (Object.keys(command).some((key) => !createKeys.has(key)))
            return failure(
              "UNSUPPORTED_FIELD",
              "Create Correction Draft command contains unsupported fields.",
            );
          const sameCommand = get().correctionDrafts.find((draft) =>
            draft.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "REGISTRATION_CORRECTION_DRAFT_CREATED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              correctionDraft: sameCommand,
              created: false,
              changed: false,
            };
          const existing = get().correctionDrafts.find(
            (draft) => draft.registrationId === command.registrationId,
          );
          if (existing)
            return failure(
              "CORRECTION_DRAFT_ALREADY_EXISTS",
              "Registration already has a Correction Draft.",
              existing,
            );
          const eligibility = evaluateRegistrationCorrectionEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const firstFingerprint = sourceFingerprint(eligibility.sources);
          const finalEligibility =
            evaluateRegistrationCorrectionEligibility(command);
          if (!finalEligibility.eligible)
            return failure(finalEligibility.code, finalEligibility.message);
          if (
            sourceFingerprint(finalEligibility.sources) !== firstFingerprint
          )
            return failure(
              "AUTHORITATIVE_STATE_CHANGED",
              "Registration or Validation changed before correction commit.",
            );
          const { registration, validation } = finalEligibility.sources;
          const occurredAt = getRegistrationReadinessDeterministicNow();
          const correctionDraftId = correctionDraftIdFor(
            registration.registrationId,
          );
          const draft = freezeCorrectionDraft({
            correctionDraftId,
            correctionVersion: 1,
            registrationId: registration.registrationId,
            originalRegistrationVersion:
              registration.registrationVersion,
            validationId: validation.validationId,
            sessionId: registration.sessionId,
            customerId: registration.customerId,
            status: "DRAFT",
            rulesAccepted: registration.rulesAccepted,
            createdBy: command.actorId,
            createdAt: occurredAt,
            updatedAt: occurredAt,
            history: [
              {
                historyId: `${correctionDraftId}-history-1`,
                correctionVersion: 1,
                action: "REGISTRATION_CORRECTION_DRAFT_CREATED",
                resultingStatus: "DRAFT",
                rulesAccepted: registration.rulesAccepted,
                actorId: command.actorId,
                actorRole: "CUSTOMER",
                commandId: command.commandId,
                occurredAt,
                visibility: "CUSTOMER_AND_STAFF",
              },
            ],
          });
          set({ correctionDrafts: [...get().correctionDrafts, draft] });
          return {
            ok: true,
            correctionDraft: draft,
            created: true,
            changed: true,
          };
        },
        saveRegistrationCorrectionDraft: (command) => {
          if (command.actorRole !== "CUSTOMER")
            return failure(
              "ACCESS_DENIED",
              "Only CUSTOMER can save a Registration Correction Draft.",
            );
          if (!command.actorId.trim())
            return failure(
              "INVALID_ACTOR",
              "Authenticated Customer identity is required.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID is invalid.");
          if (Object.keys(command).some((key) => !saveKeys.has(key)))
            return failure(
              "UNSUPPORTED_FIELD",
              "Only rulesAccepted may be saved.",
            );
          const sameCommand = get().correctionDrafts.find((draft) =>
            draft.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "REGISTRATION_CORRECTION_DRAFT_SAVED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              correctionDraft: sameCommand,
              created: false,
              changed: false,
            };
          const draft = get().correctionDrafts.find(
            (item) => item.correctionDraftId === command.correctionDraftId,
          );
          if (!draft)
            return failure(
              "CORRECTION_DRAFT_NOT_FOUND",
              "Registration Correction Draft was not found.",
            );
          if (draft.customerId !== command.actorId)
            return failure(
              "CORRECTION_DRAFT_OWNERSHIP_MISMATCH",
              "Customer cannot save another Customer's Correction Draft.",
            );
          if (draft.correctionVersion !== command.expectedCorrectionVersion)
            return failure(
              "STALE_CORRECTION_VERSION",
              "Correction Draft version changed.",
              draft,
            );
          const sourceCheck = resolveCorrectionSources({
            registrationId: draft.registrationId,
            actorId: command.actorId,
            expectedRegistrationVersion:
              draft.originalRegistrationVersion,
            expectedValidationId: draft.validationId,
          });
          if (!sourceCheck.eligible)
            return failure(sourceCheck.code, sourceCheck.message, draft);
          if (draft.rulesAccepted === command.rulesAccepted)
            return {
              ok: true,
              correctionDraft: draft,
              created: false,
              changed: false,
            };
          const nextVersion = draft.correctionVersion + 1;
          const occurredAt = getRegistrationReadinessDeterministicNow();
          const next = freezeCorrectionDraft({
            ...draft,
            correctionVersion: nextVersion,
            rulesAccepted: command.rulesAccepted,
            updatedAt: occurredAt,
            history: [
              ...draft.history,
              {
                historyId: `${draft.correctionDraftId}-history-${nextVersion}`,
                correctionVersion: nextVersion,
                action: "REGISTRATION_CORRECTION_DRAFT_SAVED",
                resultingStatus: "DRAFT",
                rulesAccepted: command.rulesAccepted,
                actorId: command.actorId,
                actorRole: "CUSTOMER",
                commandId: command.commandId,
                occurredAt,
                visibility: "CUSTOMER_AND_STAFF",
              },
            ],
          });
          set({
            correctionDrafts: get().correctionDrafts.map((item) =>
              item.correctionDraftId === next.correctionDraftId
                ? next
                : item,
            ),
          });
          return {
            ok: true,
            correctionDraft: next,
            created: false,
            changed: true,
          };
        },
        resetDeterministicRegistrationCorrectionDraftState: () =>
          set({ correctionDrafts: [] }),
      }),
      {
        name: AUCTION_REGISTRATION_CORRECTION_DRAFT_STORAGE_KEY,
        version: AUCTION_REGISTRATION_CORRECTION_DRAFT_SCHEMA_VERSION,
        partialize: (state) => ({
          correctionDrafts: state.correctionDrafts,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionRegistrationCorrectionDraftState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
