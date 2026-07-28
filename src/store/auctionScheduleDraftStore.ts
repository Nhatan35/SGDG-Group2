import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "./auctionApprovalDecisionStore";
import { useAuctionConfigurationStore } from "./auctionConfigurationStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_SCHEDULE_DRAFT_STORAGE_KEY =
  "sgdg-auction-schedule-drafts-v1";
export const AUCTION_SCHEDULE_DRAFT_SCHEMA_VERSION = 1;
export const PROTOTYPE_SCHEDULE_CLASSIFICATION =
  "PROTOTYPE SCHEDULE MODEL — USER-REQUESTED IMPLEMENTATION — NOT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";
export const SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE =
  "SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE";
export const SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION =
  "SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION";
export const SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION =
  "SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION";
export const STALE_APPROVAL_EVIDENCE_MESSAGE =
  "Approval Decision đã được ghi nhận nhưng evidence hiện hành không còn khớp. Không thể chuẩn bị Schedule Draft.";
export const APPROVED_DECISION_REQUIRED_MESSAGE =
  "Session chưa có Approval Decision hợp lệ. Không thể chuẩn bị Schedule Draft.";
export const SCHEDULE_CONFIGURATION_BLOCKER_MESSAGE =
  "Phiên SGDG-managed chưa hoàn tất cấu hình và phê duyệt. Không thể chuẩn bị Schedule Draft.";
export const SCHEDULE_DETERMINISTIC_NOW = "2026-07-26T19:00:00.000Z";

export type ScheduleDraftFindingCode =
  | "TIMEZONE_REQUIRED"
  | "TIMEZONE_INVALID"
  | "REGISTRATION_OPEN_REQUIRED"
  | "REGISTRATION_CLOSE_REQUIRED"
  | "AUCTION_START_REQUIRED"
  | "AUCTION_END_REQUIRED"
  | "INVALID_TIMESTAMP"
  | "REGISTRATION_OPEN_MUST_BE_FUTURE"
  | "REGISTRATION_CLOSE_MUST_BE_AFTER_OPEN"
  | "AUCTION_START_MUST_BE_AFTER_REGISTRATION_CLOSE"
  | "AUCTION_END_MUST_BE_AFTER_AUCTION_START"
  | "APPROVAL_EVIDENCE_STALE";

export interface ProposedAuctionSchedule {
  readonly timezone: string;
  readonly registrationOpenAt?: string;
  readonly registrationCloseAt?: string;
  readonly auctionStartAt?: string;
  readonly auctionEndAt?: string;
}

export interface ScheduleDraftCompleteness {
  readonly complete: boolean;
  readonly findingCodes: readonly ScheduleDraftFindingCode[];
}

export type AuctionScheduleDraftHistoryAction =
  | "SCHEDULE_DRAFT_CREATED"
  | "SCHEDULE_DRAFT_SAVED";

export interface AuctionScheduleDraftHistoryEntry {
  readonly historyId: string;
  readonly scheduleDraftId: string;
  readonly scheduleVersion: number;
  readonly action: AuctionScheduleDraftHistoryAction;
  readonly actorId: string;
  readonly actorRole: "CONTENT_STAFF";
  readonly commandId: string;
  readonly completeness: "INCOMPLETE" | "COMPLETE";
  readonly findingCodes: readonly ScheduleDraftFindingCode[];
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionScheduleDraft {
  readonly scheduleDraftId: string;
  readonly scheduleVersion: number;
  readonly sessionId: string;
  readonly sessionVersionAtCreation: number;
  readonly approvalDecisionId: string;
  readonly approvalDecisionVersion: number;
  readonly configurationSnapshotId: string;
  readonly status: "DRAFT";
  readonly proposedSchedule: ProposedAuctionSchedule;
  readonly completeness: ScheduleDraftCompleteness;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly history: readonly AuctionScheduleDraftHistoryEntry[];
}

export interface CreateScheduleDraftCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedApprovalDecisionId: string;
  commandId: string;
}

