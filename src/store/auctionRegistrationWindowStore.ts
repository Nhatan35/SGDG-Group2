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
import {
  getRegistrationReadinessDeterministicNow,
  useAuctionRegistrationOpeningReadinessStore,
  type AuctionRegistrationOpeningAssessment,
} from "./auctionRegistrationOpeningReadinessStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_REGISTRATION_WINDOW_STORAGE_KEY =
  "sgdg-auction-registration-windows-v1";
export const AUCTION_REGISTRATION_WINDOW_SCHEMA_VERSION = 1;
export const PROTOTYPE_MANUAL_REGISTRATION_OPENING_POLICY =
  "PROTOTYPE MANUAL REGISTRATION OPENING POLICY — USER-REQUESTED IMPLEMENTATION — NOT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";
export const REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT =
  "REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT";
export const REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW =
  "REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW";
export const REGISTRATION_OPEN_BLOCKED_BY_STALE_EVIDENCE =
  "REGISTRATION_OPEN_BLOCKED_BY_STALE_EVIDENCE";
export const REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION =
  "REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION";
export const REGISTRATION_ALREADY_OPEN = "REGISTRATION_ALREADY_OPEN";
export const OPEN_REGISTRATION_WINDOW_EXPIRED =
  "OPEN_REGISTRATION_WINDOW_EXPIRED";
export const OPEN_REGISTRATION_EVIDENCE_STALE =
  "OPEN_REGISTRATION_EVIDENCE_STALE";
export const READY_ASSESSMENT_REQUIRED_MESSAGE =
  "Registration Readiness chưa ở trạng thái READY_TO_OPEN_REGISTRATION.";
export const OUTSIDE_CONFIRMED_WINDOW_MESSAGE =
  "Thời điểm hiện tại không nằm trong cửa sổ đăng ký đã xác nhận.";
export const STALE_REGISTRATION_AUTHORITY_MESSAGE =
  "Approval hoặc Confirmed Schedule evidence không còn hiện hành.";
export const REGISTRATION_OPEN_CONFIGURATION_MESSAGE =
  "Phiên SGDG-managed chưa hoàn tất cấu hình, phê duyệt và Schedule.";

export interface OpenRegistrationWindowValues {
  readonly timezone: string;
  readonly registrationOpenAt: string;
  readonly registrationCloseAt: string;
}

export interface RegistrationOpeningEvidence {
  readonly readinessStatus: "READY_TO_OPEN_REGISTRATION";
  readonly approvalEvidenceValidity: "CURRENT";
  readonly scheduleEvidenceValidity: "CURRENT";
  readonly evaluatedAt: string;
  readonly findingCodes: readonly string[];
}

export interface RegistrationWindowHistoryEntry {
  readonly historyId: string;
  readonly action: "REGISTRATION_WINDOW_OPENED";
  readonly recordVersion: 1;
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionRegistrationWindow {
  readonly registrationWindowId: string;
  readonly recordVersion: 1;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly approvalDecisionId: string;
  readonly confirmedScheduleId: string;
  readonly confirmedScheduleRecordVersion: number;
  readonly readinessAssessmentId: string;
  readonly readinessAssessmentVersion: number;
  readonly status: "OPEN";
  readonly window: OpenRegistrationWindowValues;
  readonly openingEvidence: RegistrationOpeningEvidence;
  readonly openedBy: string;
  readonly openedAt: string;
  readonly commandId: string;
  readonly history: readonly RegistrationWindowHistoryEntry[];
}

export interface OpenRegistrationWindowCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedConfirmedScheduleId: string;
  expectedAssessmentId: string;
  expectedAssessmentVersion: number;
  commandId: string;
}

export type RegistrationWindowErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_SESSION_REQUIRED"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "CONFIRMED_SCHEDULE_NOT_FOUND"
  | "CONFIRMED_SCHEDULE_MISMATCH"
  | "READINESS_ASSESSMENT_NOT_FOUND"
  | "READINESS_ASSESSMENT_MISMATCH"
  | "STALE_ASSESSMENT_VERSION"
  | "LATER_PHASE_STATE_EXISTS"
  | typeof REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT
  | typeof REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW
  | typeof REGISTRATION_OPEN_BLOCKED_BY_STALE_EVIDENCE
  | typeof REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION
  | typeof REGISTRATION_ALREADY_OPEN;

