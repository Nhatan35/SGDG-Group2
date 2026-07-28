import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCustomerMembershipEvidence,
  type CustomerMembershipEvidence,
  type CustomerMembershipStatus,
} from "../services/membershipAccountReference";
import type { ActorRole } from "../types/domain";
import {
  type AuctionCustomerRegistration,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import { getRegistrationReadinessDeterministicNow } from "./auctionRegistrationOpeningReadinessStore";
import {
  type AuctionRegistrationRevalidation,
  useAuctionRegistrationRevalidationStore,
} from "./auctionRegistrationRevalidationStore";
import { useAuctionRegistrationResubmissionStore } from "./auctionRegistrationResubmissionStore";
import {
  type AuctionRegistrationValidation,
  useAuctionRegistrationValidationStore,
} from "./auctionRegistrationValidationStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";

export const AUCTION_MEMBERSHIP_CHECK_STORAGE_KEY =
  "sgdg-auction-membership-checks-v1";
export const AUCTION_MEMBERSHIP_CHECK_SCHEMA_VERSION = 1;
export const PROTOTYPE_MEMBERSHIP_EVIDENCE =
  "PROTOTYPE MEMBERSHIP EVIDENCE — REQUIRES STAKEHOLDER CONFIRMATION";

export type MembershipCheckFindingCode =
  | "MEMBERSHIP_EVIDENCE_MISSING"
  | "MEMBERSHIP_CUSTOMER_MISMATCH"
  | "MEMBERSHIP_STATUS_UNKNOWN"
  | "MEMBERSHIP_STATUS_INELIGIBLE"
  | "MEMBERSHIP_VALIDITY_INCONSISTENT";

export interface MembershipCheckFinding {
  readonly code: MembershipCheckFindingCode;
  readonly message: string;
}

export interface MembershipCheckHistoryEntry {
  readonly historyId: string;
  readonly action: "CUSTOMER_MEMBERSHIP_CHECKED";
  readonly outcome: "VALID" | "INVALID" | "REVIEW_REQUIRED";
  readonly nextStep:
    | "READY_FOR_DEPOSIT_CHECK"
    | "MEMBERSHIP_INELIGIBLE"
    | "MEMBERSHIP_REVIEW_REQUIRED";
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionMembershipCheck {
  readonly membershipCheckId: string;
  readonly recordVersion: 1;
  readonly registrationId: string;
  readonly customerId: string;
  readonly sessionId: string;
  readonly validationSourceType:
    | "REGISTRATION_VALIDATION"
    | "REGISTRATION_REVALIDATION";
  readonly validationSourceId: string;
  readonly outcome: "VALID" | "INVALID" | "REVIEW_REQUIRED";
  readonly nextStep:
    | "READY_FOR_DEPOSIT_CHECK"
    | "MEMBERSHIP_INELIGIBLE"
    | "MEMBERSHIP_REVIEW_REQUIRED";
  readonly findings: readonly MembershipCheckFinding[];
  readonly evidence: {
    readonly membershipId?: string;
    readonly membershipStatus: CustomerMembershipStatus | "MISSING";
    readonly membershipValidUntil?: string;
    readonly findingCodes: readonly MembershipCheckFindingCode[];
    readonly evaluatedAt: string;
  };
  readonly checkedBy: string;
  readonly checkedAt: string;
  readonly commandId: string;
  readonly history: readonly MembershipCheckHistoryEntry[];
}

export interface CheckCustomerMembershipCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedValidationSourceType:
    | "REGISTRATION_VALIDATION"
    | "REGISTRATION_REVALIDATION";
  expectedValidationSourceId: string;
  commandId: string;
}

export type MembershipCheckErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_ACTOR"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "REGISTRATION_NOT_FOUND"
  | "REGISTRATION_NOT_SUBMITTED"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_SESSION_REQUIRED"
  | "FINAL_VALIDATION_NOT_FOUND"
  | "FINAL_VALIDATION_NOT_VALID"
  | "VALIDATION_SOURCE_MISMATCH"
  | "SOURCE_REFERENCE_MISMATCH"
  | "MEMBERSHIP_ALREADY_CHECKED"
  | "LATER_PHASE_STATE_EXISTS"
  | "AUTHORITATIVE_STATE_CHANGED";

export type MembershipCheckCommandResult =
  | {
      ok: true;
      membershipCheck: AuctionMembershipCheck;
      created: boolean;
    }
  | {
      ok: false;
      code: MembershipCheckErrorCode;
      message: string;
      membershipCheck?: AuctionMembershipCheck;
    };

export interface AuctionMembershipCheckState {
  membershipChecks: AuctionMembershipCheck[];
  getByRegistrationId: (
    registrationId: string,
  ) => AuctionMembershipCheck | undefined;
  checkCustomerMembership: (
    command: CheckCustomerMembershipCommand,
  ) => MembershipCheckCommandResult;
  resetDeterministicMembershipCheckState: () => void;
}

export type FinalRegistrationValidationSource =
  | {
      sourceType: "REGISTRATION_VALIDATION";
      sourceId: string;
      source: AuctionRegistrationValidation;
    }
  | {
      sourceType: "REGISTRATION_REVALIDATION";
      sourceId: string;
      source: AuctionRegistrationRevalidation;
    };

export type MembershipCheckEvaluation = {
  outcome: "VALID" | "INVALID" | "REVIEW_REQUIRED";
  nextStep:
    | "READY_FOR_DEPOSIT_CHECK"
    | "MEMBERSHIP_INELIGIBLE"
    | "MEMBERSHIP_REVIEW_REQUIRED";
  findings: readonly MembershipCheckFinding[];
};

type MembershipCheckSources = {
  registration: AuctionCustomerRegistration;
  session: PersistedAuctionSession;
  finalValidation: FinalRegistrationValidationSource;
  membershipEvidence?: CustomerMembershipEvidence;
};

type MembershipCheckEligibility =
  | { eligible: true; sources: MembershipCheckSources }
  | {
      eligible: false;
      code: MembershipCheckErrorCode;
      message: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every(
      (key) => required.includes(key) || optional.includes(key),
    )
  );
};

