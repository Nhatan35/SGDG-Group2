import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "./auctionApprovalDecisionStore";
import {
  getConfirmedScheduleEvidenceValidity,
  useAuctionConfirmedScheduleStore,
  type AuctionConfirmedSchedule,
} from "./auctionConfirmedScheduleStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_REGISTRATION_READINESS_STORAGE_KEY =
  "sgdg-auction-registration-opening-readiness-v1";
export const AUCTION_REGISTRATION_READINESS_SCHEMA_VERSION = 1;
export const REGISTRATION_READINESS_DEMO_CLOCK_KEY =
  "sgdg-registration-readiness-demo-clock";
export const REGISTRATION_READINESS_DEFAULT_NOW =
  "2026-07-30T00:00:00.000Z";
export const REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE =
  "REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE";
export const REGISTRATION_READINESS_BLOCKED_BY_STALE_SCHEDULE =
  "REGISTRATION_READINESS_BLOCKED_BY_STALE_SCHEDULE";
export const REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION =
  "REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION";
export const CONFIRMED_SCHEDULE_REQUIRED_MESSAGE =
  "Session chưa có Confirmed Schedule hợp lệ.";
export const STALE_SCHEDULE_READINESS_MESSAGE =
  "Confirmed Schedule hoặc approval evidence không còn hiện hành.";
export const REGISTRATION_CONFIGURATION_BLOCKER_MESSAGE =
  "Phiên SGDG-managed chưa hoàn tất cấu hình, phê duyệt và Schedule.";

export type RegistrationOpeningReadinessStatus =
  | "WAITING_FOR_OPEN_TIME"
  | "READY_TO_OPEN_REGISTRATION"
  | "BLOCKED"
  | "WINDOW_EXPIRED";

export type RegistrationReadinessFindingCode =
  | "REGISTRATION_OPEN_TIME_NOT_REACHED"
  | "REGISTRATION_WINDOW_EXPIRED"
  | "APPROVAL_EVIDENCE_STALE"
  | "CONFIRMED_SCHEDULE_EVIDENCE_STALE";

export interface RegistrationReadinessWindow {
  readonly timezone: string;
  readonly registrationOpenAt: string;
  readonly registrationCloseAt: string;
}

export interface RegistrationReadinessEvaluation {
  readonly evaluatedAt: string;
  readonly findingCodes: readonly RegistrationReadinessFindingCode[];
}

export interface RegistrationReadinessHistoryEntry {
  readonly historyId: string;
  readonly assessmentVersion: number;
  readonly action:
    | "REGISTRATION_READINESS_ASSESSED"
    | "REGISTRATION_READINESS_REASSESSED";
  readonly resultingStatus: RegistrationOpeningReadinessStatus;
  readonly findingCodes: readonly RegistrationReadinessFindingCode[];
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionRegistrationOpeningAssessment {
  readonly assessmentId: string;
  readonly assessmentVersion: number;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly confirmedScheduleId: string;
  readonly confirmedScheduleRecordVersion: number;
  readonly approvalDecisionId: string;
  readonly status: RegistrationOpeningReadinessStatus;
  readonly evaluatedWindow: RegistrationReadinessWindow;
  readonly evaluation: RegistrationReadinessEvaluation;
  readonly evaluatedBy: string;
  readonly updatedAt: string;
  readonly history: readonly RegistrationReadinessHistoryEntry[];
}

export interface AssessRegistrationOpeningReadinessCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedConfirmedScheduleId: string;
  expectedAssessmentVersion?: number;
  commandId: string;
}

export type RegistrationReadinessErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_SESSION_REQUIRED"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "CONFIRMED_SCHEDULE_MISMATCH"
  | "STALE_ASSESSMENT_VERSION"
  | "LATER_PHASE_STATE_EXISTS"
  | typeof REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE
  | typeof REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION;

export type RegistrationReadinessCommandResult =
  | {
      ok: true;
      assessment: AuctionRegistrationOpeningAssessment;
      created: boolean;
      changed: boolean;
    }
  | {
      ok: false;
      code: RegistrationReadinessErrorCode;
      message: string;
      assessment?: AuctionRegistrationOpeningAssessment;
    };

