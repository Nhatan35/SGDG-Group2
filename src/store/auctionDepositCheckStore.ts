import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCustomerDepositEvidence,
  type CustomerDepositEvidence,
  type CustomerDepositStatus,
} from "../services/depositEvidenceReference";
import type { ActorRole } from "../types/domain";
import {
  type AuctionCustomerRegistration,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import {
  type AuctionMembershipCheck,
  resolveFinalRegistrationValidationSource,
  useAuctionMembershipCheckStore,
} from "./auctionMembershipCheckStore";
import { getRegistrationReadinessDeterministicNow } from "./auctionRegistrationOpeningReadinessStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";

export const AUCTION_DEPOSIT_CHECK_STORAGE_KEY =
  "sgdg-auction-deposit-checks-v1";
export const AUCTION_DEPOSIT_CHECK_SCHEMA_VERSION = 1;
export const PROTOTYPE_DEPOSIT_EVIDENCE =
  "PROTOTYPE DEPOSIT EVIDENCE — REQUIRES STAKEHOLDER CONFIRMATION";

export type DepositCheckFindingCode =
  | "DEPOSIT_EVIDENCE_MISSING"
  | "DEPOSIT_REFERENCE_MISMATCH"
  | "DEPOSIT_STATUS_PENDING"
  | "DEPOSIT_STATUS_UNKNOWN"
  | "DEPOSIT_NOT_SATISFIED"
  | "DEPOSIT_CONFIRMATION_INCONSISTENT";

export interface DepositCheckFinding {
  readonly code: DepositCheckFindingCode;
  readonly message: string;
}

export interface DepositCheckHistoryEntry {
  readonly historyId: string;
  readonly action: "CUSTOMER_DEPOSIT_CHECKED";
  readonly outcome: "SATISFIED" | "NOT_SATISFIED" | "REVIEW_REQUIRED";
  readonly nextStep:
    | "READY_FOR_ELIGIBILITY_EVALUATION"
    | "DEPOSIT_NOT_SATISFIED"
    | "DEPOSIT_REVIEW_REQUIRED";
  readonly actorId: string;
  readonly actorRole: "FINANCE";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionDepositCheck {
  readonly depositCheckId: string;
  readonly recordVersion: 1;
  readonly registrationId: string;
  readonly customerId: string;
  readonly sessionId: string;
  readonly membershipCheckId: string;
  readonly outcome: "SATISFIED" | "NOT_SATISFIED" | "REVIEW_REQUIRED";
  readonly nextStep:
    | "READY_FOR_ELIGIBILITY_EVALUATION"
    | "DEPOSIT_NOT_SATISFIED"
    | "DEPOSIT_REVIEW_REQUIRED";
  readonly findings: readonly DepositCheckFinding[];
  readonly evidence: {
    readonly depositReference?: string;
    readonly depositStatus: CustomerDepositStatus | "MISSING";
    readonly confirmedAt?: string;
    readonly sourceReferenceVersion?: string;
    readonly findingCodes: readonly DepositCheckFindingCode[];
    readonly evaluatedAt: string;
  };
  readonly checkedBy: string;
  readonly checkedAt: string;
  readonly commandId: string;
  readonly history: readonly DepositCheckHistoryEntry[];
}

export interface CheckCustomerDepositCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedMembershipCheckId: string;
  commandId: string;
}

export type DepositCheckErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_ACTOR"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "REGISTRATION_NOT_FOUND"
  | "REGISTRATION_NOT_SUBMITTED"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_SESSION_REQUIRED"
  | "FINAL_VALIDATION_NOT_VALID"
  | "MEMBERSHIP_CHECK_NOT_FOUND"
  | "MEMBERSHIP_NOT_VALID"
  | "SOURCE_REFERENCE_MISMATCH"
  | "DEPOSIT_ALREADY_CHECKED"
  | "LATER_PHASE_STATE_EXISTS"
  | "AUTHORITATIVE_STATE_CHANGED";

export type DepositCheckCommandResult =
  | {
      ok: true;
      depositCheck: AuctionDepositCheck;
      created: boolean;
    }
  | {
      ok: false;
      code: DepositCheckErrorCode;
      message: string;
      depositCheck?: AuctionDepositCheck;
    };

export interface AuctionDepositCheckState {
  depositChecks: AuctionDepositCheck[];
  getByRegistrationId: (
    registrationId: string,
  ) => AuctionDepositCheck | undefined;
  checkCustomerDeposit: (
    command: CheckCustomerDepositCommand,
  ) => DepositCheckCommandResult;
  resetDeterministicDepositCheckState: () => void;
}

export type DepositCheckEvaluation = {
  outcome: "SATISFIED" | "NOT_SATISFIED" | "REVIEW_REQUIRED";
  nextStep:
    | "READY_FOR_ELIGIBILITY_EVALUATION"
    | "DEPOSIT_NOT_SATISFIED"
    | "DEPOSIT_REVIEW_REQUIRED";
  findings: readonly DepositCheckFinding[];
};

type DepositCheckSources = {
  registration: AuctionCustomerRegistration;
  session: PersistedAuctionSession;
  membershipCheck: AuctionMembershipCheck;
  depositEvidence?: CustomerDepositEvidence;
};

type DepositCheckEligibility =
  | { eligible: true; sources: DepositCheckSources }
  | {
      eligible: false;
      code: DepositCheckErrorCode;
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

export const getDepositCheckId = (registrationId: string) =>
  `deposit-check-${registrationId}`;

export const evaluateCustomerDepositEvidence = ({
  registrationId,
  customerId,
  sessionId,
  evidence,
  evaluatedAt,
}: {
  registrationId: string;
  customerId: string;
  sessionId: string;
  evidence?: CustomerDepositEvidence;
  evaluatedAt: string;
}): DepositCheckEvaluation => {
  if (!evidence)
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "DEPOSIT_REVIEW_REQUIRED",
      findings: [
        {
          code: "DEPOSIT_EVIDENCE_MISSING",
          message: "Current Customer Deposit evidence is missing.",
        },
      ],
    };
  if (
    evidence.registrationId !== registrationId ||
    evidence.customerId !== customerId ||
    evidence.sessionId !== sessionId
  )
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "DEPOSIT_REVIEW_REQUIRED",
      findings: [
        {
          code: "DEPOSIT_REFERENCE_MISMATCH",
          message:
            "Deposit evidence does not unambiguously reference the Registration.",
        },
      ],
    };
  if (
    evidence.depositStatus === "FAILED" ||
    evidence.depositStatus === "REFUNDED"
  )
    return {
      outcome: "NOT_SATISFIED",
      nextStep: "DEPOSIT_NOT_SATISFIED",
      findings: [
        {
          code: "DEPOSIT_NOT_SATISFIED",
          message: `Deposit status ${evidence.depositStatus} is not satisfied.`,
        },
      ],
    };
  if (evidence.depositStatus === "PENDING")
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "DEPOSIT_REVIEW_REQUIRED",
      findings: [
        {
          code: "DEPOSIT_STATUS_PENDING",
          message: "Deposit confirmation remains pending.",
        },
      ],
    };
  if (evidence.depositStatus === "UNKNOWN")
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "DEPOSIT_REVIEW_REQUIRED",
      findings: [
        {
          code: "DEPOSIT_STATUS_UNKNOWN",
          message: "Deposit status is unknown.",
        },
      ],
    };
  if (
    !evidence.depositReference?.trim() ||
    !validIsoTime(evidence.confirmedAt) ||
    Date.parse(evidence.confirmedAt) > Date.parse(evaluatedAt)
  )
    return {
      outcome: "REVIEW_REQUIRED",
      nextStep: "DEPOSIT_REVIEW_REQUIRED",
      findings: [
        {
          code: "DEPOSIT_CONFIRMATION_INCONSISTENT",
          message:
            "CONFIRMED Deposit evidence is missing or internally inconsistent.",
        },
      ],
    };
  return {
    outcome: "SATISFIED",
    nextStep: "READY_FOR_ELIGIBILITY_EVALUATION",
    findings: [],
  };
};

const commandKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedMembershipCheckId",
  "commandId",
]);

const laterPhaseKeys = [
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
  code: DepositCheckErrorCode,
  message: string,
  depositCheck?: AuctionDepositCheck,
): DepositCheckCommandResult => ({
  ok: false,
  code,
  message,
  ...(depositCheck ? { depositCheck } : {}),
});

const resolveDepositCheckSources = (
  command: CheckCustomerDepositCommand,
): DepositCheckEligibility => {
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
        "Deposit Check supports only a DRAFT Customer-requested Session.",
    };
  const membershipCheck = useAuctionMembershipCheckStore
    .getState()
    .membershipChecks.find(
      (item) => item.registrationId === registration.registrationId,
    );
  if (!membershipCheck)
    return {
      eligible: false,
      code: "MEMBERSHIP_CHECK_NOT_FOUND",
      message: "Membership Check was not found.",
    };
  if (
    membershipCheck.membershipCheckId !==
      command.expectedMembershipCheckId ||
    membershipCheck.registrationId !== registration.registrationId ||
    membershipCheck.customerId !== registration.customerId ||
    membershipCheck.sessionId !== registration.sessionId
  )
    return {
      eligible: false,
      code: "SOURCE_REFERENCE_MISMATCH",
      message: "Membership Check references do not match Registration.",
    };
  if (
    membershipCheck.outcome !== "VALID" ||
    membershipCheck.nextStep !== "READY_FOR_DEPOSIT_CHECK"
  )
    return {
      eligible: false,
      code: "MEMBERSHIP_NOT_VALID",
      message: "A VALID Membership Check is required.",
    };
  const finalValidation = resolveFinalRegistrationValidationSource(
    registration.registrationId,
  );
  if (
    !finalValidation.ok ||
    finalValidation.finalValidation.sourceType !==
      membershipCheck.validationSourceType ||
    finalValidation.finalValidation.sourceId !==
      membershipCheck.validationSourceId
  )
    return {
      eligible: false,
      code: "FINAL_VALIDATION_NOT_VALID",
      message:
        "Membership Check no longer references the final VALID Registration validation.",
    };
  if (
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(membershipCheck) ||
    hasLaterPhaseState(session)
  )
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message:
        "Eligibility, Approval, Rejection, or Publication state exists.",
    };
  const depositEvidence = getCustomerDepositEvidence({
    registrationId: registration.registrationId,
    customerId: registration.customerId,
    sessionId: registration.sessionId,
  });
  return {
    eligible: true,
    sources: { registration, session, membershipCheck, depositEvidence },
  };
};

