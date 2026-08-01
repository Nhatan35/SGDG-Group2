import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  type AuctionCustomerRegistration,
  type CustomerRegistrationSubmissionRecord,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import { getRegistrationReadinessDeterministicNow } from "./auctionRegistrationOpeningReadinessStore";
import {
  type AuctionRegistrationWindow,
  useAuctionRegistrationWindowStore,
} from "./auctionRegistrationWindowStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";

export const AUCTION_REGISTRATION_VALIDATION_STORAGE_KEY =
  "sgdg-auction-registration-validations-v1";
export const AUCTION_REGISTRATION_VALIDATION_SCHEMA_VERSION = 1;
export const PROTOTYPE_REGISTRATION_VALIDATION_MODEL =
  "PROTOTYPE REGISTRATION VALIDATION MODEL — USER-REQUESTED IMPLEMENTATION — NOT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";

export type RegistrationValidationFindingCode =
  | "RULES_ACCEPTANCE_MISSING"
  | "RULES_ACCEPTANCE_TIMESTAMP_MISSING"
  | "CORRECTABLE_REGISTRATION_DATA_MISSING"
  | "SUBMISSION_RECORD_MISSING"
  | "SUBMISSION_RECORD_INVALID"
  | "CUSTOMER_IDENTITY_INVALID"
  | "SESSION_REFERENCE_INVALID"
  | "REGISTRATION_WINDOW_REFERENCE_INVALID"
  | "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW"
  | "UNSUPPORTED_REGISTRATION_DATA"
  | "MALFORMED_REGISTRATION";

export type RegistrationValidationFindingSeverity =
  | "CORRECTABLE"
  | "BLOCKING";

export interface RegistrationValidationFinding {
  readonly code: RegistrationValidationFindingCode;
  readonly severity: RegistrationValidationFindingSeverity;
  readonly message: string;
}

export interface RegistrationValidationEvidence {
  readonly submittedAt: string;
  readonly registrationOpenAt: string;
  readonly registrationCloseAt: string;
  readonly rulesAccepted: boolean;
  readonly rulesAcceptedAt?: string;
  readonly findingCodes: readonly RegistrationValidationFindingCode[];
  readonly evaluatedAt: string;
}

export interface RegistrationValidationHistoryEntry {
  readonly historyId: string;
  readonly action: "CUSTOMER_REGISTRATION_VALIDATED";
  readonly outcome: "VALID" | "INVALID";
  readonly correctability:
    | "NOT_APPLICABLE"
    | "CORRECTABLE"
    | "BLOCKING";
  readonly nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED"
    | "INVALID_BLOCKING";
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionRegistrationValidation {
  readonly validationId: string;
  readonly recordVersion: 1;
  readonly registrationId: string;
  readonly registrationVersion: number;
  readonly submissionRecordId: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly registrationWindowId: string;
  readonly outcome: "VALID" | "INVALID";
  readonly correctability:
    | "NOT_APPLICABLE"
    | "CORRECTABLE"
    | "BLOCKING";
  readonly nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED"
    | "INVALID_BLOCKING";
  readonly findings: readonly RegistrationValidationFinding[];
  readonly validationEvidence: RegistrationValidationEvidence;
  readonly validatedBy: string;
  readonly validatedAt: string;
  readonly commandId: string;
  readonly history: readonly RegistrationValidationHistoryEntry[];
}

export interface ValidateCustomerRegistrationCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRegistrationVersion: number;
  expectedSubmissionRecordId: string;
  commandId: string;
}

export type RegistrationValidationErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_ACTOR"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "REGISTRATION_NOT_FOUND"
  | "REGISTRATION_NOT_SUBMITTED"
  | "STALE_REGISTRATION_VERSION"
  | "SUBMISSION_RECORD_MISSING"
  | "SUBMISSION_RECORD_REFERENCE_MISMATCH"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_REGISTRATION_REQUIRED"
  | "REGISTRATION_WINDOW_NOT_FOUND"
  | "REGISTRATION_WINDOW_REFERENCE_MISMATCH"
  | "REGISTRATION_ALREADY_VALIDATED"
  | "LATER_PHASE_STATE_EXISTS"
  | "AUTHORITATIVE_STATE_CHANGED";