export interface SaveScheduleDraftCommand {
  scheduleDraftId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedScheduleVersion: number;
  expectedSessionVersion: number;
  commandId: string;
  timezone: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  auctionStartAt?: string;
  auctionEndAt?: string;
}

export type ScheduleDraftCommandErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_DYNAMIC"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "APPROVAL_DECISION_MISMATCH"
  | "CONFIGURATION_SNAPSHOT_MISSING"
  | "SCHEDULE_DRAFT_ALREADY_EXISTS"
  | "SCHEDULE_DRAFT_NOT_FOUND"
  | "STALE_SCHEDULE_VERSION"
  | "UNSUPPORTED_FIELD"
  | "LATER_PHASE_STATE_EXISTS"
  | typeof SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE
  | typeof SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION
  | typeof SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION;

export type ScheduleDraftCommandResult =
  | {
      ok: true;
      draft: AuctionScheduleDraft;
      created: boolean;
      changed: boolean;
    }
  | {
      ok: false;
      code: ScheduleDraftCommandErrorCode;
      message: string;
      draft?: AuctionScheduleDraft;
    };

export interface AuctionScheduleDraftState {
  drafts: AuctionScheduleDraft[];
  getDraftById: (
    scheduleDraftId: string,
  ) => AuctionScheduleDraft | undefined;
  getDraftBySessionId: (
    sessionId: string,
  ) => AuctionScheduleDraft | undefined;
  createScheduleDraft: (
    command: CreateScheduleDraftCommand,
  ) => ScheduleDraftCommandResult;
  saveScheduleDraft: (
    command: SaveScheduleDraftCommand,
  ) => ScheduleDraftCommandResult;
  resetDeterministicScheduleDraftState: () => void;
}

const scheduleDraftIdFor = (sessionId: string) =>
  `auction-schedule-draft-${sessionId}`;
const deterministicTime = (version: number) =>
  new Date(Date.UTC(2026, 6, 26, 19, version)).toISOString();
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
const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));
const validTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(
      new Date(SCHEDULE_DETERMINISTIC_NOW),
    );
    return true;
  } catch {
    return false;
  }
};
const hasLaterPhaseState = (value: object) =>
  [
    "confirmedScheduleId",
    "scheduleConfirmation",
    "scheduleConfirmedAt",
    "registrationState",
    "registrationStatus",
    "registrationOpen",
    "publicationId",
    "publishedAt",
  ].some((key) => Reflect.get(value, key) !== undefined);

export const evaluateScheduleDraftCompleteness = (
  proposedSchedule: ProposedAuctionSchedule,
  now = SCHEDULE_DETERMINISTIC_NOW,
): ScheduleDraftCompleteness => {
  const findings: ScheduleDraftFindingCode[] = [];
  const timezone = proposedSchedule.timezone.trim();
  if (!timezone) findings.push("TIMEZONE_REQUIRED");
  else if (!validTimezone(timezone)) findings.push("TIMEZONE_INVALID");
  const fields = [
    ["registrationOpenAt", "REGISTRATION_OPEN_REQUIRED"],
    ["registrationCloseAt", "REGISTRATION_CLOSE_REQUIRED"],
    ["auctionStartAt", "AUCTION_START_REQUIRED"],
    ["auctionEndAt", "AUCTION_END_REQUIRED"],
  ] as const;
  for (const [field, required] of fields) {
    const value = proposedSchedule[field];
    if (!value) findings.push(required);
    else if (!validIsoTime(value) && !findings.includes("INVALID_TIMESTAMP"))
      findings.push("INVALID_TIMESTAMP");
  }
  if (
    fields.every(([field]) => validIsoTime(proposedSchedule[field])) &&
    Number.isFinite(Date.parse(now))
  ) {
    const open = Date.parse(proposedSchedule.registrationOpenAt!);
    const close = Date.parse(proposedSchedule.registrationCloseAt!);
    const start = Date.parse(proposedSchedule.auctionStartAt!);
    const end = Date.parse(proposedSchedule.auctionEndAt!);
    if (open <= Date.parse(now))
      findings.push("REGISTRATION_OPEN_MUST_BE_FUTURE");
    if (close <= open)
      findings.push("REGISTRATION_CLOSE_MUST_BE_AFTER_OPEN");
    if (start <= close)
      findings.push("AUCTION_START_MUST_BE_AFTER_REGISTRATION_CLOSE");
    if (end <= start)
      findings.push("AUCTION_END_MUST_BE_AFTER_AUCTION_START");
  }
  return Object.freeze({
    complete: findings.length === 0,
    findingCodes: Object.freeze(findings),
  });
};