export interface AuctionRegistrationOpeningReadinessState {
  assessments: AuctionRegistrationOpeningAssessment[];
  getBySessionId: (
    sessionId: string,
  ) => AuctionRegistrationOpeningAssessment | undefined;
  assessRegistrationOpeningReadiness: (
    command: AssessRegistrationOpeningReadinessCommand,
  ) => RegistrationReadinessCommandResult;
  resetDeterministicRegistrationReadinessState: () => void;
}

export interface RegistrationReadinessEvaluationInput {
  window: RegistrationReadinessWindow;
  now: string;
  approvalEvidenceCurrent: boolean;
  confirmedScheduleEvidenceCurrent: boolean;
}

const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));
const validWindow = (value: RegistrationReadinessWindow) =>
  value.timezone.trim().length > 0 &&
  validIsoTime(value.registrationOpenAt) &&
  validIsoTime(value.registrationCloseAt) &&
  Date.parse(value.registrationOpenAt) < Date.parse(value.registrationCloseAt);

export const getRegistrationReadinessDeterministicNow = () => {
  if (typeof localStorage === "undefined")
    return REGISTRATION_READINESS_DEFAULT_NOW;
  const overridden = localStorage.getItem(
    REGISTRATION_READINESS_DEMO_CLOCK_KEY,
  );
  return validIsoTime(overridden)
    ? overridden
    : REGISTRATION_READINESS_DEFAULT_NOW;
};

export const evaluateRegistrationOpeningReadiness = ({
  window,
  now,
  approvalEvidenceCurrent,
  confirmedScheduleEvidenceCurrent,
}: RegistrationReadinessEvaluationInput): {
  status: RegistrationOpeningReadinessStatus;
  findingCodes: readonly RegistrationReadinessFindingCode[];
} => {
  const findings: RegistrationReadinessFindingCode[] = [];
  if (!approvalEvidenceCurrent)
    findings.push("APPROVAL_EVIDENCE_STALE");
  if (!confirmedScheduleEvidenceCurrent)
    findings.push("CONFIRMED_SCHEDULE_EVIDENCE_STALE");
  if (findings.length || !validWindow(window) || !validIsoTime(now))
    return Object.freeze({
      status: "BLOCKED",
      findingCodes: Object.freeze(
        findings.length
          ? findings
          : ([
              "CONFIRMED_SCHEDULE_EVIDENCE_STALE",
            ] as RegistrationReadinessFindingCode[]),
      ),
    });
  const evaluatedAt = Date.parse(now);
  const openAt = Date.parse(window.registrationOpenAt);
  const closeAt = Date.parse(window.registrationCloseAt);
  if (evaluatedAt < openAt)
    return Object.freeze({
      status: "WAITING_FOR_OPEN_TIME",
      findingCodes: Object.freeze([
        "REGISTRATION_OPEN_TIME_NOT_REACHED" as const,
      ]),
    });
  if (evaluatedAt >= closeAt)
    return Object.freeze({
      status: "WINDOW_EXPIRED",
      findingCodes: Object.freeze([
        "REGISTRATION_WINDOW_EXPIRED" as const,
      ]),
    });
  return Object.freeze({
    status: "READY_TO_OPEN_REGISTRATION",
    findingCodes: Object.freeze([]),
  });
};

const assessmentIdFor = (sessionId: string) =>
  `registration-opening-assessment-${sessionId}`;
const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);
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
const hasLaterPhaseState = (value: object) =>
  [
    "registration",
    "registrationState",
    "registrationStatus",
    "registrationOpen",
    "registrationSubmissions",
    "publication",
    "publicationId",
    "publishedAt",
  ].some((key) => Reflect.get(value, key) !== undefined);
const allowedCommandKeys = new Set([
  "sessionId",
  "actorId",
  "actorRole",
  "expectedSessionVersion",
  "expectedConfirmedScheduleId",
  "expectedAssessmentVersion",
  "commandId",
]);
const failure = (
  code: RegistrationReadinessErrorCode,
  message: string,
  assessment?: AuctionRegistrationOpeningAssessment,
): RegistrationReadinessCommandResult => ({
  ok: false,
  code,
  message,
  ...(assessment ? { assessment } : {}),
});