const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));

const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);

export const getMembershipCheckId = (registrationId: string) =>
  `membership-check-${registrationId}`;

export const evaluateCustomerMembershipEvidence = ({
  customerId,
  evidence,
  evaluatedAt,
}: {
  customerId: string;
  evidence?: CustomerMembershipEvidence;
  evaluatedAt: string;
}): MembershipCheckEvaluation => {
  if (!evidence)
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "MEMBERSHIP_REVIEW_REQUIRED",
      findings: [
        {
          code: "MEMBERSHIP_EVIDENCE_MISSING",
          message: "Current Customer Membership evidence is missing.",
        },
      ],
    };
  if (
    evidence.customerId !== customerId ||
    !evidence.membershipId?.trim()
  )
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "MEMBERSHIP_REVIEW_REQUIRED",
      findings: [
        {
          code: "MEMBERSHIP_CUSTOMER_MISMATCH",
          message:
            "Membership evidence does not unambiguously belong to the Customer.",
        },
      ],
    };
  if (evidence.membershipStatus === "UNKNOWN")
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "MEMBERSHIP_REVIEW_REQUIRED",
      findings: [
        {
          code: "MEMBERSHIP_STATUS_UNKNOWN",
          message: "Membership status is unknown.",
        },
      ],
    };
  if (
    evidence.membershipStatus === "INACTIVE" ||
    evidence.membershipStatus === "SUSPENDED" ||
    evidence.membershipStatus === "EXPIRED"
  )
    return {
      outcome: "INVALID",
      nextStep: "MEMBERSHIP_INELIGIBLE",
      findings: [
        {
          code: "MEMBERSHIP_STATUS_INELIGIBLE",
          message: `Membership status ${evidence.membershipStatus} is ineligible.`,
        },
      ],
    };
  if (
    evidence.membershipValidUntil !== undefined &&
    (!validIsoTime(evidence.membershipValidUntil) ||
      Date.parse(evidence.membershipValidUntil) < Date.parse(evaluatedAt))
  )
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "MEMBERSHIP_REVIEW_REQUIRED",
      findings: [
        {
          code: "MEMBERSHIP_VALIDITY_INCONSISTENT",
          message:
            "ACTIVE Membership validity evidence is expired or inconsistent.",
        },
      ],
    };
  return {
    outcome: "VALID",
    nextStep: "READY_FOR_DEPOSIT_CHECK",
    findings: [],
  };
};