const freezeDraft = (draft: AuctionScheduleDraft): AuctionScheduleDraft =>
  Object.freeze({
    ...draft,
    proposedSchedule: Object.freeze({ ...draft.proposedSchedule }),
    completeness: Object.freeze({
      ...draft.completeness,
      findingCodes: Object.freeze([...draft.completeness.findingCodes]),
    }),
    history: Object.freeze(
      draft.history.map((entry) =>
        Object.freeze({
          ...entry,
          findingCodes: Object.freeze([...entry.findingCodes]),
        }),
      ),
    ),
  });

const failure = (
  code: ScheduleDraftCommandErrorCode,
  message: string,
  draft?: AuctionScheduleDraft,
): ScheduleDraftCommandResult => ({
  ok: false,
  code,
  message,
  ...(draft ? { draft } : {}),
});

export const evaluateScheduleDraftEligibility = ({
  sessionId,
  actorRole,
  expectedSessionVersion,
  expectedApprovalDecisionId,
  commandId,
}: {
  sessionId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedApprovalDecisionId?: string;
  commandId: string;
}):
  | {
      eligible: true;
      session: ReturnType<
        typeof useAuctionSessionStore.getState
      >["sessions"][number];
      decision: ReturnType<
        typeof useAuctionApprovalDecisionStore.getState
      >["decisions"][number];
      snapshot: ReturnType<
        typeof useAuctionConfigurationStore.getState
      >["snapshots"][number];
    }
  | {
      eligible: false;
      code: ScheduleDraftCommandErrorCode;
      message: string;
    } => {
  if (actorRole !== "CONTENT_STAFF")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ CONTENT_STAFF được chuẩn bị Schedule Draft.",
    };
  if (!validCommandId(commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID không hợp lệ.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === sessionId);
  if (!session)
    return {
      eligible: false,
      code: "SESSION_NOT_FOUND",
      message: "Không tìm thấy dynamic Session.",
    };
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return {
      eligible: false,
      code: SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION,
      message: SCHEDULE_CONFIGURATION_BLOCKER_MESSAGE,
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "SESSION_NOT_DYNAMIC",
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
  if (session.currentVersion !== expectedSessionVersion)
    return {
      eligible: false,
      code: "STALE_SESSION_VERSION",
      message: "Session version đã thay đổi.",
    };
  if (hasLaterPhaseState(session))
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message: "Phát hiện confirmed Schedule, Registration hoặc Publication.",
    };
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find((item) => item.sessionId === sessionId);
  if (!decision || decision.outcome !== "APPROVED")
    return {
      eligible: false,
      code: SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION,
      message: APPROVED_DECISION_REQUIRED_MESSAGE,
    };
  if (
    expectedApprovalDecisionId &&
    decision.decisionId !== expectedApprovalDecisionId
  )
    return {
      eligible: false,
      code: "APPROVAL_DECISION_MISMATCH",
      message: "Approval Decision reference đã thay đổi.",
    };
  if (getApprovalDecisionEvidenceValidity(decision) !== "CURRENT")
    return {
      eligible: false,
      code: SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE,
      message: STALE_APPROVAL_EVIDENCE_MESSAGE,
    };
  const snapshot = useAuctionConfigurationStore
    .getState()
    .snapshots.find(
      (item) =>
        item.sessionId === sessionId &&
        item.snapshotId ===
          decision.validationEvidence.configurationSnapshotId,
    );
  if (!snapshot)
    return {
      eligible: false,
      code: "CONFIGURATION_SNAPSHOT_MISSING",
      message: "Không tìm thấy current Configuration Snapshot.",
    };
  return { eligible: true, session, decision, snapshot };
};