export type ValidateCustomerRegistrationResult =
  | {
      ok: true;
      validation: AuctionRegistrationValidation;
      created: boolean;
    }
  | {
      ok: false;
      code: RegistrationValidationErrorCode;
      message: string;
      validation?: AuctionRegistrationValidation;
    };

export interface AuctionRegistrationValidationState {
  validations: AuctionRegistrationValidation[];
  getByRegistrationId: (
    registrationId: string,
  ) => AuctionRegistrationValidation | undefined;
  validateCustomerRegistration: (
    command: ValidateCustomerRegistrationCommand,
  ) => ValidateCustomerRegistrationResult;
  resetDeterministicRegistrationValidationState: () => void;
}

type ValidationSources = {
  registration: AuctionCustomerRegistration;
  submissionRecord: CustomerRegistrationSubmissionRecord;
  session: PersistedAuctionSession;
  registrationWindow: AuctionRegistrationWindow;
};

type ValidationEligibility =
  | {
      eligible: true;
      sources: ValidationSources;
    }
  | {
      eligible: false;
      code: RegistrationValidationErrorCode;
      message: string;
    };

export type RegistrationValidationEvaluation = {
  outcome: "VALID" | "INVALID";
  correctability: "NOT_APPLICABLE" | "CORRECTABLE" | "BLOCKING";
  nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED"
    | "INVALID_BLOCKING";
  findings: readonly RegistrationValidationFinding[];
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
  optional: readonly string[] = [],
) => {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
};

const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);

export const getCustomerRegistrationSubmissionRecordId = (
  registrationId: string,
) => `customer-registration-submission-${registrationId}`;

const validationIdFor = (registrationId: string) =>
  `registration-validation-${registrationId}`;

const commandKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedRegistrationVersion",
  "expectedSubmissionRecordId",
  "commandId",
]);

const laterPhaseKeys = [
  "membership",
  "membershipResult",
  "membershipCheck",
  "deposit",
  "depositResult",
  "depositCheck",
  "eligibility",
  "eligibilityResult",
  "eligibilityDecision",
  "publication",
  "publicationId",
  "publishedAt",
] as const;

const hasLaterPhaseState = (value: object) =>
  laterPhaseKeys.some((key) => Reflect.get(value, key) !== undefined);

const unsupportedRegistrationKeys = [
  ...laterPhaseKeys,
  "approval",
  "approvalDecision",
  "rejection",
  "rejectionReason",
] as const;

const hasUnsupportedRegistrationData = (value: object) =>
  unsupportedRegistrationKeys.some(
    (key) => Reflect.get(value, key) !== undefined,
  );

const finding = (
  code: RegistrationValidationFindingCode,
  severity: RegistrationValidationFindingSeverity,
  message: string,
): RegistrationValidationFinding => Object.freeze({ code, severity, message });

const addFinding = (
  findings: RegistrationValidationFinding[],
  nextFinding: RegistrationValidationFinding,
) => {
  if (!findings.some((item) => item.code === nextFinding.code))
    findings.push(nextFinding);
};