type ReadinessAuthority = {
  session: ReturnType<typeof useAuctionSessionStore.getState>["sessions"][number];
  confirmed: AuctionConfirmedSchedule;
  approvalEvidenceCurrent: boolean;
  confirmedScheduleEvidenceCurrent: boolean;
};
type ReadinessAuthorityResult =
  | { eligible: true; authority: ReadinessAuthority }
  | {
      eligible: false;
      code: RegistrationReadinessErrorCode;
      message: string;
    };

const resolveReadinessAuthority = (
  command: AssessRegistrationOpeningReadinessCommand,
): ReadinessAuthorityResult => {
  if (command.actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ ADMIN được đánh giá Registration Readiness.",
    };
  if (!validCommandId(command.commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID không hợp lệ.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === command.sessionId);
  if (!session)
    return {
      eligible: false,
      code: "SESSION_NOT_FOUND",
      message: "Không tìm thấy dynamic Auction Session.",
    };
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return {
      eligible: false,
      code: REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION,
      message: REGISTRATION_CONFIGURATION_BLOCKER_MESSAGE,
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "DYNAMIC_CUSTOMER_SESSION_REQUIRED",
      message: "Chỉ dynamic Customer-requested Session được hỗ trợ.",
    };
  if (session.lifecycleStatus !== "DRAFT")
    return {
      eligible: false,
      code: "INVALID_SESSION_STATE",
      message: "Session phải giữ lifecycle DRAFT.",
    };
  if (session.publicationStatus !== "NOT_READY")
    return {
      eligible: false,
      code: "INVALID_PUBLICATION_STATE",
      message: "Publication phải giữ NOT_READY.",
    };
  if (session.currentVersion !== command.expectedSessionVersion)
    return {
      eligible: false,
      code: "STALE_SESSION_VERSION",
      message: "Session version đã thay đổi.",
    };
  if (hasLaterPhaseState(session))
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message: "Registration hoặc Publication đã tồn tại ngoài phạm vi.",
    };
  const confirmed = useAuctionConfirmedScheduleStore
    .getState()
    .confirmedSchedules.find((item) => item.sessionId === command.sessionId);
  if (!confirmed)
    return {
      eligible: false,
      code: REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE,
      message: CONFIRMED_SCHEDULE_REQUIRED_MESSAGE,
    };
  if (
    confirmed.confirmedScheduleId !== command.expectedConfirmedScheduleId ||
    confirmed.recordVersion !== 1
  )
    return {
      eligible: false,
      code: "CONFIRMED_SCHEDULE_MISMATCH",
      message: "Confirmed Schedule reference không khớp.",
    };
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find(
      (item) => item.decisionId === confirmed.approvalDecisionId,
    );
  const approvalEvidenceCurrent = Boolean(
    decision &&
      decision.outcome === "APPROVED" &&
      getApprovalDecisionEvidenceValidity(decision) === "CURRENT",
  );
  const confirmedScheduleEvidenceCurrent =
    getConfirmedScheduleEvidenceValidity(confirmed) === "CURRENT";
  return {
    eligible: true,
    authority: {
      session,
      confirmed,
      approvalEvidenceCurrent,
      confirmedScheduleEvidenceCurrent,
    },
  };
};

const freezeAssessment = (
  assessment: AuctionRegistrationOpeningAssessment,
): AuctionRegistrationOpeningAssessment =>
  Object.freeze({
    ...assessment,
    evaluatedWindow: Object.freeze({ ...assessment.evaluatedWindow }),
    evaluation: Object.freeze({
      ...assessment.evaluation,
      findingCodes: Object.freeze([...assessment.evaluation.findingCodes]),
    }),
    history: Object.freeze(
      assessment.history.map((entry) =>
        Object.freeze({
          ...entry,
          findingCodes: Object.freeze([...entry.findingCodes]),
        }),
      ),
    ),
  });