const allowedSaveKeys = new Set([
  "scheduleDraftId",
  "actorId",
  "actorRole",
  "expectedScheduleVersion",
  "expectedSessionVersion",
  "commandId",
  "timezone",
  "registrationOpenAt",
  "registrationCloseAt",
  "auctionStartAt",
  "auctionEndAt",
]);

const normalizeProposedSchedule = (
  command: SaveScheduleDraftCommand,
): ProposedAuctionSchedule =>
  Object.freeze({
    timezone: command.timezone.trim(),
    ...(command.registrationOpenAt
      ? { registrationOpenAt: command.registrationOpenAt }
      : {}),
    ...(command.registrationCloseAt
      ? { registrationCloseAt: command.registrationCloseAt }
      : {}),
    ...(command.auctionStartAt
      ? { auctionStartAt: command.auctionStartAt }
      : {}),
    ...(command.auctionEndAt
      ? { auctionEndAt: command.auctionEndAt }
      : {}),
  });

const findings = [
  "TIMEZONE_REQUIRED",
  "TIMEZONE_INVALID",
  "REGISTRATION_OPEN_REQUIRED",
  "REGISTRATION_CLOSE_REQUIRED",
  "AUCTION_START_REQUIRED",
  "AUCTION_END_REQUIRED",
  "INVALID_TIMESTAMP",
  "REGISTRATION_OPEN_MUST_BE_FUTURE",
  "REGISTRATION_CLOSE_MUST_BE_AFTER_OPEN",
  "AUCTION_START_MUST_BE_AFTER_REGISTRATION_CLOSE",
  "AUCTION_END_MUST_BE_AFTER_AUCTION_START",
  "APPROVAL_EVIDENCE_STALE",
] as const;

const forbiddenKeys = new Set([
  "confirmedAt",
  "approvedAt",
  "cancelledAt",
  "rescheduledAt",
  "registration",
  "registrationStatus",
  "publication",
  "publicationId",
  "notifications",
  "room",
  "roomReference",
  "listingFee",
  "paymentDeadline",
  "depositDeadline",
  "previewDate",
]);
const containsForbiddenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => forbiddenKeys.has(key) || containsForbiddenKey(nested),
  );
};

const validProposedSchedule = (value: unknown) =>
  isRecord(value) &&
  exactKeys(
    value,
    ["timezone"],
    [
      "registrationOpenAt",
      "registrationCloseAt",
      "auctionStartAt",
      "auctionEndAt",
    ],
  ) &&
  typeof value.timezone === "string" &&
  [
    value.registrationOpenAt,
    value.registrationCloseAt,
    value.auctionStartAt,
    value.auctionEndAt,
  ].every((item) => item === undefined || typeof item === "string");

const validCompleteness = (value: unknown) =>
  isRecord(value) &&
  exactKeys(value, ["complete", "findingCodes"]) &&
  typeof value.complete === "boolean" &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.every((code) =>
    findings.includes(code as ScheduleDraftFindingCode),
  );