export type OpenRegistrationWindowResult =
  | {
      ok: true;
      registrationWindow: AuctionRegistrationWindow;
      created: boolean;
    }
  | {
      ok: false;
      code: RegistrationWindowErrorCode;
      message: string;
      registrationWindow?: AuctionRegistrationWindow;
    };

export interface AuctionRegistrationWindowState {
  registrationWindows: AuctionRegistrationWindow[];
  getBySessionId: (
    sessionId: string,
  ) => AuctionRegistrationWindow | undefined;
  openRegistrationWindow: (
    command: OpenRegistrationWindowCommand,
  ) => OpenRegistrationWindowResult;
  resetDeterministicRegistrationWindowState: () => void;
}

type OpeningAuthority = {
  session: ReturnType<typeof useAuctionSessionStore.getState>["sessions"][number];
  confirmed: AuctionConfirmedSchedule;
  assessment: AuctionRegistrationOpeningAssessment;
};
export type RegistrationOpeningEligibility =
  | { eligible: true; authority: OpeningAuthority; evaluatedAt: string }
  | {
      eligible: false;
      code: RegistrationWindowErrorCode;
      message: string;
    };

const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));
const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);
const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
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
const registrationWindowIdFor = (sessionId: string) =>
  `registration-window-${sessionId}`;
const insideWindow = (
  now: string,
  window: {
    registrationOpenAt: string;
    registrationCloseAt: string;
  },
) =>
  validIsoTime(now) &&
  validIsoTime(window.registrationOpenAt) &&
  validIsoTime(window.registrationCloseAt) &&
  Date.parse(window.registrationOpenAt) <= Date.parse(now) &&
  Date.parse(now) < Date.parse(window.registrationCloseAt);
const hasLaterPhaseState = (value: object) =>
  [
    "customerRegistration",
    "registrationSubmissions",
    "membershipResult",
    "depositResult",
    "eligibilityResult",
    "registrationClosedAt",
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
  "expectedAssessmentId",
  "expectedAssessmentVersion",
  "commandId",
]);
const failure = (
  code: RegistrationWindowErrorCode,
  message: string,
  registrationWindow?: AuctionRegistrationWindow,
): OpenRegistrationWindowResult => ({
  ok: false,
  code,
  message,
  ...(registrationWindow ? { registrationWindow } : {}),
});

