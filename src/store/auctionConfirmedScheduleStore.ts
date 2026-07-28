import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "./auctionApprovalDecisionStore";
import { useAuctionConfigurationStore } from "./auctionConfigurationStore";
import {
  evaluateScheduleDraftCompleteness,
  useAuctionScheduleDraftStore,
  type AuctionScheduleDraft,
} from "./auctionScheduleDraftStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_CONFIRMED_SCHEDULE_STORAGE_KEY =
  "sgdg-auction-confirmed-schedules-v1";
export const AUCTION_CONFIRMED_SCHEDULE_SCHEMA_VERSION = 1;
export const PROTOTYPE_SCHEDULE_CONFIRMATION_POLICY =
  "PROTOTYPE SCHEDULE CONFIRMATION POLICY — USER-REQUESTED IMPLEMENTATION — NOT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";
export const SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT =
  "SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT";
export const SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL =
  "SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL";
export const SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION =
  "SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION";
export const SCHEDULE_ALREADY_CONFIRMED = "SCHEDULE_ALREADY_CONFIRMED";
export const CONFIRMED_SCHEDULE_EVIDENCE_STALE =
  "CONFIRMED_SCHEDULE_EVIDENCE_STALE";
export const COMPLETE_DRAFT_REQUIRED_MESSAGE =
  "Schedule Draft chưa đầy đủ hoặc chưa hợp lệ. Không thể xác nhận Schedule.";
export const STALE_APPROVAL_CONFIRMATION_MESSAGE =
  "Approval evidence không còn hiện hành. Không thể xác nhận Schedule.";
export const CONFIRMATION_CONFIGURATION_BLOCKER_MESSAGE =
  "Phiên SGDG-managed chưa hoàn tất cấu hình và phê duyệt. Không thể xác nhận Schedule.";
export const SCHEDULE_CONFIRMATION_TIME = "2026-07-27T02:00:00.000Z";

export interface ConfirmedScheduleValues {
  readonly timezone: string;
  readonly registrationOpenAt: string;
  readonly registrationCloseAt: string;
  readonly auctionStartAt: string;
  readonly auctionEndAt: string;
}

export interface ConfirmedScheduleValidationEvidence {
  readonly scheduleComplete: true;
  readonly temporalOrderValid: true;
  readonly approvalEvidenceValidity: "CURRENT";
  readonly evaluatedAt: string;
  readonly findingCodes: readonly string[];
}

export interface ConfirmedScheduleHistoryEntry {
  readonly historyId: string;
  readonly action: "SCHEDULE_CONFIRMED";
  readonly recordVersion: 1;
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionConfirmedSchedule {
  readonly confirmedScheduleId: string;
  readonly recordVersion: 1;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly scheduleDraftId: string;
  readonly scheduleDraftVersion: number;
  readonly approvalDecisionId: string;
  readonly approvalDecisionVersion: number;
  readonly configurationSnapshotId: string;
  readonly status: "CONFIRMED";
  readonly schedule: ConfirmedScheduleValues;
  readonly validationEvidence: ConfirmedScheduleValidationEvidence;
  readonly confirmedBy: string;
  readonly confirmedAt: string;
  readonly commandId: string;
  readonly history: readonly ConfirmedScheduleHistoryEntry[];
}

export interface ConfirmScheduleCommand {
  sessionId: string;
  scheduleDraftId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedScheduleVersion: number;
  expectedApprovalDecisionId: string;
  expectedConfigurationSnapshotId: string;
  commandId: string;
}

export type ConfirmScheduleErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_SESSION_REQUIRED"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "SCHEDULE_DRAFT_NOT_FOUND"
  | "SCHEDULE_DRAFT_MISMATCH"
  | "STALE_SCHEDULE_VERSION"
  | "APPROVAL_DECISION_NOT_FOUND"
  | "APPROVAL_DECISION_MISMATCH"
  | "CONFIGURATION_SNAPSHOT_MISSING"
  | "CONFIGURATION_SNAPSHOT_MISMATCH"
  | "LATER_PHASE_STATE_EXISTS"
  | typeof SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT
  | typeof SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL
  | typeof SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION
  | typeof SCHEDULE_ALREADY_CONFIRMED;

export type ConfirmScheduleResult =
  | {
      ok: true;
      confirmedSchedule: AuctionConfirmedSchedule;
      created: boolean;
    }
  | {
      ok: false;
      code: ConfirmScheduleErrorCode;
      message: string;
      confirmedSchedule?: AuctionConfirmedSchedule;
    };

export interface AuctionConfirmedScheduleState {
  confirmedSchedules: AuctionConfirmedSchedule[];
  getBySessionId: (
    sessionId: string,
  ) => AuctionConfirmedSchedule | undefined;
  confirmSchedule: (command: ConfirmScheduleCommand) => ConfirmScheduleResult;
  resetDeterministicConfirmedScheduleState: () => void;
}

type ConfirmationAuthority = {
  session: ReturnType<typeof useAuctionSessionStore.getState>["sessions"][number];
  draft: AuctionScheduleDraft;
  decision: ReturnType<
    typeof useAuctionApprovalDecisionStore.getState
  >["decisions"][number];
  snapshot: ReturnType<
    typeof useAuctionConfigurationStore.getState
  >["snapshots"][number];
};

export type ConfirmationEligibility =
  | { eligible: true; authority: ConfirmationAuthority }
  | {
      eligible: false;
      code: ConfirmScheduleErrorCode;
      message: string;
    };

const confirmedScheduleIdFor = (sessionId: string) =>
  `confirmed-schedule-${sessionId}`;
const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);
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
const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) &&
  Number.isFinite(Date.parse(value));