const validHistory = (
  value: unknown,
  draftId: string,
  maxVersion: number,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "historyId",
    "scheduleDraftId",
    "scheduleVersion",
    "action",
    "actorId",
    "actorRole",
    "commandId",
    "completeness",
    "findingCodes",
    "occurredAt",
    "visibility",
  ]) &&
  typeof value.historyId === "string" &&
  value.scheduleDraftId === draftId &&
  positiveInteger(value.scheduleVersion) &&
  value.scheduleVersion <= maxVersion &&
  (value.action === "SCHEDULE_DRAFT_CREATED" ||
    value.action === "SCHEDULE_DRAFT_SAVED") &&
  typeof value.actorId === "string" &&
  value.actorRole === "CONTENT_STAFF" &&
  typeof value.commandId === "string" &&
  validCommandId(value.commandId) &&
  (value.completeness === "INCOMPLETE" ||
    value.completeness === "COMPLETE") &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.every((code) =>
    findings.includes(code as ScheduleDraftFindingCode),
  ) &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeDraft = (value: unknown): AuctionScheduleDraft | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenKey(value) ||
    !exactKeys(value, [
      "scheduleDraftId",
      "scheduleVersion",
      "sessionId",
      "sessionVersionAtCreation",
      "approvalDecisionId",
      "approvalDecisionVersion",
      "configurationSnapshotId",
      "status",
      "proposedSchedule",
      "completeness",
      "createdBy",
      "createdAt",
      "updatedBy",
      "updatedAt",
      "history",
    ]) ||
    typeof value.sessionId !== "string" ||
    value.scheduleDraftId !== scheduleDraftIdFor(value.sessionId) ||
    positiveInteger(value.scheduleVersion) === false ||
    positiveInteger(value.sessionVersionAtCreation) === false ||
    typeof value.approvalDecisionId !== "string" ||
    positiveInteger(value.approvalDecisionVersion) === false ||
    typeof value.configurationSnapshotId !== "string" ||
    value.status !== "DRAFT" ||
    !validProposedSchedule(value.proposedSchedule) ||
    !validCompleteness(value.completeness) ||
    typeof value.createdBy !== "string" ||
    !validIsoTime(value.createdAt) ||
    typeof value.updatedBy !== "string" ||
    !validIsoTime(value.updatedAt) ||
    !Array.isArray(value.history) ||
    !value.history.every((entry) =>
      validHistory(
        entry,
        value.scheduleDraftId as string,
        value.scheduleVersion as number,
      ),
    ) ||
    value.history[0]?.action !== "SCHEDULE_DRAFT_CREATED"
  )
    return undefined;
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === value.sessionId);
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find((item) => item.decisionId === value.approvalDecisionId);
  const snapshot = useAuctionConfigurationStore
    .getState()
    .snapshots.find((item) => item.snapshotId === value.configurationSnapshotId);
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !decision ||
    decision.outcome !== "APPROVED" ||
    decision.sessionId !== session.sessionId ||
    decision.decisionVersion !== value.approvalDecisionVersion ||
    !snapshot ||
    snapshot.sessionId !== session.sessionId ||
    snapshot.snapshotId !==
      decision.validationEvidence.configurationSnapshotId
  )
    return undefined;
  const proposed = value.proposedSchedule as unknown as ProposedAuctionSchedule;
  const evaluated = evaluateScheduleDraftCompleteness(proposed);
  const persistedCompleteness =
    value.completeness as unknown as ScheduleDraftCompleteness;
  if (
    evaluated.complete !== persistedCompleteness.complete ||
    JSON.stringify(evaluated.findingCodes) !==
      JSON.stringify(persistedCompleteness.findingCodes)
  )
    return undefined;
  return freezeDraft(value as unknown as AuctionScheduleDraft);
};

export const sanitizePersistedAuctionScheduleDraftState = (
  persisted: unknown,
): Pick<AuctionScheduleDraftState, "drafts"> => {
  const empty = { drafts: [] as AuctionScheduleDraft[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["drafts"]) ||
    !Array.isArray(persisted.drafts)
  )
    return empty;
  const drafts = persisted.drafts.map(sanitizeDraft);
  if (drafts.some((draft) => !draft)) return empty;
  const safe = drafts.filter(
    (draft): draft is AuctionScheduleDraft => Boolean(draft),
  );
  if (
    new Set(safe.map((draft) => draft.scheduleDraftId)).size !== safe.length ||
    new Set(safe.map((draft) => draft.sessionId)).size !== safe.length
  )
    return empty;
  return { drafts: safe };
};