export const evaluateRegistrationValidation = ({
  registration,
  submissionRecord,
  session,
  registrationWindow,
}: {
  registration: AuctionCustomerRegistration | undefined;
  submissionRecord: CustomerRegistrationSubmissionRecord | undefined;
  session: PersistedAuctionSession | undefined;
  registrationWindow: AuctionRegistrationWindow | undefined;
}): RegistrationValidationEvaluation => {
  const findings: RegistrationValidationFinding[] = [];

  if (!registration) {
    addFinding(
      findings,
      finding(
        "MALFORMED_REGISTRATION",
        "BLOCKING",
        "Registration evidence is missing or malformed.",
      ),
    );
  } else {
    if (
      !registration.registrationId ||
      !positiveInteger(registration.registrationVersion) ||
      registration.status !== "SUBMITTED"
    )
      addFinding(
        findings,
        finding(
          "MALFORMED_REGISTRATION",
          "BLOCKING",
          "Registration identity, version, or submitted status is invalid.",
        ),
      );
    if (!registration.customerId.trim())
      addFinding(
        findings,
        finding(
          "CUSTOMER_IDENTITY_INVALID",
          "BLOCKING",
          "Customer identity is missing.",
        ),
      );
    if (!registration.rulesAccepted)
      addFinding(
        findings,
        finding(
          "RULES_ACCEPTANCE_MISSING",
          "CORRECTABLE",
          "Auction rules acceptance is missing.",
        ),
      );
    if (!validIsoTime(registration.rulesAcceptedAt))
      addFinding(
        findings,
        finding(
          "RULES_ACCEPTANCE_TIMESTAMP_MISSING",
          "CORRECTABLE",
          "Rules acceptance timestamp is missing.",
        ),
      );
    if (hasUnsupportedRegistrationData(registration))
      addFinding(
        findings,
        finding(
          "UNSUPPORTED_REGISTRATION_DATA",
          "BLOCKING",
          "Registration contains unsupported later-phase data.",
        ),
      );
  }

  if (!submissionRecord) {
    addFinding(
      findings,
      finding(
        "SUBMISSION_RECORD_MISSING",
        "BLOCKING",
        "Immutable Submission Record is missing.",
      ),
    );
  } else if (
    !registration ||
    submissionRecord.recordVersion !== 1 ||
    !validIsoTime(submissionRecord.submittedAt) ||
    submissionRecord.submittedBy !== registration.customerId ||
    registration.submittedAt !== submissionRecord.submittedAt
  ) {
    addFinding(
      findings,
      finding(
        registration &&
          submissionRecord.submittedBy !== registration.customerId
          ? "CUSTOMER_IDENTITY_INVALID"
          : "SUBMISSION_RECORD_INVALID",
        "BLOCKING",
        "Submission Record does not match immutable Registration evidence.",
      ),
    );
  }

  if (
    !registration ||
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED" ||
    session.sessionId !== registration.sessionId ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY"
  )
    addFinding(
      findings,
      finding(
        "SESSION_REFERENCE_INVALID",
        "BLOCKING",
        "Registration does not reference a valid dynamic Customer Session.",
      ),
    );

  if (
    !registration ||
    !registrationWindow ||
    registrationWindow.registrationWindowId !==
      registration.registrationWindowId ||
    registrationWindow.sessionId !== registration.sessionId ||
    registrationWindow.recordVersion !==
      registration.registrationWindowRecordVersion
  )
    addFinding(
      findings,
      finding(
        "REGISTRATION_WINDOW_REFERENCE_INVALID",
        "BLOCKING",
        "Registration Window reference is invalid.",
      ),
    );

  if (
    submissionRecord &&
    registrationWindow &&
    validIsoTime(submissionRecord.submittedAt) &&
    !(
      Date.parse(registrationWindow.window.registrationOpenAt) <=
        Date.parse(submissionRecord.submittedAt) &&
      Date.parse(submissionRecord.submittedAt) <
        Date.parse(registrationWindow.window.registrationCloseAt)
    )
  )
    addFinding(
      findings,
      finding(
        "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW",
        "BLOCKING",
        "submittedAt is outside the confirmed Registration Window.",
      ),
    );

  const frozenFindings = Object.freeze(
    findings.map((item) => Object.freeze({ ...item })),
  );
  const hasBlocking = findings.some((item) => item.severity === "BLOCKING");
  const hasCorrectable = findings.some(
    (item) => item.severity === "CORRECTABLE",
  );

  if (hasBlocking)
    return Object.freeze({
      outcome: "INVALID",
      correctability: "BLOCKING",
      nextStep: "INVALID_BLOCKING",
      findings: frozenFindings,
    });
  if (hasCorrectable)
    return Object.freeze({
      outcome: "INVALID",
      correctability: "CORRECTABLE",
      nextStep: "CORRECTION_REQUIRED",
      findings: frozenFindings,
    });
  return Object.freeze({
    outcome: "VALID",
    correctability: "NOT_APPLICABLE",
    nextStep: "READY_FOR_MEMBERSHIP_CHECK",
    findings: frozenFindings,
  });
};