const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const hasLaterPhaseState = (value: object) =>
  [
    "registration",
    "registrationState",
    "registrationStatus",
    "registrationOpen",
    "publication",
    "publicationId",
    "publishedAt",
  ].some((key) => Reflect.get(value, key) !== undefined);
const allowedCommandKeys = new Set([
  "sessionId",
  "scheduleDraftId",
  "actorId",
  "actorRole",
  "expectedSessionVersion",
  "expectedScheduleVersion",
  "expectedApprovalDecisionId",
  "expectedConfigurationSnapshotId",
  "commandId",
]);

const failure = (
  code: ConfirmScheduleErrorCode,
  message: string,
  confirmedSchedule?: AuctionConfirmedSchedule,
): ConfirmScheduleResult => ({
  ok: false,
  code,
  message,
  ...(confirmedSchedule ? { confirmedSchedule } : {}),
});

const draftIsComplete = (draft: AuctionScheduleDraft) => {
  const evaluated = evaluateScheduleDraftCompleteness(
    draft.proposedSchedule,
    SCHEDULE_CONFIRMATION_TIME,
  );
  return (
    draft.completeness.complete &&
    evaluated.complete &&
    evaluated.findingCodes.length === 0 &&
    JSON.stringify(draft.completeness.findingCodes) ===
      JSON.stringify(evaluated.findingCodes)
  );
};

export const evaluateScheduleConfirmationEligibility = ({
  sessionId,
  scheduleDraftId,
  actorRole,
  expectedSessionVersion,
  expectedScheduleVersion,
  expectedApprovalDecisionId,
  expectedConfigurationSnapshotId,
  commandId,
}: ConfirmScheduleCommand): ConfirmationEligibility => {
  if (actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ ADMIN được xác nhận Schedule.",
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
      message: "Không tìm thấy dynamic Auction Session.",
    };
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return {
      eligible: false,
      code: SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION,
      message: CONFIRMATION_CONFIGURATION_BLOCKER_MESSAGE,
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
      message: "Registration hoặc Publication đã tồn tại ngoài phạm vi.",
    };
  const draft = useAuctionScheduleDraftStore
    .getState()
    .drafts.find((item) => item.sessionId === sessionId);
  if (!draft)
    return {
      eligible: false,
      code: "SCHEDULE_DRAFT_NOT_FOUND",
      message: "Không tìm thấy Schedule Draft.",
    };
  if (draft.scheduleDraftId !== scheduleDraftId)
    return {
      eligible: false,
      code: "SCHEDULE_DRAFT_MISMATCH",
      message: "Schedule Draft không thuộc Session hoặc ID không khớp.",
    };
  if (draft.scheduleVersion !== expectedScheduleVersion)
    return {
      eligible: false,
      code: "STALE_SCHEDULE_VERSION",
      message: "Schedule Draft version đã thay đổi.",
    };
  if (!draftIsComplete(draft))
    return {
      eligible: false,
      code: SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT,
      message: COMPLETE_DRAFT_REQUIRED_MESSAGE,
    };
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find((item) => item.sessionId === sessionId);
  if (!decision || decision.outcome !== "APPROVED")
    return {
      eligible: false,
      code: "APPROVAL_DECISION_NOT_FOUND",
      message: "Không tìm thấy APPROVED Decision.",
    };
  if (
    decision.decisionId !== expectedApprovalDecisionId ||
    draft.approvalDecisionId !== decision.decisionId ||
    draft.approvalDecisionVersion !== decision.decisionVersion
  )
    return {
      eligible: false,
      code: "APPROVAL_DECISION_MISMATCH",
      message: "Approval Decision reference không khớp.",
    };
  if (getApprovalDecisionEvidenceValidity(decision) !== "CURRENT")
    return {
      eligible: false,
      code: SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL,
      message: STALE_APPROVAL_CONFIRMATION_MESSAGE,
    };
  const snapshot = useAuctionConfigurationStore
    .getState()
    .snapshots.find(
      (item) =>
        item.sessionId === sessionId &&
        item.snapshotId === expectedConfigurationSnapshotId,
    );
  if (!snapshot)
    return {
      eligible: false,
      code: "CONFIGURATION_SNAPSHOT_MISSING",
      message: "Không tìm thấy Configuration Snapshot.",
    };
  if (
    draft.configurationSnapshotId !== snapshot.snapshotId ||
    decision.validationEvidence.configurationSnapshotId !==
      snapshot.snapshotId
  )
    return {
      eligible: false,
      code: "CONFIGURATION_SNAPSHOT_MISMATCH",
      message: "Configuration Snapshot reference không khớp.",
    };
  return { eligible: true, authority: { session, draft, decision, snapshot } };
};

