import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  type AuctionCustomerRegistration,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import {
  type RegistrationCorrectionDraft,
  useAuctionRegistrationCorrectionDraftStore,
} from "./auctionRegistrationCorrectionDraftStore";
import { getRegistrationReadinessDeterministicNow } from "./auctionRegistrationOpeningReadinessStore";
import {
  type AuctionRegistrationResubmission,
  useAuctionRegistrationResubmissionStore,
} from "./auctionRegistrationResubmissionStore";
import {
  type AuctionRegistrationValidation,
  useAuctionRegistrationValidationStore,
} from "./auctionRegistrationValidationStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";

export const AUCTION_REGISTRATION_REVALIDATION_STORAGE_KEY =
  "sgdg-auction-registration-revalidations-v1";
export const AUCTION_REGISTRATION_REVALIDATION_SCHEMA_VERSION = 1;
export const PROTOTYPE_REGISTRATION_REVALIDATION_MODEL =
  "PROTOTYPE CORRECTED REGISTRATION REVALIDATION — deterministic evidence evaluation only; the current Registration Window need not remain open. Requires stakeholder confirmation.";

export type RegistrationRevalidationFindingCode =
  | "CORRECTED_RULES_ACCEPTANCE_MISSING"
  | "CORRECTED_RULES_ACCEPTANCE_TIMESTAMP_MISSING"
  | "RESUBMISSION_TIMESTAMP_MISSING"
  | "RESUBMISSION_EVIDENCE_INCONSISTENT"
  | "UNSUPPORTED_RESUBMISSION_DATA";

export interface RegistrationRevalidationFinding {
  readonly code: RegistrationRevalidationFindingCode;
  readonly severity: "CORRECTABLE" | "BLOCKING";
  readonly message: string;
}