const resolveValidationSources = (
  command: ValidateCustomerRegistrationCommand,
): ValidationEligibility => {
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
  if (registration.status !== "SUBMITTED")
    return {
      eligible: false,
      code: "REGISTRATION_NOT_SUBMITTED",
      message: "Only a SUBMITTED Registration can be validated.",
    };
  if (
    registration.registrationVersion !== command.expectedRegistrationVersion
  )
    return {
      eligible: false,
      code: "STALE_REGISTRATION_VERSION",
      message: "Registration version changed before validation.",
    };
  const expectedSubmissionRecordId =
    getCustomerRegistrationSubmissionRecordId(registration.registrationId);
  if (command.expectedSubmissionRecordId !== expectedSubmissionRecordId)
    return {
      eligible: false,
      code: "SUBMISSION_RECORD_REFERENCE_MISMATCH",
      message: "Submission Record reference does not match the Registration.",
    };
  if (!registration.submissionRecord)
    return {
      eligible: false,
      code: "SUBMISSION_RECORD_MISSING",
      message: "Immutable Submission Record is missing.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === registration.sessionId);
  if (!session)
    return {
      eligible: false,
      code: "SESSION_NOT_FOUND",
      message: "Dynamic Customer Session was not found.",
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "DYNAMIC_CUSTOMER_REGISTRATION_REQUIRED",
      message:
        "Registration Validation supports only dynamic Customer-requested Sessions.",
    };
  const registrationWindow = useAuctionRegistrationWindowStore
    .getState()
    .registrationWindows.find(
      (item) =>
        item.registrationWindowId === registration.registrationWindowId,
    );
  if (!registrationWindow)
    return {
      eligible: false,
      code: "REGISTRATION_WINDOW_NOT_FOUND",
      message: "Confirmed Registration Window was not found.",
    };
  if (
    registrationWindow.sessionId !== registration.sessionId ||
    registrationWindow.recordVersion !==
      registration.registrationWindowRecordVersion
  )
    return {
      eligible: false,
      code: "REGISTRATION_WINDOW_REFERENCE_MISMATCH",
      message: "Registration Window reference changed before validation.",
    };
  if (
    hasLaterPhaseState(registration) ||
    hasLaterPhaseState(session) ||
    hasLaterPhaseState(registrationWindow)
  )
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message:
        "Membership, Deposit, Eligibility, or Publication state already exists.",
    };
  return {
    eligible: true,
    sources: {
      registration,
      submissionRecord: registration.submissionRecord,
      session,
      registrationWindow,
    },
  };
};