export const useAuctionScheduleDraftStore = create<AuctionScheduleDraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      getDraftById: (scheduleDraftId) =>
        get().drafts.find(
          (draft) => draft.scheduleDraftId === scheduleDraftId,
        ),
      getDraftBySessionId: (sessionId) =>
        get().drafts.find((draft) => draft.sessionId === sessionId),
      createScheduleDraft: (command) => {
        if (command.actorRole !== "CONTENT_STAFF")
          return failure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF được chuẩn bị Schedule Draft.",
          );
        if (!validCommandId(command.commandId))
          return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
        const sameCommand = get().drafts.find((draft) =>
          draft.history.some(
            (entry) =>
              entry.commandId === command.commandId &&
              entry.action === "SCHEDULE_DRAFT_CREATED",
          ),
        );
        if (sameCommand)
          return {
            ok: true,
            draft: sameCommand,
            created: false,
            changed: false,
          };
        const existing = get().drafts.find(
          (draft) => draft.sessionId === command.sessionId,
        );
        if (existing)
          return failure(
            "SCHEDULE_DRAFT_ALREADY_EXISTS",
            "Session đã có Schedule Draft.",
            existing,
          );
        let authority = evaluateScheduleDraftEligibility({
          ...command,
          expectedApprovalDecisionId:
            command.expectedApprovalDecisionId,
        });
        if (!authority.eligible)
          return failure(authority.code, authority.message);
        authority = evaluateScheduleDraftEligibility({
          ...command,
          expectedApprovalDecisionId:
            command.expectedApprovalDecisionId,
        });
        if (!authority.eligible)
          return failure(authority.code, authority.message);
        if (
          get().drafts.some(
            (draft) => draft.sessionId === command.sessionId,
          )
        )
          return failure(
            "SCHEDULE_DRAFT_ALREADY_EXISTS",
            "Authoritative state changed before Schedule Draft commit.",
          );
        const proposedSchedule = Object.freeze({ timezone: "" });
        const completeness =
          evaluateScheduleDraftCompleteness(proposedSchedule);
        const occurredAt = deterministicTime(1);
        const scheduleDraftId = scheduleDraftIdFor(command.sessionId);
        const draft = freezeDraft({
          scheduleDraftId,
          scheduleVersion: 1,
          sessionId: authority.session.sessionId,
          sessionVersionAtCreation: authority.session.currentVersion,
          approvalDecisionId: authority.decision.decisionId,
          approvalDecisionVersion: authority.decision.decisionVersion,
          configurationSnapshotId: authority.snapshot.snapshotId,
          status: "DRAFT",
          proposedSchedule,
          completeness,
          createdBy: command.actorId,
          createdAt: occurredAt,
          updatedBy: command.actorId,
          updatedAt: occurredAt,
          history: [
            {
              historyId: `${scheduleDraftId}-history-1`,
              scheduleDraftId,
              scheduleVersion: 1,
              action: "SCHEDULE_DRAFT_CREATED",
              actorId: command.actorId,
              actorRole: "CONTENT_STAFF",
              commandId: command.commandId,
              completeness: "INCOMPLETE",
              findingCodes: completeness.findingCodes,
              occurredAt,
              visibility: "STAFF_ONLY",
            },
          ],
        });
        set({ drafts: [...get().drafts, draft] });
        return { ok: true, draft, created: true, changed: true };
      },
      saveScheduleDraft: (command) => {
        if (command.actorRole !== "CONTENT_STAFF")
          return failure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF được lưu Schedule Draft.",
          );
        if (
          Object.keys(command).some((key) => !allowedSaveKeys.has(key))
        )
          return failure(
            "UNSUPPORTED_FIELD",
            "Schedule Draft chỉ hỗ trợ năm trường prototype.",
          );
        if (!validCommandId(command.commandId))
          return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
        const sameCommand = get().drafts.find((draft) =>
          draft.history.some(
            (entry) =>
              entry.commandId === command.commandId &&
              entry.action === "SCHEDULE_DRAFT_SAVED",
          ),
        );
        if (sameCommand)
          return {
            ok: true,
            draft: sameCommand,
            created: false,
            changed: false,
          };
        const draft = get().drafts.find(
          (item) => item.scheduleDraftId === command.scheduleDraftId,
        );
        if (!draft)
          return failure(
            "SCHEDULE_DRAFT_NOT_FOUND",
            "Không tìm thấy Schedule Draft.",
          );
        if (draft.scheduleVersion !== command.expectedScheduleVersion)
          return failure(
            "STALE_SCHEDULE_VERSION",
            "Schedule Draft version đã thay đổi.",
            draft,
          );
        const authority = evaluateScheduleDraftEligibility({
          sessionId: draft.sessionId,
          actorRole: command.actorRole,
          expectedSessionVersion: command.expectedSessionVersion,
          expectedApprovalDecisionId: draft.approvalDecisionId,
          commandId: command.commandId,
        });
        if (!authority.eligible)
          return failure(authority.code, authority.message, draft);
        if (
          authority.snapshot.snapshotId !== draft.configurationSnapshotId
        )
          return failure(
            "CONFIGURATION_SNAPSHOT_MISSING",
            "Configuration Snapshot reference đã thay đổi.",
            draft,
          );
        const proposedSchedule = normalizeProposedSchedule(command);
        const completeness =
          evaluateScheduleDraftCompleteness(proposedSchedule);
        if (
          JSON.stringify(proposedSchedule) ===
            JSON.stringify(draft.proposedSchedule) &&
          JSON.stringify(completeness) ===
            JSON.stringify(draft.completeness)
        )
          return {
            ok: true,
            draft,
            created: false,
            changed: false,
          };
        const finalAuthority = evaluateScheduleDraftEligibility({
          sessionId: draft.sessionId,
          actorRole: command.actorRole,
          expectedSessionVersion: command.expectedSessionVersion,
          expectedApprovalDecisionId: draft.approvalDecisionId,
          commandId: command.commandId,
        });
        if (!finalAuthority.eligible)
          return failure(
            finalAuthority.code,
            finalAuthority.message,
            draft,
          );
        const nextVersion = draft.scheduleVersion + 1;
        const occurredAt = deterministicTime(nextVersion);
        const next = freezeDraft({
          ...draft,
          scheduleVersion: nextVersion,
          proposedSchedule,
          completeness,
          updatedBy: command.actorId,
          updatedAt: occurredAt,
          history: [
            ...draft.history,
            {
              historyId: `${draft.scheduleDraftId}-history-${draft.history.length + 1}`,
              scheduleDraftId: draft.scheduleDraftId,
              scheduleVersion: nextVersion,
              action: "SCHEDULE_DRAFT_SAVED",
              actorId: command.actorId,
              actorRole: "CONTENT_STAFF",
              commandId: command.commandId,
              completeness: completeness.complete
                ? "COMPLETE"
                : "INCOMPLETE",
              findingCodes: completeness.findingCodes,
              occurredAt,
              visibility: "STAFF_ONLY",
            },
          ],
        });
        set({
          drafts: get().drafts.map((item) =>
            item.scheduleDraftId === next.scheduleDraftId ? next : item,
          ),
        });
        return { ok: true, draft: next, created: false, changed: true };
      },
      resetDeterministicScheduleDraftState: () => set({ drafts: [] }),
    }),
    {
      name: AUCTION_SCHEDULE_DRAFT_STORAGE_KEY,
      version: AUCTION_SCHEDULE_DRAFT_SCHEMA_VERSION,
      partialize: (state) => ({ drafts: state.drafts }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedAuctionScheduleDraftState(
          isRecord(persisted) ? persisted : undefined,
        ),
      }),
    },
  ),
);