export const resolveFinalRegistrationValidationSource = (
  registrationId: string,
):
  | { ok: true; finalValidation: FinalRegistrationValidationSource }
  | {
      ok: false;
      code:
        | "FINAL_VALIDATION_NOT_FOUND"
        | "FINAL_VALIDATION_NOT_VALID"
        | "SOURCE_REFERENCE_MISMATCH";
      message: string;
    } => {
  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find((item) => item.registrationId === registrationId);
  if (!registration)
    return {
      ok: false,
      code: "SOURCE_REFERENCE_MISMATCH",
      message: "Registration source is missing.",
    };
  const resubmission = useAuctionRegistrationResubmissionStore
    .getState()
    .resubmissions.find(
      (item) => item.registrationId === registrationId,
    );
  if (resubmission) {
    const revalidation = useAuctionRegistrationRevalidationStore
      .getState()
      .revalidations.find(
        (item) => item.resubmissionId === resubmission.resubmissionId,
      );
    if (!revalidation)
      return {
        ok: false,
        code: "FINAL_VALIDATION_NOT_FOUND",
        message:
          "Corrected Registration Revalidation is required after Resubmission.",
      };
    if (
      revalidation.registrationId !== registration.registrationId ||
      revalidation.customerId !== registration.customerId ||
      revalidation.sessionId !== registration.sessionId ||
      revalidation.resubmissionId !== resubmission.resubmissionId
    )
      return {
        ok: false,
        code: "SOURCE_REFERENCE_MISMATCH",
        message: "Revalidation references do not match the Registration.",
      };
    if (
      revalidation.outcome !== "VALID" ||
      revalidation.nextStep !== "READY_FOR_MEMBERSHIP_CHECK"
    )
      return {
        ok: false,
        code: "FINAL_VALIDATION_NOT_VALID",
        message:
          "Final corrected Registration Revalidation is not ready for Membership Check.",
      };
    return {
      ok: true,
      finalValidation: {
        sourceType: "REGISTRATION_REVALIDATION",
        sourceId: revalidation.revalidationId,
        source: revalidation,
      },
    };
  }
  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validations.find(
      (item) => item.registrationId === registration.registrationId,
    );
  if (!validation)
    return {
      ok: false,
      code: "FINAL_VALIDATION_NOT_FOUND",
      message: "Initial Registration Validation is missing.",
    };
  if (
    validation.registrationId !== registration.registrationId ||
    validation.registrationVersion !==
      registration.registrationVersion ||
    validation.customerId !== registration.customerId ||
    validation.sessionId !== registration.sessionId
  )
    return {
      ok: false,
      code: "SOURCE_REFERENCE_MISMATCH",
      message: "Initial Validation references do not match Registration.",
    };
  if (
    validation.outcome !== "VALID" ||
    validation.nextStep !== "READY_FOR_MEMBERSHIP_CHECK"
  )
    return {
      ok: false,
      code: "FINAL_VALIDATION_NOT_VALID",
      message:
        "Initial Registration Validation is not ready for Membership Check.",
    };
  return {
    ok: true,
    finalValidation: {
      sourceType: "REGISTRATION_VALIDATION",
      sourceId: validation.validationId,
      source: validation,
    },
  };
};

const commandKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedValidationSourceType",
  "expectedValidationSourceId",
  "commandId",
]);

const laterPhaseKeys = [
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
  code: MembershipCheckErrorCode,
  message: string,
  membershipCheck?: AuctionMembershipCheck,
): MembershipCheckCommandResult => ({
  ok: false,
  code,
  message,
  ...(membershipCheck ? { membershipCheck } : {}),
});