export const evaluateRegistrationValidationEligibility = (
  command: ValidateCustomerRegistrationCommand,
): ValidationEligibility => {
  if (command.actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Only ADMIN can validate a submitted Registration.",
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
  if (Object.keys(command).some((key) => !commandKeys.has(key)))
    return {
      eligible: false,
      code: "UNSUPPORTED_FIELD",
      message: "Validation command contains unsupported fields.",
    };
  return resolveValidationSources(command);
};

const freezeValidation = (
  validation: AuctionRegistrationValidation,
): AuctionRegistrationValidation =>
  Object.freeze({
    ...validation,
    findings: Object.freeze(
      validation.findings.map((item) => Object.freeze({ ...item })),
    ),
    validationEvidence: Object.freeze({
      ...validation.validationEvidence,
      findingCodes: Object.freeze([
        ...validation.validationEvidence.findingCodes,
      ]),
    }),
    history: Object.freeze(
      validation.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

const failure = (
  code: RegistrationValidationErrorCode,
  message: string,
  validation?: AuctionRegistrationValidation,
): ValidateCustomerRegistrationResult => ({
  ok: false,
  code,
  message,
  ...(validation ? { validation } : {}),
});

const sourceFingerprint = (sources: ValidationSources) =>
  JSON.stringify({
    registration: sources.registration,
    submissionRecord: sources.submissionRecord,
    session: {
      sessionId: sources.session.sessionId,
      currentVersion: sources.session.currentVersion,
      lifecycleStatus: sources.session.lifecycleStatus,
      publicationStatus: sources.session.publicationStatus,
    },
    registrationWindow: sources.registrationWindow,
  });

const findingCodes = new Set<RegistrationValidationFindingCode>([
  "RULES_ACCEPTANCE_MISSING",
  "RULES_ACCEPTANCE_TIMESTAMP_MISSING",
  "CORRECTABLE_REGISTRATION_DATA_MISSING",
  "SUBMISSION_RECORD_MISSING",
  "SUBMISSION_RECORD_INVALID",
  "CUSTOMER_IDENTITY_INVALID",
  "SESSION_REFERENCE_INVALID",
  "REGISTRATION_WINDOW_REFERENCE_INVALID",
  "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW",
  "UNSUPPORTED_REGISTRATION_DATA",
  "MALFORMED_REGISTRATION",
]);

const correctableCodes = new Set<RegistrationValidationFindingCode>([
  "RULES_ACCEPTANCE_MISSING",
  "RULES_ACCEPTANCE_TIMESTAMP_MISSING",
  "CORRECTABLE_REGISTRATION_DATA_MISSING",
]);

const blockingCodes = new Set<RegistrationValidationFindingCode>([
  "SUBMISSION_RECORD_MISSING",
  "SUBMISSION_RECORD_INVALID",
  "CUSTOMER_IDENTITY_INVALID",
  "SESSION_REFERENCE_INVALID",
  "REGISTRATION_WINDOW_REFERENCE_INVALID",
  "SUBMITTED_OUTSIDE_CONFIRMED_WINDOW",
  "UNSUPPORTED_REGISTRATION_DATA",
  "MALFORMED_REGISTRATION",
]);

const forbiddenPersistenceKeys = new Set([
  ...laterPhaseKeys,
  "approval",
  "approvalDecision",
  "approvedAt",
  "rejection",
  "rejectedAt",
  "rejectionReason",
  "correctionCommand",
  "resubmission",
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

const validFinding = (
  value: unknown,
): value is RegistrationValidationFinding =>
  isRecord(value) &&
  exactKeys(value, ["code", "severity", "message"]) &&
  typeof value.code === "string" &&
  findingCodes.has(value.code as RegistrationValidationFindingCode) &&
  (value.severity === "CORRECTABLE" || value.severity === "BLOCKING") &&
  (correctableCodes.has(value.code as RegistrationValidationFindingCode)
    ? value.severity === "CORRECTABLE"
    : blockingCodes.has(value.code as RegistrationValidationFindingCode) &&
      value.severity === "BLOCKING") &&
  typeof value.message === "string" &&
  Boolean(value.message.trim());

const validHistory = (
  value: unknown,
  validation: Record<string, unknown>,
) =>
  isRecord(value) &&
  exactKeys(value, [
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
  ]) &&
  value.historyId === `${validation.validationId}-history-1` &&
  value.action === "CUSTOMER_REGISTRATION_VALIDATED" &&
  value.outcome === validation.outcome &&
  value.correctability === validation.correctability &&
  value.nextStep === validation.nextStep &&
  value.actorId === validation.validatedBy &&
  value.actorRole === "ADMIN" &&
  value.commandId === validation.commandId &&
  value.occurredAt === validation.validatedAt &&
  value.visibility === "STAFF_ONLY";

const sanitizeValidation = (
  value: unknown,
): AuctionRegistrationValidation | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "validationId",
      "recordVersion",
      "registrationId",
      "registrationVersion",
      "submissionRecordId",
      "sessionId",
      "customerId",
      "registrationWindowId",
      "outcome",
      "correctability",
      "nextStep",
      "findings",
      "validationEvidence",
      "validatedBy",
      "validatedAt",
      "commandId",
      "history",
    ]) ||
    typeof value.registrationId !== "string" ||
    value.validationId !== validationIdFor(value.registrationId) ||
    value.recordVersion !== 1 ||
    !positiveInteger(value.registrationVersion) ||
    value.submissionRecordId !==
      getCustomerRegistrationSubmissionRecordId(value.registrationId) ||
    typeof value.sessionId !== "string" ||
    typeof value.customerId !== "string" ||
    !value.customerId.trim() ||
    typeof value.registrationWindowId !== "string" ||
    (value.outcome !== "VALID" && value.outcome !== "INVALID") ||
    !["NOT_APPLICABLE", "CORRECTABLE", "BLOCKING"].includes(
      String(value.correctability),
    ) ||
    ![
      "READY_FOR_MEMBERSHIP_CHECK",
      "CORRECTION_REQUIRED",
      "INVALID_BLOCKING",
    ].includes(String(value.nextStep)) ||
    !Array.isArray(value.findings) ||
    !value.findings.every(validFinding) ||
    new Set(
      value.findings.map((item) =>
        isRecord(item) && typeof item.code === "string" ? item.code : "",
      ),
    ).size !== value.findings.length ||
    !isRecord(value.validationEvidence) ||
    !exactKeys(
      value.validationEvidence,
      [
        "submittedAt",
        "registrationOpenAt",
        "registrationCloseAt",
        "rulesAccepted",
        "findingCodes",
        "evaluatedAt",
      ],
      ["rulesAcceptedAt"],
    ) ||
    !validIsoTime(value.validationEvidence.submittedAt) ||
    !validIsoTime(value.validationEvidence.registrationOpenAt) ||
    !validIsoTime(value.validationEvidence.registrationCloseAt) ||
    typeof value.validationEvidence.rulesAccepted !== "boolean" ||
    (value.validationEvidence.rulesAcceptedAt !== undefined &&
      !validIsoTime(value.validationEvidence.rulesAcceptedAt)) ||
    !Array.isArray(value.validationEvidence.findingCodes) ||
    !value.validationEvidence.findingCodes.every(
      (code) => typeof code === "string" && findingCodes.has(code as RegistrationValidationFindingCode),
    ) ||
    !validIsoTime(value.validationEvidence.evaluatedAt) ||
    typeof value.validatedBy !== "string" ||
    !value.validatedBy.trim() ||
    !validIsoTime(value.validatedAt) ||
    value.validatedAt !== value.validationEvidence.evaluatedAt ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId) ||
    !Array.isArray(value.history) ||
    value.history.length !== 1 ||
    !validHistory(value.history[0], value)
  )
    return undefined;

  const codes = value.findings.map(
    (item) => (item as RegistrationValidationFinding).code,
  );
  if (
    JSON.stringify(codes) !==
      JSON.stringify(value.validationEvidence.findingCodes) ||
    (value.outcome === "VALID" &&
      (codes.length !== 0 ||
        value.correctability !== "NOT_APPLICABLE" ||
        value.nextStep !== "READY_FOR_MEMBERSHIP_CHECK")) ||
    (value.outcome === "INVALID" &&
      value.correctability === "CORRECTABLE" &&
      (value.nextStep !== "CORRECTION_REQUIRED" ||
        codes.length === 0 ||
        !codes.every((code) => correctableCodes.has(code)))) ||
    (value.outcome === "INVALID" &&
      value.correctability === "BLOCKING" &&
      (value.nextStep !== "INVALID_BLOCKING" ||
        !codes.some((code) => blockingCodes.has(code))))
  )
    return undefined;

  const registration = useAuctionCustomerRegistrationStore
    .getState()
    .registrations.find(
      (item) => item.registrationId === value.registrationId,
    );
  const registrationWindow = useAuctionRegistrationWindowStore
    .getState()
    .registrationWindows.find(
      (item) => item.registrationWindowId === value.registrationWindowId,
    );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === value.sessionId);
  if (
    !registration ||
    registration.status !== "SUBMITTED" ||
    !registration.submissionRecord ||
    registration.registrationVersion !== value.registrationVersion ||
    registration.customerId !== value.customerId ||
    registration.sessionId !== value.sessionId ||
    registration.registrationWindowId !== value.registrationWindowId ||
    registration.submissionRecord.submittedAt !==
      value.validationEvidence.submittedAt ||
    registrationWindow?.window.registrationOpenAt !==
      value.validationEvidence.registrationOpenAt ||
    registrationWindow.window.registrationCloseAt !==
      value.validationEvidence.registrationCloseAt
  )
    return undefined;

  const evaluation = evaluateRegistrationValidation({
    registration,
    submissionRecord: registration.submissionRecord,
    session,
    registrationWindow,
  });
  if (
    evaluation.outcome !== value.outcome ||
    evaluation.correctability !== value.correctability ||
    evaluation.nextStep !== value.nextStep ||
    JSON.stringify(evaluation.findings.map((item) => item.code)) !==
      JSON.stringify(codes)
  )
    return undefined;

  return freezeValidation(value as unknown as AuctionRegistrationValidation);
};