const meaningfulAssessmentChanged = (
  current: AuctionRegistrationOpeningAssessment,
  next: {
    status: RegistrationOpeningReadinessStatus;
    findingCodes: readonly RegistrationReadinessFindingCode[];
    window: RegistrationReadinessWindow;
    confirmed: AuctionConfirmedSchedule;
  },
) =>
  current.status !== next.status ||
  JSON.stringify(current.evaluation.findingCodes) !==
    JSON.stringify(next.findingCodes) ||
  JSON.stringify(current.evaluatedWindow) !== JSON.stringify(next.window) ||
  current.confirmedScheduleId !== next.confirmed.confirmedScheduleId ||
  current.confirmedScheduleRecordVersion !== next.confirmed.recordVersion ||
  current.approvalDecisionId !== next.confirmed.approvalDecisionId;

const forbiddenPersistenceKeys = new Set([
  "registration",
  "registrationStatus",
  "registrationOpen",
  "registrationSubmissions",
  "customerRegistration",
  "membership",
  "membershipResult",
  "deposit",
  "depositResult",
  "eligibility",
  "eligibilityResult",
  "publication",
  "publicationId",
  "timer",
  "timers",
  "automation",
  "scheduledJob",
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
const statuses: readonly RegistrationOpeningReadinessStatus[] = [
  "WAITING_FOR_OPEN_TIME",
  "READY_TO_OPEN_REGISTRATION",
  "BLOCKED",
  "WINDOW_EXPIRED",
];
const findingCodes: readonly RegistrationReadinessFindingCode[] = [
  "REGISTRATION_OPEN_TIME_NOT_REACHED",
  "REGISTRATION_WINDOW_EXPIRED",
  "APPROVAL_EVIDENCE_STALE",
  "CONFIRMED_SCHEDULE_EVIDENCE_STALE",
];
const validFindingList = (
  value: unknown,
): value is RegistrationReadinessFindingCode[] =>
  Array.isArray(value) &&
  value.every((code) =>
    findingCodes.includes(code as RegistrationReadinessFindingCode),
  );
const validPersistedWindow = (
  value: unknown,
): value is RegistrationReadinessWindow =>
  isRecord(value) &&
  exactKeys(value, [
    "timezone",
    "registrationOpenAt",
    "registrationCloseAt",
  ]) &&
  typeof value.timezone === "string" &&
  validIsoTime(value.registrationOpenAt) &&
  validIsoTime(value.registrationCloseAt) &&
  Date.parse(value.registrationOpenAt) < Date.parse(value.registrationCloseAt);
const validHistory = (
  value: unknown,
  assessmentId: string,
  maxVersion: number,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "historyId",
    "assessmentVersion",
    "action",
    "resultingStatus",
    "findingCodes",
    "actorId",
    "actorRole",
    "commandId",
    "occurredAt",
    "visibility",
  ]) &&
  typeof value.historyId === "string" &&
  value.historyId.startsWith(`${assessmentId}-history-`) &&
  positiveInteger(value.assessmentVersion) &&
  value.assessmentVersion <= maxVersion &&
  (value.action === "REGISTRATION_READINESS_ASSESSED" ||
    value.action === "REGISTRATION_READINESS_REASSESSED") &&
  statuses.includes(value.resultingStatus as RegistrationOpeningReadinessStatus) &&
  validFindingList(value.findingCodes) &&
  typeof value.actorId === "string" &&
  value.actorRole === "ADMIN" &&
  typeof value.commandId === "string" &&
  validCommandId(value.commandId) &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeAssessment = (
  value: unknown,
): AuctionRegistrationOpeningAssessment | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "assessmentId",
      "assessmentVersion",
      "sessionId",
      "sessionVersion",
      "confirmedScheduleId",
      "confirmedScheduleRecordVersion",
      "approvalDecisionId",
      "status",
      "evaluatedWindow",
      "evaluation",
      "evaluatedBy",
      "updatedAt",
      "history",
    ]) ||
    typeof value.sessionId !== "string" ||
    value.assessmentId !== assessmentIdFor(value.sessionId) ||
    !positiveInteger(value.assessmentVersion) ||
    !positiveInteger(value.sessionVersion) ||
    typeof value.confirmedScheduleId !== "string" ||
    value.confirmedScheduleRecordVersion !== 1 ||
    typeof value.approvalDecisionId !== "string" ||
    !statuses.includes(value.status as RegistrationOpeningReadinessStatus) ||
    !validPersistedWindow(value.evaluatedWindow) ||
    !isRecord(value.evaluation) ||
    !exactKeys(value.evaluation, ["evaluatedAt", "findingCodes"]) ||
    !validIsoTime(value.evaluation.evaluatedAt) ||
    !validFindingList(value.evaluation.findingCodes) ||
    typeof value.evaluatedBy !== "string" ||
    !validIsoTime(value.updatedAt) ||
    !Array.isArray(value.history) ||
    value.history.length < 1 ||
    value.history.length > 20 ||
    !value.history.every((entry) =>
      validHistory(
        entry,
        value.assessmentId as string,
        value.assessmentVersion as number,
      ),
    )
  )
    return undefined;
  const assessment = freezeAssessment(
    value as unknown as AuctionRegistrationOpeningAssessment,
  );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === assessment.sessionId);
  const confirmed = useAuctionConfirmedScheduleStore
    .getState()
    .confirmedSchedules.find(
      (item) => item.confirmedScheduleId === assessment.confirmedScheduleId,
    );
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.currentVersion !== assessment.sessionVersion ||
    !confirmed ||
    confirmed.sessionId !== session.sessionId ||
    confirmed.recordVersion !== assessment.confirmedScheduleRecordVersion ||
    confirmed.approvalDecisionId !== assessment.approvalDecisionId ||
    JSON.stringify(assessment.evaluatedWindow) !==
      JSON.stringify({
        timezone: confirmed.schedule.timezone,
        registrationOpenAt: confirmed.schedule.registrationOpenAt,
        registrationCloseAt: confirmed.schedule.registrationCloseAt,
      })
  )
    return undefined;
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find(
      (item) => item.decisionId === confirmed.approvalDecisionId,
    );
  const evaluated = evaluateRegistrationOpeningReadiness({
    window: assessment.evaluatedWindow,
    now: assessment.evaluation.evaluatedAt,
    approvalEvidenceCurrent: Boolean(
      decision &&
        decision.outcome === "APPROVED" &&
        getApprovalDecisionEvidenceValidity(decision) === "CURRENT",
    ),
    confirmedScheduleEvidenceCurrent:
      getConfirmedScheduleEvidenceValidity(confirmed) === "CURRENT",
  });
  if (
    evaluated.status !== assessment.status ||
    JSON.stringify(evaluated.findingCodes) !==
      JSON.stringify(assessment.evaluation.findingCodes)
  )
    return undefined;
  return assessment;
};