export const evaluateRegistrationOpeningEligibility = (
  command: OpenRegistrationWindowCommand,
): RegistrationOpeningEligibility => {
  if (command.actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ ADMIN được mở Registration Window.",
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
      code: REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION,
      message: REGISTRATION_OPEN_CONFIGURATION_MESSAGE,
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
      message: "Customer Registration hoặc Publication đã tồn tại.",
    };
  const confirmed = useAuctionConfirmedScheduleStore
    .getState()
    .confirmedSchedules.find((item) => item.sessionId === command.sessionId);
  if (!confirmed)
    return {
      eligible: false,
      code: "CONFIRMED_SCHEDULE_NOT_FOUND",
      message: "Không tìm thấy Confirmed Schedule.",
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
  const assessment = useAuctionRegistrationOpeningReadinessStore
    .getState()
    .assessments.find((item) => item.sessionId === command.sessionId);
  if (!assessment)
    return {
      eligible: false,
      code: "READINESS_ASSESSMENT_NOT_FOUND",
      message: "Không tìm thấy Registration Readiness assessment.",
    };
  if (
    assessment.assessmentId !== command.expectedAssessmentId ||
    assessment.confirmedScheduleId !== confirmed.confirmedScheduleId ||
    assessment.confirmedScheduleRecordVersion !== confirmed.recordVersion
  )
    return {
      eligible: false,
      code: "READINESS_ASSESSMENT_MISMATCH",
      message: "Readiness assessment reference không khớp.",
    };
  if (assessment.assessmentVersion !== command.expectedAssessmentVersion)
    return {
      eligible: false,
      code: "STALE_ASSESSMENT_VERSION",
      message: "Readiness assessment version đã thay đổi.",
    };
  if (assessment.status !== "READY_TO_OPEN_REGISTRATION")
    return {
      eligible: false,
      code: REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT,
      message: READY_ASSESSMENT_REQUIRED_MESSAGE,
    };
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find(
      (item) => item.decisionId === confirmed.approvalDecisionId,
    );
  if (
    !decision ||
    decision.outcome !== "APPROVED" ||
    getApprovalDecisionEvidenceValidity(decision) !== "CURRENT" ||
    getConfirmedScheduleEvidenceValidity(confirmed) !== "CURRENT"
  )
    return {
      eligible: false,
      code: REGISTRATION_OPEN_BLOCKED_BY_STALE_EVIDENCE,
      message: STALE_REGISTRATION_AUTHORITY_MESSAGE,
    };
  const evaluatedAt = getRegistrationReadinessDeterministicNow();
  if (!insideWindow(evaluatedAt, confirmed.schedule))
    return {
      eligible: false,
      code: REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW,
      message: OUTSIDE_CONFIRMED_WINDOW_MESSAGE,
    };
  return {
    eligible: true,
    authority: { session, confirmed, assessment },
    evaluatedAt,
  };
};

const freezeRegistrationWindow = (
  value: AuctionRegistrationWindow,
): AuctionRegistrationWindow =>
  Object.freeze({
    ...value,
    window: Object.freeze({ ...value.window }),
    openingEvidence: Object.freeze({
      ...value.openingEvidence,
      findingCodes: Object.freeze([...value.openingEvidence.findingCodes]),
    }),
    history: Object.freeze(
      value.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

export type OpenRegistrationWindowValidity =
  | "CURRENT"
  | typeof OPEN_REGISTRATION_WINDOW_EXPIRED
  | typeof OPEN_REGISTRATION_EVIDENCE_STALE
  | "INVALID";

export const getOpenRegistrationWindowValidity = (
  registrationWindow: AuctionRegistrationWindow,
): OpenRegistrationWindowValidity => {
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === registrationWindow.sessionId);
  const confirmed = useAuctionConfirmedScheduleStore
    .getState()
    .confirmedSchedules.find(
      (item) =>
        item.confirmedScheduleId === registrationWindow.confirmedScheduleId,
    );
  const assessment = useAuctionRegistrationOpeningReadinessStore
    .getState()
    .assessments.find(
      (item) => item.assessmentId === registrationWindow.readinessAssessmentId,
    );
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find(
      (item) => item.decisionId === registrationWindow.approvalDecisionId,
    );
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !confirmed ||
    !assessment ||
    !decision ||
    confirmed.sessionId !== session.sessionId ||
    assessment.sessionId !== session.sessionId
  )
    return "INVALID";
  if (
    decision.outcome !== "APPROVED" ||
    getApprovalDecisionEvidenceValidity(decision) !== "CURRENT" ||
    getConfirmedScheduleEvidenceValidity(confirmed) !== "CURRENT"
  )
    return OPEN_REGISTRATION_EVIDENCE_STALE;
  if (
    Date.parse(getRegistrationReadinessDeterministicNow()) >=
    Date.parse(registrationWindow.window.registrationCloseAt)
  )
    return OPEN_REGISTRATION_WINDOW_EXPIRED;
  return "CURRENT";
};

const forbiddenPersistenceKeys = new Set([
  "customerRegistration",
  "registrationSubmission",
  "registrationSubmissions",
  "participantCount",
  "membership",
  "membershipResult",
  "deposit",
  "depositResult",
  "eligibility",
  "eligibilityResult",
  "closedAt",
  "closeReason",
  "extendedAt",
  "extension",
  "cancelledAt",
  "rescheduledAt",
  "publication",
  "publicationId",
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
const validWindow = (value: unknown): value is OpenRegistrationWindowValues =>
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
const validOpeningEvidence = (
  value: unknown,
): value is RegistrationOpeningEvidence =>
  isRecord(value) &&
  exactKeys(value, [
    "readinessStatus",
    "approvalEvidenceValidity",
    "scheduleEvidenceValidity",
    "evaluatedAt",
    "findingCodes",
  ]) &&
  value.readinessStatus === "READY_TO_OPEN_REGISTRATION" &&
  value.approvalEvidenceValidity === "CURRENT" &&
  value.scheduleEvidenceValidity === "CURRENT" &&
  validIsoTime(value.evaluatedAt) &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.length === 0;
const validHistory = (
  value: unknown,
  registrationWindowId: string,
  commandId: string,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "historyId",
    "action",
    "recordVersion",
    "actorId",
    "actorRole",
    "commandId",
    "occurredAt",
    "visibility",
  ]) &&
  value.historyId === `${registrationWindowId}-history-1` &&
  value.action === "REGISTRATION_WINDOW_OPENED" &&
  value.recordVersion === 1 &&
  typeof value.actorId === "string" &&
  value.actorRole === "ADMIN" &&
  value.commandId === commandId &&
  validCommandId(commandId) &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeRegistrationWindow = (
  value: unknown,
): AuctionRegistrationWindow | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "registrationWindowId",
      "recordVersion",
      "sessionId",
      "sessionVersion",
      "approvalDecisionId",
      "confirmedScheduleId",
      "confirmedScheduleRecordVersion",
      "readinessAssessmentId",
      "readinessAssessmentVersion",
      "status",
      "window",
      "openingEvidence",
      "openedBy",
      "openedAt",
      "commandId",
      "history",
    ]) ||
    typeof value.sessionId !== "string" ||
    value.registrationWindowId !== registrationWindowIdFor(value.sessionId) ||
    value.recordVersion !== 1 ||
    !positiveInteger(value.sessionVersion) ||
    typeof value.approvalDecisionId !== "string" ||
    typeof value.confirmedScheduleId !== "string" ||
    value.confirmedScheduleRecordVersion !== 1 ||
    typeof value.readinessAssessmentId !== "string" ||
    !positiveInteger(value.readinessAssessmentVersion) ||
    value.status !== "OPEN" ||
    !validWindow(value.window) ||
    !validOpeningEvidence(value.openingEvidence) ||
    typeof value.openedBy !== "string" ||
    !validIsoTime(value.openedAt) ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId) ||
    !Array.isArray(value.history) ||
    value.history.length !== 1 ||
    !validHistory(
      value.history[0],
      value.registrationWindowId,
      value.commandId,
    )
  )
    return undefined;
  const registrationWindow = freezeRegistrationWindow(
    value as unknown as AuctionRegistrationWindow,
  );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === registrationWindow.sessionId);
  const confirmed = useAuctionConfirmedScheduleStore
    .getState()
    .confirmedSchedules.find(
      (item) =>
        item.confirmedScheduleId === registrationWindow.confirmedScheduleId,
    );
  const assessment = useAuctionRegistrationOpeningReadinessStore
    .getState()
    .assessments.find(
      (item) =>
        item.assessmentId === registrationWindow.readinessAssessmentId,
    );
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.currentVersion !== registrationWindow.sessionVersion ||
    !confirmed ||
    confirmed.sessionId !== session.sessionId ||
    confirmed.recordVersion !==
      registrationWindow.confirmedScheduleRecordVersion ||
    confirmed.approvalDecisionId !==
      registrationWindow.approvalDecisionId ||
    !assessment ||
    assessment.sessionId !== session.sessionId ||
    assessment.assessmentVersion !==
      registrationWindow.readinessAssessmentVersion ||
    assessment.status !== "READY_TO_OPEN_REGISTRATION" ||
    assessment.confirmedScheduleId !== confirmed.confirmedScheduleId ||
    JSON.stringify(registrationWindow.window) !==
      JSON.stringify({
        timezone: confirmed.schedule.timezone,
        registrationOpenAt: confirmed.schedule.registrationOpenAt,
        registrationCloseAt: confirmed.schedule.registrationCloseAt,
      }) ||
    !insideWindow(
      registrationWindow.openingEvidence.evaluatedAt,
      registrationWindow.window,
    ) ||
    registrationWindow.openedAt !==
      registrationWindow.openingEvidence.evaluatedAt
  )
    return undefined;
  return registrationWindow;
};