export interface RegistrationRevalidationHistoryEntry {
  readonly historyId: string;
  readonly action: "CORRECTED_REGISTRATION_REVALIDATED";
  readonly outcome: "VALID" | "INVALID";
  readonly correctability:
    | "NOT_APPLICABLE"
    | "CORRECTABLE"
    | "BLOCKING";
  readonly nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED_AGAIN"
    | "INVALID_BLOCKING";
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionRegistrationRevalidation {
  readonly revalidationId: string;
  readonly recordVersion: 1;
  readonly registrationId: string;
  readonly previousValidationId: string;
  readonly correctionDraftId: string;
  readonly correctionDraftVersion: number;
  readonly resubmissionId: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly outcome: "VALID" | "INVALID";
  readonly correctability:
    | "NOT_APPLICABLE"
    | "CORRECTABLE"
    | "BLOCKING";
  readonly nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED_AGAIN"
    | "INVALID_BLOCKING";
  readonly findings: readonly RegistrationRevalidationFinding[];
  readonly evidence: {
    readonly rulesAccepted: boolean;
    readonly rulesAcceptedAt: string;
    readonly resubmittedAt: string;
    readonly findingCodes: readonly RegistrationRevalidationFindingCode[];
    readonly evaluatedAt: string;
  };
  readonly validatedBy: string;
  readonly validatedAt: string;
  readonly commandId: string;
  readonly history: readonly RegistrationRevalidationHistoryEntry[];
}

export interface RevalidateCorrectedRegistrationCommand {
  resubmissionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRegistrationId: string;
  expectedPreviousValidationId: string;
  expectedCorrectionDraftId: string;
  expectedCorrectionDraftVersion: number;
  commandId: string;
}

export type RegistrationRevalidationErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_ACTOR"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "RESUBMISSION_NOT_FOUND"
  | "REVALIDATION_REQUIRED"
  | "REGISTRATION_NOT_FOUND"
  | "VALIDATION_NOT_FOUND"
  | "CORRECTION_DRAFT_NOT_FOUND"
  | "SOURCE_REFERENCE_MISMATCH"
  | "REGISTRATION_ALREADY_REVALIDATED"
  | "LATER_PHASE_STATE_EXISTS"
  | "AUTHORITATIVE_STATE_CHANGED";

export type RegistrationRevalidationCommandResult =
  | {
      ok: true;
      revalidation: AuctionRegistrationRevalidation;
      created: boolean;
    }
  | {
      ok: false;
      code: RegistrationRevalidationErrorCode;
      message: string;
      revalidation?: AuctionRegistrationRevalidation;
    };

export interface AuctionRegistrationRevalidationState {
  revalidations: AuctionRegistrationRevalidation[];
  getByResubmissionId: (
    resubmissionId: string,
  ) => AuctionRegistrationRevalidation | undefined;
  revalidateCorrectedRegistration: (
    command: RevalidateCorrectedRegistrationCommand,
  ) => RegistrationRevalidationCommandResult;
  resetDeterministicRegistrationRevalidationState: () => void;
}

type RevalidationSources = {
  registration: AuctionCustomerRegistration;
  previousValidation: AuctionRegistrationValidation;
  correctionDraft: RegistrationCorrectionDraft;
  resubmission: AuctionRegistrationResubmission;
  session: PersistedAuctionSession;
};

export type RegistrationRevalidationEligibility =
  | { eligible: true; sources: RevalidationSources }
  | {
      eligible: false;
      code: RegistrationRevalidationErrorCode;
      message: string;
    };

export type RegistrationRevalidationEvaluation = {
  outcome: "VALID" | "INVALID";
  correctability: "NOT_APPLICABLE" | "CORRECTABLE" | "BLOCKING";
  nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED_AGAIN"
    | "INVALID_BLOCKING";
  findings: readonly RegistrationRevalidationFinding[];
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

export const getRegistrationRevalidationId = (resubmissionId: string) =>
  `registration-revalidation-${resubmissionId}`;

const resubmissionKeys = new Set([
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
]);

export const evaluateCorrectedRegistrationEvidence = (
  value: AuctionRegistrationResubmission | Record<string, unknown>,
): RegistrationRevalidationEvaluation => {
  const findings: RegistrationRevalidationFinding[] = [];
  const evidence = Reflect.get(value, "correctedEvidence");
  const rulesAccepted =
    isRecord(evidence) && evidence.rulesAccepted === true;
  const rulesAcceptedAt = isRecord(evidence)
    ? evidence.rulesAcceptedAt
    : undefined;
  const resubmittedAt = Reflect.get(value, "submittedAt");
  if (!rulesAccepted)
    findings.push({
      code: "CORRECTED_RULES_ACCEPTANCE_MISSING",
      severity: "CORRECTABLE",
      message: "Corrected Auction rules acceptance is missing.",
    });
  if (!validIsoTime(rulesAcceptedAt))
    findings.push({
      code: "CORRECTED_RULES_ACCEPTANCE_TIMESTAMP_MISSING",
      severity: "CORRECTABLE",
      message: "Corrected rules acceptance timestamp is missing.",
    });
  if (!validIsoTime(resubmittedAt))
    findings.push({
      code: "RESUBMISSION_TIMESTAMP_MISSING",
      severity: "BLOCKING",
      message: "Corrected Resubmission timestamp is missing.",
    });
  if (
    validIsoTime(rulesAcceptedAt) &&
    validIsoTime(resubmittedAt) &&
    rulesAcceptedAt !== resubmittedAt
  )
    findings.push({
      code: "RESUBMISSION_EVIDENCE_INCONSISTENT",
      severity: "BLOCKING",
      message:
        "Rules acceptance and Resubmission timestamps are inconsistent.",
    });
  if (Object.keys(value).some((key) => !resubmissionKeys.has(key)))
    findings.push({
      code: "UNSUPPORTED_RESUBMISSION_DATA",
      severity: "BLOCKING",
      message: "Corrected Resubmission contains unsupported data.",
    });
  if (findings.some((finding) => finding.severity === "BLOCKING"))
    return {
      outcome: "INVALID",
      correctability: "BLOCKING",
      nextStep: "INVALID_BLOCKING",
      findings,
    };
  if (findings.length > 0)
    return {
      outcome: "INVALID",
      correctability: "CORRECTABLE",
      nextStep: "CORRECTION_REQUIRED_AGAIN",
      findings,
    };
  return {
    outcome: "VALID",
    correctability: "NOT_APPLICABLE",
    nextStep: "READY_FOR_MEMBERSHIP_CHECK",
    findings: [],
  };
};

const commandKeys = new Set([
  "resubmissionId",
  "actorId",
  "actorRole",
  "expectedRegistrationId",
  "expectedPreviousValidationId",
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
  code: RegistrationRevalidationErrorCode,
  message: string,
  revalidation?: AuctionRegistrationRevalidation,
): RegistrationRevalidationCommandResult => ({
  ok: false,
  code,
  message,
  ...(revalidation ? { revalidation } : {}),
});

const resolveRevalidationSources = (
  command: RevalidateCorrectedRegistrationCommand,
): RegistrationRevalidationEligibility => {
  const resubmission = useAuctionRegistrationResubmissionStore
    .getState()
    .resubmissions.find(
      (item) => item.resubmissionId === command.resubmissionId,
    );
  if (!resubmission)
    return {
      eligible: false,
      code: "RESUBMISSION_NOT_FOUND",
      message: "Corrected Registration Resubmission was not found.",
    };
  if (
    resubmission.recordVersion !== 1 ||
    resubmission.status !== "SUBMITTED" ||
    resubmission.nextStep !== "REVALIDATION_REQUIRED"
  )
    return {
      eligible: false,
      code: "REVALIDATION_REQUIRED",
      message: "A SUBMITTED REVALIDATION_REQUIRED record is mandatory.",
    };
  if (
    resubmission.registrationId !== command.expectedRegistrationId ||
    resubmission.previousValidationId !==
      command.expectedPreviousValidationId ||
    resubmission.correctionDraftId !==
      command.expectedCorrectionDraftId ||
    resubmission.correctionDraftVersion !==
      command.expectedCorrectionDraftVersion
  )
    return {
      eligible: false,
      code: "SOURCE_REFERENCE_MISMATCH",
      message: "Expected source references do not match the Resubmission.",
    };

  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === resubmission.registrationId,
    );
  if (!registration)
    return {
      eligible: false,
      code: "REGISTRATION_NOT_FOUND",
      message: "Original Registration was not found.",
    };
  const previousValidation = useAuctionRegistrationValidationStore
    .getState()
    .validations.find(
      (item) => item.validationId === resubmission.previousValidationId,
    );
  if (!previousValidation)
    return {
      eligible: false,
      code: "VALIDATION_NOT_FOUND",
      message: "Previous Validation was not found.",
    };
  const correctionDraft = useAuctionRegistrationCorrectionDraftStore
    .getState()
    .correctionDrafts.find(
      (item) =>
        item.correctionDraftId === resubmission.correctionDraftId,
    );
  if (!correctionDraft)
    return {
      eligible: false,
      code: "CORRECTION_DRAFT_NOT_FOUND",
      message: "Correction Draft was not found.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === resubmission.sessionId);
  if (
    registration.status !== "SUBMITTED" ||
    registration.registrationVersion !==
      resubmission.originalRegistrationVersion ||
    registration.customerId !== resubmission.customerId ||
    registration.sessionId !== resubmission.sessionId ||
    previousValidation.registrationId !== registration.registrationId ||
    previousValidation.registrationVersion !==
      registration.registrationVersion ||
    previousValidation.customerId !== registration.customerId ||
    previousValidation.sessionId !== registration.sessionId ||
    previousValidation.validationId !==
      resubmission.previousValidationId ||
    correctionDraft.registrationId !== registration.registrationId ||
    correctionDraft.originalRegistrationVersion !==
      registration.registrationVersion ||
    correctionDraft.validationId !== previousValidation.validationId ||
    correctionDraft.correctionDraftId !==
      resubmission.correctionDraftId ||
    correctionDraft.correctionVersion !==
      resubmission.correctionDraftVersion ||
    correctionDraft.customerId !== registration.customerId ||
    correctionDraft.sessionId !== registration.sessionId ||
    resubmission.submittedBy !== registration.customerId ||
    !session ||
    session.sessionId !== registration.sessionId ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY"
  )
    return {
      eligible: false,
      code: "SOURCE_REFERENCE_MISMATCH",
      message: "The immutable Registration source chain is inconsistent.",
    };
  if (
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(previousValidation) ||
    hasLaterPhaseState(correctionDraft) ||
    hasLaterPhaseState(resubmission) ||
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
    sources: {
      registration,
      previousValidation,
      correctionDraft,
      resubmission,
      session,
    },
  };
};

export const evaluateRegistrationRevalidationEligibility = (
  command: RevalidateCorrectedRegistrationCommand,
): RegistrationRevalidationEligibility => {
  if (command.actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Only ADMIN can revalidate a corrected Registration.",
    };
  if (!command.actorId.trim())
    return {
      eligible: false,
      code: "INVALID_ACTOR",
      message: "Authenticated ADMIN identity is required.",
    };
  if (!validCommandId(command.commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID is invalid.",
    };
  return resolveRevalidationSources(command);
};

const sourceFingerprint = (sources: RevalidationSources) =>
  JSON.stringify({
    registration: sources.registration,
    previousValidation: sources.previousValidation,
    correctionDraft: sources.correctionDraft,
    resubmission: sources.resubmission,
    session: {
      sessionId: sources.session.sessionId,
      currentVersion: sources.session.currentVersion,
      lifecycleStatus: sources.session.lifecycleStatus,
      publicationStatus: sources.session.publicationStatus,
    },
  });

const freezeRevalidation = (
  value: AuctionRegistrationRevalidation,
): AuctionRegistrationRevalidation =>
  Object.freeze({
    ...value,
    findings: Object.freeze(
      value.findings.map((finding) => Object.freeze({ ...finding })),
    ),
    evidence: Object.freeze({
      ...value.evidence,
      findingCodes: Object.freeze([...value.evidence.findingCodes]),
    }),
    history: Object.freeze(
      value.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

const findingSeverity = (
  code: RegistrationRevalidationFindingCode,
): "CORRECTABLE" | "BLOCKING" =>
  code === "CORRECTED_RULES_ACCEPTANCE_MISSING" ||
  code === "CORRECTED_RULES_ACCEPTANCE_TIMESTAMP_MISSING"
    ? "CORRECTABLE"
    : "BLOCKING";

const validFinding = (
  value: unknown,
): value is RegistrationRevalidationFinding =>
  isRecord(value) &&
  exactKeys(value, ["code", "severity", "message"]) &&
  [
    "CORRECTED_RULES_ACCEPTANCE_MISSING",
    "CORRECTED_RULES_ACCEPTANCE_TIMESTAMP_MISSING",
    "RESUBMISSION_TIMESTAMP_MISSING",
    "RESUBMISSION_EVIDENCE_INCONSISTENT",
    "UNSUPPORTED_RESUBMISSION_DATA",
  ].includes(value.code as string) &&
  value.severity ===
    findingSeverity(value.code as RegistrationRevalidationFindingCode) &&
  typeof value.message === "string" &&
  value.message.length > 0;

const validMapping = (
  outcome: unknown,
  correctability: unknown,
  nextStep: unknown,
  findings: readonly RegistrationRevalidationFinding[],
) => {
  const blocking = findings.some(
    (finding) => finding.severity === "BLOCKING",
  );
  if (blocking)
    return (
      outcome === "INVALID" &&
      correctability === "BLOCKING" &&
      nextStep === "INVALID_BLOCKING"
    );
  if (findings.length > 0)
    return (
      outcome === "INVALID" &&
      correctability === "CORRECTABLE" &&
      nextStep === "CORRECTION_REQUIRED_AGAIN"
    );
  return (
    outcome === "VALID" &&
    correctability === "NOT_APPLICABLE" &&
    nextStep === "READY_FOR_MEMBERSHIP_CHECK"
  );
};

const sanitizeRevalidation = (
  value: unknown,
): AuctionRegistrationRevalidation | undefined => {
  if (
    !isRecord(value) ||
    hasLaterPhaseState(value) ||
    !exactKeys(value, [
      "revalidationId",
      "recordVersion",
      "registrationId",
      "previousValidationId",
      "correctionDraftId",
      "correctionDraftVersion",
      "resubmissionId",
      "sessionId",
      "customerId",
      "outcome",
      "correctability",
      "nextStep",
      "findings",
      "evidence",
      "validatedBy",
      "validatedAt",
      "commandId",
      "history",
    ]) ||
    typeof value.resubmissionId !== "string" ||
    value.revalidationId !==
      getRegistrationRevalidationId(value.resubmissionId) ||
    value.recordVersion !== 1 ||
    typeof value.registrationId !== "string" ||
    typeof value.previousValidationId !== "string" ||
    typeof value.correctionDraftId !== "string" ||
    !positiveInteger(value.correctionDraftVersion) ||
    typeof value.sessionId !== "string" ||
    typeof value.customerId !== "string" ||
    !Array.isArray(value.findings) ||
    !value.findings.every(validFinding) ||
    new Set(
      value.findings.map((finding) =>
        Reflect.get(finding, "code"),
      ),
    ).size !== value.findings.length ||
    !isRecord(value.evidence) ||
    !exactKeys(value.evidence, [
      "rulesAccepted",
      "rulesAcceptedAt",
      "resubmittedAt",
      "findingCodes",
      "evaluatedAt",
    ]) ||
    typeof value.evidence.rulesAccepted !== "boolean" ||
    typeof value.evidence.rulesAcceptedAt !== "string" ||
    typeof value.evidence.resubmittedAt !== "string" ||
    !Array.isArray(value.evidence.findingCodes) ||
    value.evidence.findingCodes.length !== value.findings.length ||
    value.evidence.findingCodes.some(
      (code, index) =>
        code !==
        Reflect.get(
          (value.findings as unknown[])[index] as object,
          "code",
        ),
    ) ||
    !validIsoTime(value.evidence.evaluatedAt) ||
    typeof value.validatedBy !== "string" ||
    !value.validatedBy.trim() ||
    !validIsoTime(value.validatedAt) ||
    value.validatedAt !== value.evidence.evaluatedAt ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId) ||
    !validMapping(
      value.outcome,
      value.correctability,
      value.nextStep,
      value.findings as RegistrationRevalidationFinding[],
    ) ||
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
      "outcome",
      "correctability",
      "nextStep",
      "actorId",
      "actorRole",
      "commandId",
      "occurredAt",
      "visibility",
    ]) ||
    history.historyId !== `${value.revalidationId}-history-1` ||
    history.action !== "CORRECTED_REGISTRATION_REVALIDATED" ||
    history.outcome !== value.outcome ||
    history.correctability !== value.correctability ||
    history.nextStep !== value.nextStep ||
    history.actorId !== value.validatedBy ||
    history.actorRole !== "ADMIN" ||
    history.commandId !== value.commandId ||
    history.occurredAt !== value.validatedAt ||
    history.visibility !== "STAFF_ONLY"
  )
    return undefined;

  const resubmission = useAuctionRegistrationResubmissionStore
    .getState()
    .resubmissions.find(
      (item) => item.resubmissionId === value.resubmissionId,
    );
  if (!resubmission) return undefined;
  const sourceCheck = resolveRevalidationSources({
    resubmissionId: resubmission.resubmissionId,
    actorId: value.validatedBy as string,
    actorRole: "ADMIN",
    expectedRegistrationId: value.registrationId as string,
    expectedPreviousValidationId:
      value.previousValidationId as string,
    expectedCorrectionDraftId: value.correctionDraftId as string,
    expectedCorrectionDraftVersion:
      value.correctionDraftVersion as number,
    commandId: value.commandId as string,
  });
  if (!sourceCheck.eligible) return undefined;
  const evaluation = evaluateCorrectedRegistrationEvidence(resubmission);
  if (
    evaluation.outcome !== value.outcome ||
    evaluation.correctability !== value.correctability ||
    evaluation.nextStep !== value.nextStep ||
    JSON.stringify(evaluation.findings) !==
      JSON.stringify(value.findings) ||
    value.evidence.rulesAccepted !==
      resubmission.correctedEvidence.rulesAccepted ||
    value.evidence.rulesAcceptedAt !==
      resubmission.correctedEvidence.rulesAcceptedAt ||
    value.evidence.resubmittedAt !== resubmission.submittedAt
  )
    return undefined;
  return freezeRevalidation(
    value as unknown as AuctionRegistrationRevalidation,
  );
};

export const sanitizePersistedAuctionRegistrationRevalidationState = (
  persisted: unknown,
): Pick<AuctionRegistrationRevalidationState, "revalidations"> => {
  const empty = {
    revalidations: [] as AuctionRegistrationRevalidation[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["revalidations"]) ||
    !Array.isArray(persisted.revalidations)
  )
    return empty;
  const records = persisted.revalidations.map(sanitizeRevalidation);
  if (records.some((record) => !record)) return empty;
  const safe = records.filter(
    (record): record is AuctionRegistrationRevalidation =>
      Boolean(record),
  );
  if (
    new Set(safe.map((record) => record.revalidationId)).size !==
      safe.length ||
    new Set(safe.map((record) => record.resubmissionId)).size !==
      safe.length
  )
    return empty;
  return { revalidations: safe };
};

export const useAuctionRegistrationRevalidationStore =
  create<AuctionRegistrationRevalidationState>()(
    persist(
      (set, get) => ({
        revalidations: [],
        getByResubmissionId: (resubmissionId) =>
          get().revalidations.find(
            (record) => record.resubmissionId === resubmissionId,
          ),
        revalidateCorrectedRegistration: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Only ADMIN can revalidate a corrected Registration.",
            );
          if (!command.actorId.trim())
            return failure(
              "INVALID_ACTOR",
              "Authenticated ADMIN identity is required.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID is invalid.");
          if (Object.keys(command).some((key) => !commandKeys.has(key)))
            return failure(
              "UNSUPPORTED_FIELD",
              "Revalidation command contains unsupported fields.",
            );
          const sameCommand = get().revalidations.find(
            (record) => record.commandId === command.commandId,
          );
          if (sameCommand) {
            if (
              sameCommand.validatedBy !== command.actorId ||
              sameCommand.resubmissionId !== command.resubmissionId ||
              sameCommand.registrationId !==
                command.expectedRegistrationId ||
              sameCommand.previousValidationId !==
                command.expectedPreviousValidationId ||
              sameCommand.correctionDraftId !==
                command.expectedCorrectionDraftId ||
              sameCommand.correctionDraftVersion !==
                command.expectedCorrectionDraftVersion
            )
              return failure(
                "INVALID_COMMAND",
                "Idempotent replay does not match the original Revalidation command.",
              );
            return {
              ok: true,
              revalidation: sameCommand,
              created: false,
            };
          }
          const duplicate = get().revalidations.find(
            (record) =>
              record.resubmissionId === command.resubmissionId,
          );
          if (duplicate)
            return failure(
              "REGISTRATION_ALREADY_REVALIDATED",
              "Corrected Registration has already been revalidated.",
              duplicate,
            );
          const eligibility =
            evaluateRegistrationRevalidationEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const firstFingerprint = sourceFingerprint(eligibility.sources);
          const finalEligibility =
            evaluateRegistrationRevalidationEligibility(command);
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
              "Revalidation sources changed before commit.",
            );

          const { resubmission } = finalEligibility.sources;
          const evaluation =
            evaluateCorrectedRegistrationEvidence(resubmission);
          const validatedAt = getRegistrationReadinessDeterministicNow();
          const revalidationId = getRegistrationRevalidationId(
            resubmission.resubmissionId,
          );
          const revalidation = freezeRevalidation({
            revalidationId,
            recordVersion: 1,
            registrationId: resubmission.registrationId,
            previousValidationId: resubmission.previousValidationId,
            correctionDraftId: resubmission.correctionDraftId,
            correctionDraftVersion:
              resubmission.correctionDraftVersion,
            resubmissionId: resubmission.resubmissionId,
            sessionId: resubmission.sessionId,
            customerId: resubmission.customerId,
            outcome: evaluation.outcome,
            correctability: evaluation.correctability,
            nextStep: evaluation.nextStep,
            findings: evaluation.findings,
            evidence: {
              rulesAccepted:
                resubmission.correctedEvidence.rulesAccepted,
              rulesAcceptedAt:
                resubmission.correctedEvidence.rulesAcceptedAt ?? "",
              resubmittedAt: resubmission.submittedAt ?? "",
              findingCodes: evaluation.findings.map(
                (finding) => finding.code,
              ),
              evaluatedAt: validatedAt,
            },
            validatedBy: command.actorId,
            validatedAt,
            commandId: command.commandId,
            history: [
              {
                historyId: `${revalidationId}-history-1`,
                action: "CORRECTED_REGISTRATION_REVALIDATED",
                outcome: evaluation.outcome,
                correctability: evaluation.correctability,
                nextStep: evaluation.nextStep,
                actorId: command.actorId,
                actorRole: "ADMIN",
                commandId: command.commandId,
                occurredAt: validatedAt,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({
            revalidations: [...get().revalidations, revalidation],
          });
          return { ok: true, revalidation, created: true };
        },
        resetDeterministicRegistrationRevalidationState: () =>
          set({ revalidations: [] }),
      }),
      {
        name: AUCTION_REGISTRATION_REVALIDATION_STORAGE_KEY,
        version: AUCTION_REGISTRATION_REVALIDATION_SCHEMA_VERSION,
        partialize: (state) => ({
          revalidations: state.revalidations,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionRegistrationRevalidationState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