export const evaluateDepositCheckEligibility = (
  command: CheckCustomerDepositCommand,
): DepositCheckEligibility => {
  if (command.actorRole !== "FINANCE")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Only FINANCE can run Deposit Check.",
    };
  if (!command.actorId.trim())
    return {
      eligible: false,
      code: "INVALID_ACTOR",
      message: "Authenticated FINANCE identity is required.",
    };
  if (!validCommandId(command.commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID is invalid.",
    };
  return resolveDepositCheckSources(command);
};

const sourceFingerprint = (sources: DepositCheckSources) =>
  JSON.stringify(sources);

const freezeDepositCheck = (
  value: AuctionDepositCheck,
): AuctionDepositCheck =>
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

const validFindingCodes = [
  "DEPOSIT_EVIDENCE_MISSING",
  "DEPOSIT_REFERENCE_MISMATCH",
  "DEPOSIT_STATUS_PENDING",
  "DEPOSIT_STATUS_UNKNOWN",
  "DEPOSIT_NOT_SATISFIED",
  "DEPOSIT_CONFIRMATION_INCONSISTENT",
] as const;

const validFinding = (value: unknown): value is DepositCheckFinding =>
  isRecord(value) &&
  exactKeys(value, ["code", "message"]) &&
  validFindingCodes.includes(value.code as DepositCheckFindingCode) &&
  typeof value.message === "string" &&
  value.message.length > 0;

const validMapping = (
  outcome: unknown,
  nextStep: unknown,
  status: unknown,
  findings: readonly DepositCheckFinding[],
) => {
  if (outcome === "SATISFIED")
    return (
      nextStep === "READY_FOR_ELIGIBILITY_EVALUATION" &&
      status === "CONFIRMED" &&
      findings.length === 0
    );
  if (outcome === "NOT_SATISFIED")
    return (
      nextStep === "DEPOSIT_NOT_SATISFIED" &&
      (status === "FAILED" || status === "REFUNDED") &&
      findings.length > 0
    );
  return (
    outcome === "REVIEW_REQUIRED" &&
    nextStep === "DEPOSIT_REVIEW_REQUIRED" &&
    findings.length > 0
  );
};

const forbiddenPersistenceKeys = new Set([
  ...laterPhaseKeys,
  "payment",
  "paymentId",
  "paymentAmount",
  "amount",
  "currency",
  "confirmPayment",
  "confirmedByMutation",
  "refund",
  "refundId",
  "refundedAt",
]);

const containsForbiddenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      forbiddenPersistenceKeys.has(key) || containsForbiddenKey(nested),
  );
};

const sanitizeDepositCheck = (
  value: unknown,
): AuctionDepositCheck | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenKey(value) ||
    !exactKeys(value, [
      "depositCheckId",
      "recordVersion",
      "registrationId",
      "customerId",
      "sessionId",
      "membershipCheckId",
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
    value.depositCheckId !== getDepositCheckId(value.registrationId) ||
    value.recordVersion !== 1 ||
    typeof value.customerId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.membershipCheckId !== "string" ||
    !Array.isArray(value.findings) ||
    !value.findings.every(validFinding) ||
    !isRecord(value.evidence) ||
    !exactKeys(
      value.evidence,
      ["depositStatus", "findingCodes", "evaluatedAt"],
      ["depositReference", "confirmedAt", "sourceReferenceVersion"],
    ) ||
    ![
      "CONFIRMED",
      "PENDING",
      "FAILED",
      "REFUNDED",
      "UNKNOWN",
      "MISSING",
    ].includes(value.evidence.depositStatus as string) ||
    (value.evidence.depositReference !== undefined &&
      (typeof value.evidence.depositReference !== "string" ||
        !value.evidence.depositReference.trim())) ||
    (value.evidence.confirmedAt !== undefined &&
      !validIsoTime(value.evidence.confirmedAt)) ||
    (value.evidence.sourceReferenceVersion !== undefined &&
      typeof value.evidence.sourceReferenceVersion !== "string") ||
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
      value.evidence.depositStatus,
      value.findings as DepositCheckFinding[],
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
    history.historyId !== `${value.depositCheckId}-history-1` ||
    history.action !== "CUSTOMER_DEPOSIT_CHECKED" ||
    history.outcome !== value.outcome ||
    history.nextStep !== value.nextStep ||
    history.actorId !== value.checkedBy ||
    history.actorRole !== "FINANCE" ||
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
  const membershipCheck = useAuctionMembershipCheckStore
    .getState()
    .membershipChecks.find(
      (item) => item.membershipCheckId === value.membershipCheckId,
    );
  if (
    !registration ||
    registration.status !== "SUBMITTED" ||
    registration.customerId !== value.customerId ||
    registration.sessionId !== value.sessionId ||
    !membershipCheck ||
    membershipCheck.registrationId !== registration.registrationId ||
    membershipCheck.customerId !== registration.customerId ||
    membershipCheck.sessionId !== registration.sessionId ||
    membershipCheck.outcome !== "VALID" ||
    membershipCheck.nextStep !== "READY_FOR_DEPOSIT_CHECK"
  )
    return undefined;
  const snapshotEvidence: CustomerDepositEvidence | undefined =
    value.evidence.depositStatus === "MISSING"
      ? undefined
      : {
          registrationId: value.registrationId as string,
          customerId: value.customerId as string,
          sessionId: value.sessionId as string,
          ...(typeof value.evidence.depositReference === "string"
            ? { depositReference: value.evidence.depositReference }
            : {}),
          depositStatus:
            value.evidence.depositStatus as CustomerDepositStatus,
          ...(typeof value.evidence.confirmedAt === "string"
            ? { confirmedAt: value.evidence.confirmedAt }
            : {}),
          sourceReferenceVersion: "DEPOSIT-MOCK-V1",
          sourceDomain: "FINANCIAL_MANAGEMENT",
        };
  const evaluation = evaluateCustomerDepositEvidence({
    registrationId: value.registrationId as string,
    customerId: value.customerId as string,
    sessionId: value.sessionId as string,
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
  return freezeDepositCheck(value as unknown as AuctionDepositCheck);
};

export const sanitizePersistedAuctionDepositCheckState = (
  persisted: unknown,
): Pick<AuctionDepositCheckState, "depositChecks"> => {
  const empty = { depositChecks: [] as AuctionDepositCheck[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["depositChecks"]) ||
    !Array.isArray(persisted.depositChecks)
  )
    return empty;
  const records = persisted.depositChecks.map(sanitizeDepositCheck);
  if (records.some((record) => !record)) return empty;
  const safe = records.filter(
    (record): record is AuctionDepositCheck => Boolean(record),
  );
  if (
    new Set(safe.map((record) => record.depositCheckId)).size !==
      safe.length ||
    new Set(safe.map((record) => record.registrationId)).size !==
      safe.length
  )
    return empty;
  return { depositChecks: safe };
};

export const useAuctionDepositCheckStore =
  create<AuctionDepositCheckState>()(
    persist(
      (set, get) => ({
        depositChecks: [],
        getByRegistrationId: (registrationId) =>
          get().depositChecks.find(
            (record) => record.registrationId === registrationId,
          ),
        checkCustomerDeposit: (command) => {
          if (command.actorRole !== "FINANCE")
            return failure(
              "ACCESS_DENIED",
              "Only FINANCE can run Deposit Check.",
            );
          if (!command.actorId.trim())
            return failure(
              "INVALID_ACTOR",
              "Authenticated FINANCE identity is required.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID is invalid.");
          if (Object.keys(command).some((key) => !commandKeys.has(key)))
            return failure(
              "UNSUPPORTED_FIELD",
              "Deposit Check command contains unsupported fields.",
            );
          const sameCommand = get().depositChecks.find(
            (record) => record.commandId === command.commandId,
          );
          if (sameCommand) {
            if (
              sameCommand.checkedBy !== command.actorId ||
              sameCommand.registrationId !== command.registrationId ||
              sameCommand.membershipCheckId !==
                command.expectedMembershipCheckId
            )
              return failure(
                "INVALID_COMMAND",
                "Idempotent replay does not match the original Deposit Check command.",
              );
            return {
              ok: true,
              depositCheck: sameCommand,
              created: false,
            };
          }
          const duplicate = get().depositChecks.find(
            (record) => record.registrationId === command.registrationId,
          );
          if (duplicate)
            return failure(
              "DEPOSIT_ALREADY_CHECKED",
              "Registration already has a Deposit Check.",
              duplicate,
            );
          const eligibility = evaluateDepositCheckEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const firstFingerprint = sourceFingerprint(eligibility.sources);
          const finalEligibility =
            evaluateDepositCheckEligibility(command);
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
              "Registration, Membership, Session, or Deposit evidence changed before commit.",
            );
          const { registration, membershipCheck, depositEvidence } =
            finalEligibility.sources;
          const checkedAt = getRegistrationReadinessDeterministicNow();
          const evaluation = evaluateCustomerDepositEvidence({
            registrationId: registration.registrationId,
            customerId: registration.customerId,
            sessionId: registration.sessionId,
            evidence: depositEvidence,
            evaluatedAt: checkedAt,
          });
          const depositCheckId = getDepositCheckId(
            registration.registrationId,
          );
          const depositCheck = freezeDepositCheck({
            depositCheckId,
            recordVersion: 1,
            registrationId: registration.registrationId,
            customerId: registration.customerId,
            sessionId: registration.sessionId,
            membershipCheckId: membershipCheck.membershipCheckId,
            outcome: evaluation.outcome,
            nextStep: evaluation.nextStep,
            findings: evaluation.findings,
            evidence: {
              ...(depositEvidence?.depositReference
                ? { depositReference: depositEvidence.depositReference }
                : {}),
              depositStatus:
                depositEvidence?.depositStatus ?? "MISSING",
              ...(depositEvidence?.confirmedAt
                ? { confirmedAt: depositEvidence.confirmedAt }
                : {}),
              ...(depositEvidence?.sourceReferenceVersion
                ? {
                    sourceReferenceVersion:
                      depositEvidence.sourceReferenceVersion,
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
                historyId: `${depositCheckId}-history-1`,
                action: "CUSTOMER_DEPOSIT_CHECKED",
                outcome: evaluation.outcome,
                nextStep: evaluation.nextStep,
                actorId: command.actorId,
                actorRole: "FINANCE",
                commandId: command.commandId,
                occurredAt: checkedAt,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({ depositChecks: [...get().depositChecks, depositCheck] });
          return { ok: true, depositCheck, created: true };
        },
        resetDeterministicDepositCheckState: () =>
          set({ depositChecks: [] }),
      }),
      {
        name: AUCTION_DEPOSIT_CHECK_STORAGE_KEY,
        version: AUCTION_DEPOSIT_CHECK_SCHEMA_VERSION,
        partialize: (state) => ({ depositChecks: state.depositChecks }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionDepositCheckState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