export const sanitizePersistedAuctionRegistrationWindowState = (
  persisted: unknown,
): Pick<AuctionRegistrationWindowState, "registrationWindows"> => {
  const empty = { registrationWindows: [] as AuctionRegistrationWindow[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["registrationWindows"]) ||
    !Array.isArray(persisted.registrationWindows)
  )
    return empty;
  const registrationWindows = persisted.registrationWindows.map(
    sanitizeRegistrationWindow,
  );
  if (registrationWindows.some((item) => !item)) return empty;
  const safe = registrationWindows.filter(
    (item): item is AuctionRegistrationWindow => Boolean(item),
  );
  if (
    new Set(safe.map((item) => item.registrationWindowId)).size !==
      safe.length ||
    new Set(safe.map((item) => item.sessionId)).size !== safe.length
  )
    return empty;
  return { registrationWindows: safe };
};

export const useAuctionRegistrationWindowStore =
  create<AuctionRegistrationWindowState>()(
    persist(
      (set, get) => ({
        registrationWindows: [],
        getBySessionId: (sessionId) =>
          get().registrationWindows.find(
            (item) => item.sessionId === sessionId,
          ),
        openRegistrationWindow: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Chỉ ADMIN được mở Registration Window.",
            );
          if (
            Object.keys(command).some((key) => !allowedCommandKeys.has(key))
          )
            return failure(
              "UNSUPPORTED_FIELD",
              "Open Registration command chứa field ngoài phạm vi.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().registrationWindows.find(
            (item) => item.commandId === command.commandId,
          );
          if (sameCommand)
            return {
              ok: true,
              registrationWindow: sameCommand,
              created: false,
            };
          const existing = get().registrationWindows.find(
            (item) => item.sessionId === command.sessionId,
          );
          if (existing)
            return failure(
              REGISTRATION_ALREADY_OPEN,
              "Session đã có immutable OPEN Registration Window.",
              existing,
            );
          let eligibility = evaluateRegistrationOpeningEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          eligibility = evaluateRegistrationOpeningEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          if (
            get().registrationWindows.some(
              (item) => item.sessionId === command.sessionId,
            )
          )
            return failure(
              REGISTRATION_ALREADY_OPEN,
              "Authoritative state changed before opening commit.",
            );
          const { session, confirmed, assessment } =
            eligibility.authority;
          const registrationWindowId = registrationWindowIdFor(
            session.sessionId,
          );
          const registrationWindow = freezeRegistrationWindow({
            registrationWindowId,
            recordVersion: 1,
            sessionId: session.sessionId,
            sessionVersion: session.currentVersion,
            approvalDecisionId: confirmed.approvalDecisionId,
            confirmedScheduleId: confirmed.confirmedScheduleId,
            confirmedScheduleRecordVersion: confirmed.recordVersion,
            readinessAssessmentId: assessment.assessmentId,
            readinessAssessmentVersion: assessment.assessmentVersion,
            status: "OPEN",
            window: {
              timezone: confirmed.schedule.timezone,
              registrationOpenAt: confirmed.schedule.registrationOpenAt,
              registrationCloseAt: confirmed.schedule.registrationCloseAt,
            },
            openingEvidence: {
              readinessStatus: "READY_TO_OPEN_REGISTRATION",
              approvalEvidenceValidity: "CURRENT",
              scheduleEvidenceValidity: "CURRENT",
              evaluatedAt: eligibility.evaluatedAt,
              findingCodes: [],
            },
            openedBy: command.actorId,
            openedAt: eligibility.evaluatedAt,
            commandId: command.commandId,
            history: [
              {
                historyId: `${registrationWindowId}-history-1`,
                action: "REGISTRATION_WINDOW_OPENED",
                recordVersion: 1,
                actorId: command.actorId,
                actorRole: "ADMIN",
                commandId: command.commandId,
                occurredAt: eligibility.evaluatedAt,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({
            registrationWindows: [
              ...get().registrationWindows,
              registrationWindow,
            ],
          });
          return {
            ok: true,
            registrationWindow,
            created: true,
          };
        },
        resetDeterministicRegistrationWindowState: () =>
          set({ registrationWindows: [] }),
      }),
      {
        name: AUCTION_REGISTRATION_WINDOW_STORAGE_KEY,
        version: AUCTION_REGISTRATION_WINDOW_SCHEMA_VERSION,
        partialize: (state) => ({
          registrationWindows: state.registrationWindows,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionRegistrationWindowState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