export const sanitizePersistedRegistrationReadinessState = (
  persisted: unknown,
): Pick<AuctionRegistrationOpeningReadinessState, "assessments"> => {
  const empty = {
    assessments: [] as AuctionRegistrationOpeningAssessment[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["assessments"]) ||
    !Array.isArray(persisted.assessments)
  )
    return empty;
  const assessments = persisted.assessments.map(sanitizeAssessment);
  if (assessments.some((assessment) => !assessment)) return empty;
  const safe = assessments.filter(
    (assessment): assessment is AuctionRegistrationOpeningAssessment =>
      Boolean(assessment),
  );
  if (
    new Set(safe.map((assessment) => assessment.assessmentId)).size !==
      safe.length ||
    new Set(safe.map((assessment) => assessment.sessionId)).size !==
      safe.length
  )
    return empty;
  return { assessments: safe };
};

export const useAuctionRegistrationOpeningReadinessStore =
  create<AuctionRegistrationOpeningReadinessState>()(
    persist(
      (set, get) => ({
        assessments: [],
        getBySessionId: (sessionId) =>
          get().assessments.find(
            (assessment) => assessment.sessionId === sessionId,
          ),
        assessRegistrationOpeningReadiness: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Chỉ ADMIN được đánh giá Registration Readiness.",
            );
          if (
            Object.keys(command).some((key) => !allowedCommandKeys.has(key))
          )
            return failure(
              "UNSUPPORTED_FIELD",
              "Readiness command chứa field ngoài phạm vi.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().assessments.find((assessment) =>
            assessment.history.some(
              (entry) => entry.commandId === command.commandId,
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              assessment: sameCommand,
              created: false,
              changed: false,
            };
          const existing = get().assessments.find(
            (assessment) => assessment.sessionId === command.sessionId,
          );
          if (
            existing &&
            command.expectedAssessmentVersion !== undefined &&
            existing.assessmentVersion !== command.expectedAssessmentVersion
          )
            return failure(
              "STALE_ASSESSMENT_VERSION",
              "Registration readiness assessment version đã thay đổi.",
              existing,
            );
          let authority = resolveReadinessAuthority(command);
          if (!authority.eligible)
            return failure(authority.code, authority.message, existing);
          authority = resolveReadinessAuthority(command);
          if (!authority.eligible)
            return failure(authority.code, authority.message, existing);
          const { session, confirmed } = authority.authority;
          const window = Object.freeze({
            timezone: confirmed.schedule.timezone,
            registrationOpenAt: confirmed.schedule.registrationOpenAt,
            registrationCloseAt: confirmed.schedule.registrationCloseAt,
          });
          const evaluatedAt = getRegistrationReadinessDeterministicNow();
          const evaluated = evaluateRegistrationOpeningReadiness({
            window,
            now: evaluatedAt,
            approvalEvidenceCurrent:
              authority.authority.approvalEvidenceCurrent,
            confirmedScheduleEvidenceCurrent:
              authority.authority.confirmedScheduleEvidenceCurrent,
          });
          if (
            existing &&
            !meaningfulAssessmentChanged(existing, {
              status: evaluated.status,
              findingCodes: evaluated.findingCodes,
              window,
              confirmed,
            })
          )
            return {
              ok: true,
              assessment: existing,
              created: false,
              changed: false,
            };
          const nextVersion = existing
            ? existing.assessmentVersion + 1
            : 1;
          const assessmentId = assessmentIdFor(session.sessionId);
          const historyEntry: RegistrationReadinessHistoryEntry =
            Object.freeze({
              historyId: `${assessmentId}-history-${nextVersion}`,
              assessmentVersion: nextVersion,
              action: existing
                ? "REGISTRATION_READINESS_REASSESSED"
                : "REGISTRATION_READINESS_ASSESSED",
              resultingStatus: evaluated.status,
              findingCodes: evaluated.findingCodes,
              actorId: command.actorId,
              actorRole: "ADMIN",
              commandId: command.commandId,
              occurredAt: evaluatedAt,
              visibility: "STAFF_ONLY",
            });
          const assessment = freezeAssessment({
            assessmentId,
            assessmentVersion: nextVersion,
            sessionId: session.sessionId,
            sessionVersion: session.currentVersion,
            confirmedScheduleId: confirmed.confirmedScheduleId,
            confirmedScheduleRecordVersion: confirmed.recordVersion,
            approvalDecisionId: confirmed.approvalDecisionId,
            status: evaluated.status,
            evaluatedWindow: window,
            evaluation: {
              evaluatedAt,
              findingCodes: evaluated.findingCodes,
            },
            evaluatedBy: command.actorId,
            updatedAt: evaluatedAt,
            history: [
              ...(existing?.history ?? []),
              historyEntry,
            ].slice(-20),
          });
          set({
            assessments: existing
              ? get().assessments.map((item) =>
                  item.assessmentId === assessment.assessmentId
                    ? assessment
                    : item,
                )
              : [...get().assessments, assessment],
          });
          return {
            ok: true,
            assessment,
            created: !existing,
            changed: true,
          };
        },
        resetDeterministicRegistrationReadinessState: () =>
          set({ assessments: [] }),
      }),
      {
        name: AUCTION_REGISTRATION_READINESS_STORAGE_KEY,
        version: AUCTION_REGISTRATION_READINESS_SCHEMA_VERSION,
        partialize: (state) => ({ assessments: state.assessments }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedRegistrationReadinessState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