const resolveMembershipCheckSources = (
  command: CheckCustomerMembershipCommand,
): MembershipCheckEligibility => {
  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === command.registrationId,
    );
  if (!registration)
    return {
      eligible: false,
      code: "REGISTRATION_NOT_FOUND",
      message: "Customer Registration was not found.",
    };
  if (registration.status !== "SUBMITTED")
    return {
      eligible: false,
      code: "REGISTRATION_NOT_SUBMITTED",
      message: "Only a SUBMITTED Registration can be checked.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === registration.sessionId);
  if (!session)
    return {
      eligible: false,
      code: "SESSION_NOT_FOUND",
      message: "Auction Session was not found.",
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED" ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY"
  )
    return {
      eligible: false,
      code: "DYNAMIC_CUSTOMER_SESSION_REQUIRED",
      message:
        "Membership Check supports only a DRAFT Customer-requested Session.",
    };
  const finalValidation =
    resolveFinalRegistrationValidationSource(registration.registrationId);
  if (!finalValidation.ok)
    return {
      eligible: false,
      code: finalValidation.code,
      message: finalValidation.message,
    };
  if (
    finalValidation.finalValidation.sourceType !==
      command.expectedValidationSourceType ||
    finalValidation.finalValidation.sourceId !==
      command.expectedValidationSourceId
  )
    return {
      eligible: false,
      code: "VALIDATION_SOURCE_MISMATCH",
      message: "Expected final Validation source changed.",
    };
  if (
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(finalValidation.finalValidation.source) ||
    hasLaterPhaseState(session)
  )
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message:
        "Deposit, Eligibility, Approval, Rejection, or Publication state exists.",
    };
  const membershipEvidence = getCustomerMembershipEvidence(
    registration.customerId,
  );
  if (
    membershipEvidence &&
    membershipEvidence.customerId !== registration.customerId
  )
    return {
      eligible: false,
      code: "SOURCE_REFERENCE_MISMATCH",
      message: "Membership evidence belongs to another Customer.",
    };
  return {
    eligible: true,
    sources: {
      registration,
      session,
      finalValidation: finalValidation.finalValidation,
      membershipEvidence,
    },
  };
};