const freezeConfirmedSchedule = (
  value: AuctionConfirmedSchedule,
): AuctionConfirmedSchedule =>
  Object.freeze({
    ...value,
    schedule: Object.freeze({ ...value.schedule }),
    validationEvidence: Object.freeze({
      ...value.validationEvidence,
      findingCodes: Object.freeze([
        ...value.validationEvidence.findingCodes,
      ]),
    }),
    history: Object.freeze(
      value.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

export type ConfirmedScheduleEvidenceValidity =
  | "CURRENT"
  | typeof CONFIRMED_SCHEDULE_EVIDENCE_STALE
  | "INVALID";

export const getConfirmedScheduleEvidenceValidity = (
  confirmed: AuctionConfirmedSchedule,
): ConfirmedScheduleEvidenceValidity => {
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === confirmed.sessionId);
  const draft = useAuctionScheduleDraftStore
    .getState()
    .drafts.find(
      (item) => item.scheduleDraftId === confirmed.scheduleDraftId,
    );
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find(
      (item) => item.decisionId === confirmed.approvalDecisionId,
    );
  const snapshot = useAuctionConfigurationStore
    .getState()
    .snapshots.find(
      (item) => item.snapshotId === confirmed.configurationSnapshotId,
    );
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !draft ||
    !decision ||
    decision.outcome !== "APPROVED" ||
    !snapshot ||
    snapshot.sessionId !== session.sessionId ||
    draft.sessionId !== session.sessionId
  )
    return "INVALID";
  if (
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY" ||
    draft.scheduleVersion !== confirmed.scheduleDraftVersion ||
    !draftIsComplete(draft) ||
    getApprovalDecisionEvidenceValidity(decision) !== "CURRENT" ||
    decision.decisionVersion !== confirmed.approvalDecisionVersion ||
    draft.configurationSnapshotId !== confirmed.configurationSnapshotId ||
    JSON.stringify(draft.proposedSchedule) !==
      JSON.stringify(confirmed.schedule)
  )
    return CONFIRMED_SCHEDULE_EVIDENCE_STALE;
  return "CURRENT";
};

const forbiddenPersistenceKeys = new Set([
  "registration",
  "registrationState",
  "registrationStatus",
  "publication",
  "publicationId",
  "publishedAt",
  "cancelledAt",
  "cancellation",
  "rescheduledAt",
  "reschedule",
  "returnedAt",
  "rejectedAt",
  "room",
  "roomReference",
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
const validSchedule = (value: unknown): value is ConfirmedScheduleValues =>
  isRecord(value) &&
  exactKeys(value, [
    "timezone",
    "registrationOpenAt",
    "registrationCloseAt",
    "auctionStartAt",
    "auctionEndAt",
  ]) &&
  typeof value.timezone === "string" &&
  validIsoTime(value.registrationOpenAt) &&
  validIsoTime(value.registrationCloseAt) &&
  validIsoTime(value.auctionStartAt) &&
  validIsoTime(value.auctionEndAt);
const validEvidence = (
  value: unknown,
): value is ConfirmedScheduleValidationEvidence =>
  isRecord(value) &&
  exactKeys(value, [
    "scheduleComplete",
    "temporalOrderValid",
    "approvalEvidenceValidity",
    "evaluatedAt",
    "findingCodes",
  ]) &&
  value.scheduleComplete === true &&
  value.temporalOrderValid === true &&
  value.approvalEvidenceValidity === "CURRENT" &&
  validIsoTime(value.evaluatedAt) &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.length === 0;
const validHistory = (
  value: unknown,
  confirmedScheduleId: string,
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
  value.historyId === `${confirmedScheduleId}-history-1` &&
  value.action === "SCHEDULE_CONFIRMED" &&
  value.recordVersion === 1 &&
  typeof value.actorId === "string" &&
  value.actorRole === "ADMIN" &&
  value.commandId === commandId &&
  validCommandId(commandId) &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeConfirmedSchedule = (
  value: unknown,
): AuctionConfirmedSchedule | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "confirmedScheduleId",
      "recordVersion",
      "sessionId",
      "sessionVersion",
      "scheduleDraftId",
      "scheduleDraftVersion",
      "approvalDecisionId",
      "approvalDecisionVersion",
      "configurationSnapshotId",
      "status",
      "schedule",
      "validationEvidence",
      "confirmedBy",
      "confirmedAt",
      "commandId",
      "history",
    ]) ||
    typeof value.sessionId !== "string" ||
    value.confirmedScheduleId !== confirmedScheduleIdFor(value.sessionId) ||
    value.recordVersion !== 1 ||
    !positiveInteger(value.sessionVersion) ||
    typeof value.scheduleDraftId !== "string" ||
    !positiveInteger(value.scheduleDraftVersion) ||
    typeof value.approvalDecisionId !== "string" ||
    !positiveInteger(value.approvalDecisionVersion) ||
    typeof value.configurationSnapshotId !== "string" ||
    value.status !== "CONFIRMED" ||
    !validSchedule(value.schedule) ||
    !validEvidence(value.validationEvidence) ||
    typeof value.confirmedBy !== "string" ||
    !validIsoTime(value.confirmedAt) ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId) ||
    !Array.isArray(value.history) ||
    value.history.length !== 1 ||
    !validHistory(
      value.history[0],
      value.confirmedScheduleId,
      value.commandId,
    )
  )
    return undefined;
  const confirmed = freezeConfirmedSchedule(
    value as unknown as AuctionConfirmedSchedule,
  );
  const draft = useAuctionScheduleDraftStore
    .getState()
    .drafts.find(
      (item) => item.scheduleDraftId === confirmed.scheduleDraftId,
    );
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find(
      (item) => item.decisionId === confirmed.approvalDecisionId,
    );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === confirmed.sessionId);
  if (
    !draft ||
    !decision ||
    !session ||
    session.currentVersion !== confirmed.sessionVersion ||
    draft.sessionId !== session.sessionId ||
    draft.scheduleVersion !== confirmed.scheduleDraftVersion ||
    decision.sessionId !== session.sessionId ||
    decision.decisionVersion !== confirmed.approvalDecisionVersion ||
    draft.approvalDecisionId !== decision.decisionId ||
    draft.configurationSnapshotId !== confirmed.configurationSnapshotId ||
    !draftIsComplete(draft) ||
    JSON.stringify(draft.proposedSchedule) !==
      JSON.stringify(confirmed.schedule)
  )
    return undefined;
  return confirmed;
};