export const sanitizePersistedAuctionRegistrationValidationState = (
  persisted: unknown,
): Pick<AuctionRegistrationValidationState, "validations"> => {
  const empty = { validations: [] as AuctionRegistrationValidation[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["validations"]) ||
    !Array.isArray(persisted.validations)
  )
    return empty;
  const validations = persisted.validations.map(sanitizeValidation);
  if (validations.some((validation) => !validation)) return empty;
  const safe = validations.filter(
    (validation): validation is AuctionRegistrationValidation =>
      Boolean(validation),
  );
  if (
    new Set(safe.map((validation) => validation.validationId)).size !==
      safe.length ||
    new Set(safe.map((validation) => validation.registrationId)).size !==
      safe.length
  )
    return empty;
  return { validations: safe };
};

export const useAuctionRegistrationValidationStore =
  create<AuctionRegistrationValidationState>()(
    persist(
      (set, get) => ({
        validations: [],
        getByRegistrationId: (registrationId) =>
          get().validations.find(
            (validation) =>
              validation.registrationId === registrationId,
          ),
        validateCustomerRegistration: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Only ADMIN can validate a submitted Registration.",
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
              "Validation command contains unsupported fields.",
            );

          const sameCommand = get().validations.find(
            (validation) =>
              validation.registrationId === command.registrationId &&
              validation.commandId === command.commandId,
          );
          if (sameCommand)
            return { ok: true, validation: sameCommand, created: false };

          const existing = get().validations.find(
            (validation) =>
              validation.registrationId === command.registrationId,
          );
          if (existing)
            return failure(
              "REGISTRATION_ALREADY_VALIDATED",
              "Registration already has an immutable Validation Record.",
              existing,
            );

          const eligibility = evaluateRegistrationValidationEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const firstFingerprint = sourceFingerprint(eligibility.sources);

          const finalEligibility =
            evaluateRegistrationValidationEligibility(command);
          if (!finalEligibility.eligible)
            return failure(finalEligibility.code, finalEligibility.message);
          if (
            sourceFingerprint(finalEligibility.sources) !== firstFingerprint
          )
            return failure(
              "AUTHORITATIVE_STATE_CHANGED",
              "Authoritative Registration evidence changed before commit.",
            );

          const {
            registration,
            submissionRecord,
            session,
            registrationWindow,
          } = finalEligibility.sources;
          const evaluation = evaluateRegistrationValidation({
            registration,
            submissionRecord,
            session,
            registrationWindow,
          });
          const validatedAt = getRegistrationReadinessDeterministicNow();
          const validationId = validationIdFor(registration.registrationId);
          const validation = freezeValidation({
            validationId,
            recordVersion: 1,
            registrationId: registration.registrationId,
            registrationVersion: registration.registrationVersion,
            submissionRecordId:
              getCustomerRegistrationSubmissionRecordId(
                registration.registrationId,
              ),
            sessionId: registration.sessionId,
            customerId: registration.customerId,
            registrationWindowId: registration.registrationWindowId,
            outcome: evaluation.outcome,
            correctability: evaluation.correctability,
            nextStep: evaluation.nextStep,
            findings: evaluation.findings,
            validationEvidence: {
              submittedAt: submissionRecord.submittedAt,
              registrationOpenAt:
                registrationWindow.window.registrationOpenAt,
              registrationCloseAt:
                registrationWindow.window.registrationCloseAt,
              rulesAccepted: registration.rulesAccepted,
              ...(registration.rulesAcceptedAt
                ? { rulesAcceptedAt: registration.rulesAcceptedAt }
                : {}),
              findingCodes: evaluation.findings.map((item) => item.code),
              evaluatedAt: validatedAt,
            },
            validatedBy: command.actorId,
            validatedAt,
            commandId: command.commandId,
            history: [
              {
                historyId: `${validationId}-history-1`,
                action: "CUSTOMER_REGISTRATION_VALIDATED",
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
          set({ validations: [...get().validations, validation] });
          return { ok: true, validation, created: true };
        },
        resetDeterministicRegistrationValidationState: () =>
          set({ validations: [] }),
      }),
      {
        name: AUCTION_REGISTRATION_VALIDATION_STORAGE_KEY,
        version: AUCTION_REGISTRATION_VALIDATION_SCHEMA_VERSION,
        partialize: (state) => ({ validations: state.validations }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionRegistrationValidationState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