export const evaluateMembershipCheckEligibility = (
  command: CheckCustomerMembershipCommand,
): MembershipCheckEligibility => {
  if (command.actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Only ADMIN can run Membership Check.",
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
  return resolveMembershipCheckSources(command);
};

const sourceFingerprint = (sources: MembershipCheckSources) =>
  JSON.stringify(sources);

const freezeMembershipCheck = (
  value: AuctionMembershipCheck,
): AuctionMembershipCheck =>
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

const findingCodes = [
  "MEMBERSHIP_EVIDENCE_MISSING",
  "MEMBERSHIP_CUSTOMER_MISMATCH",
  "MEMBERSHIP_STATUS_UNKNOWN",
  "MEMBERSHIP_STATUS_INELIGIBLE",
  "MEMBERSHIP_VALIDITY_INCONSISTENT",
] as const;

const validFinding = (value: unknown): value is MembershipCheckFinding =>
  isRecord(value) &&
  exactKeys(value, ["code", "message"]) &&
  findingCodes.includes(value.code as MembershipCheckFindingCode) &&
  typeof value.message === "string" &&
  value.message.length > 0;

const validMapping = (
  outcome: unknown,
  nextStep: unknown,
  status: unknown,
  findings: readonly MembershipCheckFinding[],
) => {
  if (outcome === "VALID")
    return (
      nextStep === "READY_FOR_DEPOSIT_CHECK" &&
      status === "ACTIVE" &&
      findings.length === 0
    );
  if (outcome === "INVALID")
    return (
      nextStep === "MEMBERSHIP_INELIGIBLE" &&
      (status === "INACTIVE" ||
        status === "SUSPENDED" ||
        status === "EXPIRED") &&
      findings.length > 0
    );
  return (
    outcome === "REVIEW_REQUIRED" &&
    nextStep === "MEMBERSHIP_REVIEW_REQUIRED" &&
    findings.length > 0
  );
};

const sanitizeMembershipCheck = (
  value: unknown,
): AuctionMembershipCheck | undefined => {
  if (
    !isRecord(value) ||
    hasLaterPhaseState(value) ||
    !exactKeys(value, [
      "membershipCheckId",
      "recordVersion",
      "registrationId",
      "customerId",
      "sessionId",
      "validationSourceType",
      "validationSourceId",
      "outcome",
      "nextStep",
      "findings",
      "evidence",
      "checkedBy",
      "checkedAt",
      "commandId",
      "history",
    ]) ||
    typeof value.registrationId !== "string" ||
    value.membershipCheckId !==
      getMembershipCheckId(value.registrationId) ||
    value.recordVersion !== 1 ||
    typeof value.customerId !== "string" ||
    typeof value.sessionId !== "string" ||
    (value.validationSourceType !== "REGISTRATION_VALIDATION" &&
      value.validationSourceType !== "REGISTRATION_REVALIDATION") ||
    typeof value.validationSourceId !== "string" ||
    !Array.isArray(value.findings) ||
    !value.findings.every(validFinding) ||
    !isRecord(value.evidence) ||
    !exactKeys(
      value.evidence,
      ["membershipStatus", "findingCodes", "evaluatedAt"],
      ["membershipId", "membershipValidUntil"],
    ) ||
    ![
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED",
      "EXPIRED",
      "UNKNOWN",
      "MISSING",
    ].includes(value.evidence.membershipStatus as string) ||
    (value.evidence.membershipId !== undefined &&
      (typeof value.evidence.membershipId !== "string" ||
        !value.evidence.membershipId.trim())) ||
    (value.evidence.membershipValidUntil !== undefined &&
      !validIsoTime(value.evidence.membershipValidUntil)) ||
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
    typeof value.checkedBy !== "string" ||
    !value.checkedBy.trim() ||
    !validIsoTime(value.checkedAt) ||
    value.checkedAt !== value.evidence.evaluatedAt ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId) ||
    !validMapping(
      value.outcome,
      value.nextStep,
      value.evidence.membershipStatus,
      value.findings as MembershipCheckFinding[],
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
      "nextStep",
      "actorId",
      "actorRole",
      "commandId",
      "occurredAt",
      "visibility",
    ]) ||
    history.historyId !== `${value.membershipCheckId}-history-1` ||
    history.action !== "CUSTOMER_MEMBERSHIP_CHECKED" ||
    history.outcome !== value.outcome ||
    history.nextStep !== value.nextStep ||
    history.actorId !== value.checkedBy ||
    history.actorRole !== "ADMIN" ||
    history.commandId !== value.commandId ||
    history.occurredAt !== value.checkedAt ||
    history.visibility !== "STAFF_ONLY"
  )
    return undefined;
  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === value.registrationId,
    );
  const finalValidation = resolveFinalRegistrationValidationSource(
    value.registrationId as string,
  );
  if (
    !registration ||
    registration.status !== "SUBMITTED" ||
    registration.customerId !== value.customerId ||
    registration.sessionId !== value.sessionId ||
    !finalValidation.ok ||
    finalValidation.finalValidation.sourceType !==
      value.validationSourceType ||
    finalValidation.finalValidation.sourceId !== value.validationSourceId
  )
    return undefined;
  const snapshotEvidence: CustomerMembershipEvidence | undefined =
    value.evidence.membershipStatus === "MISSING"
      ? undefined
      : {
          customerId: value.customerId as string,
          ...(typeof value.evidence.membershipId === "string"
            ? { membershipId: value.evidence.membershipId }
            : {}),
          membershipStatus:
            value.evidence
              .membershipStatus as CustomerMembershipStatus,
          ...(typeof value.evidence.membershipValidUntil === "string"
            ? {
                membershipValidUntil:
                  value.evidence.membershipValidUntil,
              }
            : {}),
          referenceVersion: "MEMBERSHIP-MOCK-V1",
          sourceDomain: "MEMBERSHIP_ACCOUNT",
        };
  const evaluation = evaluateCustomerMembershipEvidence({
    customerId: value.customerId as string,
    evidence: snapshotEvidence,
    evaluatedAt: value.evidence.evaluatedAt as string,
  });
  if (
    evaluation.outcome !== value.outcome ||
    evaluation.nextStep !== value.nextStep ||
    JSON.stringify(evaluation.findings) !==
      JSON.stringify(value.findings)
  )
    return undefined;
  return freezeMembershipCheck(value as unknown as AuctionMembershipCheck);
};

export const sanitizePersistedAuctionMembershipCheckState = (
  persisted: unknown,
): Pick<AuctionMembershipCheckState, "membershipChecks"> => {
  const empty = {
    membershipChecks: [] as AuctionMembershipCheck[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["membershipChecks"]) ||
    !Array.isArray(persisted.membershipChecks)
  )
    return empty;
  const records = persisted.membershipChecks.map(sanitizeMembershipCheck);
  if (records.some((record) => !record)) return empty;
  const safe = records.filter(
    (record): record is AuctionMembershipCheck => Boolean(record),
  );
  if (
    new Set(safe.map((record) => record.membershipCheckId)).size !==
      safe.length ||
    new Set(safe.map((record) => record.registrationId)).size !==
      safe.length
  )
    return empty;
  return { membershipChecks: safe };
};