export const sanitizePersistedAuctionConfirmedScheduleState = (
  persisted: unknown,
): Pick<AuctionConfirmedScheduleState, "confirmedSchedules"> => {
  const empty = { confirmedSchedules: [] as AuctionConfirmedSchedule[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["confirmedSchedules"]) ||
    !Array.isArray(persisted.confirmedSchedules)
  )
    return empty;
  const confirmedSchedules = persisted.confirmedSchedules.map(
    sanitizeConfirmedSchedule,
  );
  if (confirmedSchedules.some((item) => !item)) return empty;
  const safe = confirmedSchedules.filter(
    (item): item is AuctionConfirmedSchedule => Boolean(item),
  );
  if (
    new Set(safe.map((item) => item.confirmedScheduleId)).size !==
      safe.length ||
    new Set(safe.map((item) => item.sessionId)).size !== safe.length
  )
    return empty;
  return { confirmedSchedules: safe };
};

export const useAuctionConfirmedScheduleStore =
  create<AuctionConfirmedScheduleState>()(
    persist(
      (set, get) => ({
        confirmedSchedules: [],
        getBySessionId: (sessionId) =>
          get().confirmedSchedules.find(
            (item) => item.sessionId === sessionId,
          ),
        confirmSchedule: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Chỉ ADMIN được xác nhận Schedule.",
            );
          if (
            Object.keys(command).some((key) => !allowedCommandKeys.has(key))
          )
            return failure(
              "UNSUPPORTED_FIELD",
              "Confirmation không hỗ trợ field ngoài command contract.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().confirmedSchedules.find(
            (item) => item.commandId === command.commandId,
          );
          if (sameCommand)
            return {
              ok: true,
              confirmedSchedule: sameCommand,
              created: false,
            };
          const existing = get().confirmedSchedules.find(
            (item) => item.sessionId === command.sessionId,
          );
          if (existing)
            return failure(
              SCHEDULE_ALREADY_CONFIRMED,
              "Session đã có immutable Confirmed Schedule.",
              existing,
            );
          let eligibility =
            evaluateScheduleConfirmationEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          eligibility = evaluateScheduleConfirmationEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          if (
            get().confirmedSchedules.some(
              (item) => item.sessionId === command.sessionId,
            )
          )
            return failure(
              SCHEDULE_ALREADY_CONFIRMED,
              "Authoritative state changed before confirmation commit.",
            );
          const { session, draft, decision, snapshot } =
            eligibility.authority;
          const proposed = draft.proposedSchedule;
          if (
            !proposed.registrationOpenAt ||
            !proposed.registrationCloseAt ||
            !proposed.auctionStartAt ||
            !proposed.auctionEndAt
          )
            return failure(
              SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT,
              COMPLETE_DRAFT_REQUIRED_MESSAGE,
            );
          const confirmedScheduleId = confirmedScheduleIdFor(session.sessionId);
          const confirmed = freezeConfirmedSchedule({
            confirmedScheduleId,
            recordVersion: 1,
            sessionId: session.sessionId,
            sessionVersion: session.currentVersion,
            scheduleDraftId: draft.scheduleDraftId,
            scheduleDraftVersion: draft.scheduleVersion,
            approvalDecisionId: decision.decisionId,
            approvalDecisionVersion: decision.decisionVersion,
            configurationSnapshotId: snapshot.snapshotId,
            status: "CONFIRMED",
            schedule: {
              timezone: proposed.timezone,
              registrationOpenAt: proposed.registrationOpenAt,
              registrationCloseAt: proposed.registrationCloseAt,
              auctionStartAt: proposed.auctionStartAt,
              auctionEndAt: proposed.auctionEndAt,
            },
            validationEvidence: {
              scheduleComplete: true,
              temporalOrderValid: true,
              approvalEvidenceValidity: "CURRENT",
              evaluatedAt: SCHEDULE_CONFIRMATION_TIME,
              findingCodes: [],
            },
            confirmedBy: command.actorId,
            confirmedAt: SCHEDULE_CONFIRMATION_TIME,
            commandId: command.commandId,
            history: [
              {
                historyId: `${confirmedScheduleId}-history-1`,
                action: "SCHEDULE_CONFIRMED",
                recordVersion: 1,
                actorId: command.actorId,
                actorRole: "ADMIN",
                commandId: command.commandId,
                occurredAt: SCHEDULE_CONFIRMATION_TIME,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({
            confirmedSchedules: [...get().confirmedSchedules, confirmed],
          });
          return { ok: true, confirmedSchedule: confirmed, created: true };
        },
        resetDeterministicConfirmedScheduleState: () =>
          set({ confirmedSchedules: [] }),
      }),
      {
        name: AUCTION_CONFIRMED_SCHEDULE_STORAGE_KEY,
        version: AUCTION_CONFIRMED_SCHEDULE_SCHEMA_VERSION,
        partialize: (state) => ({
          confirmedSchedules: state.confirmedSchedules,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionConfirmedScheduleState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