export const useAuctionMembershipCheckStore =
  create<AuctionMembershipCheckState>()(
    persist(
      (set, get) => ({
        membershipChecks: [],
        getByRegistrationId: (registrationId) =>
          get().membershipChecks.find(
            (record) => record.registrationId === registrationId,
          ),
        checkCustomerMembership: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Only ADMIN can run Membership Check.",
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
              "Membership Check command contains unsupported fields.",
            );
          const sameCommand = get().membershipChecks.find(
            (record) => record.commandId === command.commandId,
          );
          if (sameCommand) {
            if (
              sameCommand.checkedBy !== command.actorId ||
              sameCommand.registrationId !== command.registrationId ||
              sameCommand.validationSourceType !==
                command.expectedValidationSourceType ||
              sameCommand.validationSourceId !==
                command.expectedValidationSourceId
            )
              return failure(
                "INVALID_COMMAND",
                "Idempotent replay does not match the original Membership Check command.",
              );
            return {
              ok: true,
              membershipCheck: sameCommand,
              created: false,
            };
          }
          const duplicate = get().membershipChecks.find(
            (record) => record.registrationId === command.registrationId,
          );
          if (duplicate)
            return failure(
              "MEMBERSHIP_ALREADY_CHECKED",
              "Registration already has a Membership Check.",
              duplicate,
            );
          const eligibility = evaluateMembershipCheckEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const firstFingerprint = sourceFingerprint(eligibility.sources);
          const finalEligibility =
            evaluateMembershipCheckEligibility(command);
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
              "Registration, validation, Session, or Membership evidence changed before commit.",
            );
          const { registration, finalValidation, membershipEvidence } =
            finalEligibility.sources;
          const checkedAt = getRegistrationReadinessDeterministicNow();
          const evaluation = evaluateCustomerMembershipEvidence({
            customerId: registration.customerId,
            evidence: membershipEvidence,
            evaluatedAt: checkedAt,
          });
          const membershipCheckId = getMembershipCheckId(
            registration.registrationId,
          );
          const membershipCheck = freezeMembershipCheck({
            membershipCheckId,
            recordVersion: 1,
            registrationId: registration.registrationId,
            customerId: registration.customerId,
            sessionId: registration.sessionId,
            validationSourceType: finalValidation.sourceType,
            validationSourceId: finalValidation.sourceId,
            outcome: evaluation.outcome,
            nextStep: evaluation.nextStep,
            findings: evaluation.findings,
            evidence: {
              ...(membershipEvidence?.membershipId
                ? { membershipId: membershipEvidence.membershipId }
                : {}),
              membershipStatus:
                membershipEvidence?.membershipStatus ?? "MISSING",
              ...(membershipEvidence?.membershipValidUntil
                ? {
                    membershipValidUntil:
                      membershipEvidence.membershipValidUntil,
                  }
                : {}),
              findingCodes: evaluation.findings.map(
                (finding) => finding.code,
              ),
              evaluatedAt: checkedAt,
            },
            checkedBy: command.actorId,
            checkedAt,
            commandId: command.commandId,
            history: [
              {
                historyId: `${membershipCheckId}-history-1`,
                action: "CUSTOMER_MEMBERSHIP_CHECKED",
                outcome: evaluation.outcome,
                nextStep: evaluation.nextStep,
                actorId: command.actorId,
                actorRole: "ADMIN",
                commandId: command.commandId,
                occurredAt: checkedAt,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({
            membershipChecks: [
              ...get().membershipChecks,
              membershipCheck,
            ],
          });
          return { ok: true, membershipCheck, created: true };
        },
        resetDeterministicMembershipCheckState: () =>
          set({ membershipChecks: [] }),
      }),
      {
        name: AUCTION_MEMBERSHIP_CHECK_STORAGE_KEY,
        version: AUCTION_MEMBERSHIP_CHECK_SCHEMA_VERSION,
        partialize: (state) => ({
          membershipChecks: state.membershipChecks,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionMembershipCheckState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
