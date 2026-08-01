import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  getRegistrationReadinessDeterministicNow,
} from "./auctionRegistrationOpeningReadinessStore";
import {
  getOpenRegistrationWindowValidity,
  useAuctionRegistrationWindowStore,
  type AuctionRegistrationWindow,
} from "./auctionRegistrationWindowStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_CUSTOMER_REGISTRATION_STORAGE_KEY =
  "sgdg-auction-customer-registrations-v1";
export const AUCTION_CUSTOMER_REGISTRATION_SCHEMA_VERSION = 1;
export const PROTOTYPE_CUSTOMER_REGISTRATION_MODEL =
  "PROTOTYPE CUSTOMER REGISTRATION MODEL — USER-REQUESTED IMPLEMENTATION — NOT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION";
export const CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN =
  "CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN";
export const CUSTOMER_REGISTRATION_WINDOW_EXPIRED =
  "CUSTOMER_REGISTRATION_WINDOW_EXPIRED";
export const CUSTOMER_REGISTRATION_BLOCKED_BY_STALE_EVIDENCE =
  "CUSTOMER_REGISTRATION_BLOCKED_BY_STALE_EVIDENCE";
export const CUSTOMER_REGISTRATION_ALREADY_SUBMITTED =
  "CUSTOMER_REGISTRATION_ALREADY_SUBMITTED";
export const CUSTOMER_REGISTRATION_ALREADY_EXISTS =
  "CUSTOMER_REGISTRATION_ALREADY_EXISTS";
export const REGISTRATION_WINDOW_NOT_OPEN_MESSAGE =
  "Registration Window chưa được mở.";
export const REGISTRATION_WINDOW_EXPIRED_MESSAGE =
  "Cửa sổ đăng ký đã hết thời gian.";
export const REGISTRATION_STALE_EVIDENCE_MESSAGE =
  "Registration Window hoặc Schedule evidence không còn hiện hành.";
export const REGISTRATION_ALREADY_SUBMITTED_MESSAGE =
  "Customer đã gửi Registration cho Session này.";

export interface CustomerRegistrationSubmissionRecord {
  readonly recordVersion: 1;
  readonly submittedBy: string;
  readonly submittedAt: string;
}

export interface CustomerRegistrationHistoryEntry {
  readonly historyId: string;
  readonly registrationVersion: number;
  readonly action:
    | "CUSTOMER_REGISTRATION_DRAFT_CREATED"
    | "CUSTOMER_REGISTRATION_DRAFT_SAVED"
    | "CUSTOMER_REGISTRATION_SUBMITTED";
  readonly resultingStatus: "DRAFT" | "SUBMITTED";
  readonly rulesAccepted: boolean;
  readonly actorId: string;
  readonly actorRole: "CUSTOMER";
  readonly commandId: string;
  readonly occurredAt: string;
  readonly visibility: "CUSTOMER_AND_STAFF";
}

export interface AuctionCustomerRegistration {
  readonly registrationId: string;
  readonly registrationVersion: number;
  readonly sessionId: string;
  readonly sessionVersionAtCreation: number;
  readonly customerId: string;
  readonly registrationWindowId: string;
  readonly registrationWindowRecordVersion: number;
  readonly status: "DRAFT" | "SUBMITTED";
  readonly rulesAccepted: boolean;
  readonly rulesAcceptedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedAt?: string;
  readonly submissionRecord?: CustomerRegistrationSubmissionRecord;
  readonly history: readonly CustomerRegistrationHistoryEntry[];
}

export interface CreateRegistrationDraftCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedRegistrationWindowId: string;
  commandId: string;
}

export interface SaveRegistrationDraftCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRegistrationVersion: number;
  rulesAccepted: boolean;
  commandId: string;
}

export interface SubmitRegistrationCommand {
  registrationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRegistrationVersion: number;
  expectedRegistrationWindowId: string;
  commandId: string;
}

export type CustomerRegistrationErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_ACTOR"
  | "INVALID_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "SESSION_NOT_FOUND"
  | "DYNAMIC_CUSTOMER_SESSION_REQUIRED"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "REGISTRATION_NOT_FOUND"
  | "REGISTRATION_OWNERSHIP_MISMATCH"
  | "STALE_REGISTRATION_VERSION"
  | "REGISTRATION_WINDOW_MISMATCH"
  | "RULES_ACCEPTANCE_REQUIRED"
  | "LATER_PHASE_STATE_EXISTS"
  | typeof CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN
  | typeof CUSTOMER_REGISTRATION_WINDOW_EXPIRED
  | typeof CUSTOMER_REGISTRATION_BLOCKED_BY_STALE_EVIDENCE
  | typeof CUSTOMER_REGISTRATION_ALREADY_SUBMITTED
  | typeof CUSTOMER_REGISTRATION_ALREADY_EXISTS;

export type CustomerRegistrationCommandResult =
  | {
      ok: true;
      registration: AuctionCustomerRegistration;
      created: boolean;
      changed: boolean;
    }
  | {
      ok: false;
      code: CustomerRegistrationErrorCode;
      message: string;
      registration?: AuctionCustomerRegistration;
    };

export interface AuctionCustomerRegistrationState {
  registrations: AuctionCustomerRegistration[];
  getByCustomerAndSession: (
    customerId: string,
    sessionId: string,
  ) => AuctionCustomerRegistration | undefined;
  createRegistrationDraft: (
    command: CreateRegistrationDraftCommand,
  ) => CustomerRegistrationCommandResult;
  saveRegistrationDraft: (
    command: SaveRegistrationDraftCommand,
  ) => CustomerRegistrationCommandResult;
  submitRegistration: (
    command: SubmitRegistrationCommand,
  ) => CustomerRegistrationCommandResult;
  resetDeterministicCustomerRegistrationState: () => void;
}

type RegistrationAuthority = {
  session: ReturnType<typeof useAuctionSessionStore.getState>["sessions"][number];
  registrationWindow: AuctionRegistrationWindow;
};
type RegistrationEligibility =
  | { eligible: true; authority: RegistrationAuthority; evaluatedAt: string }
  | {
      eligible: false;
      code: CustomerRegistrationErrorCode;
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
const registrationIdFor = (sessionId: string, customerId: string) =>
  `customer-registration-${sessionId}-${customerId}`;
const insideWindow = (
  now: string,
  registrationWindow: AuctionRegistrationWindow,
) =>
  validIsoTime(now) &&
  Date.parse(registrationWindow.window.registrationOpenAt) <= Date.parse(now) &&
  Date.parse(now) <
    Date.parse(registrationWindow.window.registrationCloseAt);
const hasLaterPhaseState = (value: object) =>
  [
    "publication",
    "publicationId",
    "publishedAt",
    "membershipResult",
    "depositResult",
    "eligibilityResult",
  ].some((key) => Reflect.get(value, key) !== undefined);
const failure = (
  code: CustomerRegistrationErrorCode,
  message: string,
  registration?: AuctionCustomerRegistration,
): CustomerRegistrationCommandResult => ({
  ok: false,
  code,
  message,
  ...(registration ? { registration } : {}),
});

export const evaluateCustomerRegistrationEligibility = ({
  sessionId,
  actorId,
  actorRole,
  expectedSessionVersion,
  expectedRegistrationWindowId,
  commandId,
}: {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedRegistrationWindowId: string;
  commandId: string;
}): RegistrationEligibility => {
  if (actorRole !== "CUSTOMER")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ CUSTOMER được tạo hoặc gửi Registration.",
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
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "DYNAMIC_CUSTOMER_SESSION_REQUIRED",
      message: "Customer Registration chỉ hỗ trợ Customer-requested Session.",
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
      message: "Phát hiện Publication hoặc eligibility state ngoài phạm vi.",
    };
  const registrationWindow = useAuctionRegistrationWindowStore
    .getState()
    .registrationWindows.find((item) => item.sessionId === sessionId);
  if (!registrationWindow || registrationWindow.status !== "OPEN")
    return {
      eligible: false,
      code: CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN,
      message: REGISTRATION_WINDOW_NOT_OPEN_MESSAGE,
    };
  if (registrationWindow.registrationWindowId !== expectedRegistrationWindowId)
    return {
      eligible: false,
      code: "REGISTRATION_WINDOW_MISMATCH",
      message: "Registration Window reference không khớp.",
    };
  const validity = getOpenRegistrationWindowValidity(registrationWindow);
  if (validity === "OPEN_REGISTRATION_EVIDENCE_STALE" || validity === "INVALID")
    return {
      eligible: false,
      code: CUSTOMER_REGISTRATION_BLOCKED_BY_STALE_EVIDENCE,
      message: REGISTRATION_STALE_EVIDENCE_MESSAGE,
    };
  const evaluatedAt = getRegistrationReadinessDeterministicNow();
  if (!insideWindow(evaluatedAt, registrationWindow))
    return {
      eligible: false,
      code: CUSTOMER_REGISTRATION_WINDOW_EXPIRED,
      message: REGISTRATION_WINDOW_EXPIRED_MESSAGE,
    };
  return {
    eligible: true,
    authority: { session, registrationWindow },
    evaluatedAt,
  };
};

const freezeRegistration = (
  registration: AuctionCustomerRegistration,
): AuctionCustomerRegistration =>
  Object.freeze({
    ...registration,
    ...(registration.submissionRecord
      ? { submissionRecord: Object.freeze({ ...registration.submissionRecord }) }
      : {}),
    history: Object.freeze(
      registration.history.map((entry) => Object.freeze({ ...entry })),
    ),
  });

const createKeys = new Set([
  "sessionId",
  "actorId",
  "actorRole",
  "expectedSessionVersion",
  "expectedRegistrationWindowId",
  "commandId",
]);
const saveKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedRegistrationVersion",
  "rulesAccepted",
  "commandId",
]);
const submitKeys = new Set([
  "registrationId",
  "actorId",
  "actorRole",
  "expectedRegistrationVersion",
  "expectedRegistrationWindowId",
  "commandId",
]);

const forbiddenPersistenceKeys = new Set([
  "membership",
  "membershipResult",
  "deposit",
  "depositResult",
  "eligibility",
  "eligibilityResult",
  "approval",
  "approvalResult",
  "rejection",
  "rejectionReason",
  "payment",
  "paymentInformation",
  "publication",
  "publicationId",
  "withdrawnAt",
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
const validSubmissionRecord = (value: unknown, customerId: string) =>
  isRecord(value) &&
  exactKeys(value, ["recordVersion", "submittedBy", "submittedAt"]) &&
  value.recordVersion === 1 &&
  value.submittedBy === customerId &&
  validIsoTime(value.submittedAt);
const validHistory = (
  value: unknown,
  registrationId: string,
  maxVersion: number,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "historyId",
    "registrationVersion",
    "action",
    "resultingStatus",
    "rulesAccepted",
    "actorId",
    "actorRole",
    "commandId",
    "occurredAt",
    "visibility",
  ]) &&
  typeof value.historyId === "string" &&
  value.historyId.startsWith(`${registrationId}-history-`) &&
  positiveInteger(value.registrationVersion) &&
  value.registrationVersion <= maxVersion &&
  (value.action === "CUSTOMER_REGISTRATION_DRAFT_CREATED" ||
    value.action === "CUSTOMER_REGISTRATION_DRAFT_SAVED" ||
    value.action === "CUSTOMER_REGISTRATION_SUBMITTED") &&
  (value.resultingStatus === "DRAFT" ||
    value.resultingStatus === "SUBMITTED") &&
  typeof value.rulesAccepted === "boolean" &&
  typeof value.actorId === "string" &&
  value.actorRole === "CUSTOMER" &&
  typeof value.commandId === "string" &&
  validCommandId(value.commandId) &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "CUSTOMER_AND_STAFF";

const sanitizeRegistration = (
  value: unknown,
): AuctionCustomerRegistration | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(
      value,
      [
        "registrationId",
        "registrationVersion",
        "sessionId",
        "sessionVersionAtCreation",
        "customerId",
        "registrationWindowId",
        "registrationWindowRecordVersion",
        "status",
        "rulesAccepted",
        "createdAt",
        "updatedAt",
        "history",
      ],
      ["rulesAcceptedAt", "submittedAt", "submissionRecord"],
    ) ||
    typeof value.sessionId !== "string" ||
    typeof value.customerId !== "string" ||
    !value.customerId.trim() ||
    value.registrationId !==
      registrationIdFor(value.sessionId, value.customerId) ||
    !positiveInteger(value.registrationVersion) ||
    !positiveInteger(value.sessionVersionAtCreation) ||
    typeof value.registrationWindowId !== "string" ||
    value.registrationWindowRecordVersion !== 1 ||
    (value.status !== "DRAFT" && value.status !== "SUBMITTED") ||
    typeof value.rulesAccepted !== "boolean" ||
    (value.rulesAcceptedAt !== undefined &&
      !validIsoTime(value.rulesAcceptedAt)) ||
    !validIsoTime(value.createdAt) ||
    !validIsoTime(value.updatedAt) ||
    !Array.isArray(value.history) ||
    value.history.length < 1 ||
    !value.history.every((entry) =>
      validHistory(
        entry,
        value.registrationId as string,
        value.registrationVersion as number,
      ),
    )
  )
    return undefined;
  if (
    (value.status === "DRAFT" &&
      (value.submittedAt !== undefined ||
        value.submissionRecord !== undefined)) ||
    (value.status === "SUBMITTED" &&
      (!validIsoTime(value.submittedAt) ||
        !validSubmissionRecord(value.submissionRecord, value.customerId)))
  )
    return undefined;
  const history = value.history as Record<string, unknown>[];
  if (
    history.length !== value.registrationVersion ||
    history.some(
      (entry, index) => entry.registrationVersion !== index + 1,
    ) ||
    history[0].action !== "CUSTOMER_REGISTRATION_DRAFT_CREATED" ||
    history[0].resultingStatus !== "DRAFT" ||
    history[0].rulesAccepted !== false ||
    history.some((entry) => entry.actorId !== value.customerId) ||
    history[history.length - 1].resultingStatus !== value.status ||
    history[history.length - 1].rulesAccepted !== value.rulesAccepted ||
    history.filter(
      (entry) => entry.action === "CUSTOMER_REGISTRATION_SUBMITTED",
    ).length !== (value.status === "SUBMITTED" ? 1 : 0) ||
    (value.status === "SUBMITTED" &&
      history[history.length - 1].action !==
        "CUSTOMER_REGISTRATION_SUBMITTED")
  )
    return undefined;
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === value.sessionId);
  const registrationWindow = useAuctionRegistrationWindowStore
    .getState()
    .registrationWindows.find(
      (item) => item.registrationWindowId === value.registrationWindowId,
    );
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !registrationWindow ||
    registrationWindow.sessionId !== session.sessionId ||
    registrationWindow.recordVersion !==
      value.registrationWindowRecordVersion
  )
    return undefined;
  return freezeRegistration(value as unknown as AuctionCustomerRegistration);
};

export const sanitizePersistedAuctionCustomerRegistrationState = (
  persisted: unknown,
): Pick<AuctionCustomerRegistrationState, "registrations"> => {
  const empty = { registrations: [] as AuctionCustomerRegistration[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["registrations"]) ||
    !Array.isArray(persisted.registrations)
  )
    return empty;
  const registrations = persisted.registrations.map(sanitizeRegistration);
  if (registrations.some((registration) => !registration)) return empty;
  const safe = registrations.filter(
    (registration): registration is AuctionCustomerRegistration =>
      Boolean(registration),
  );
  if (
    new Set(safe.map((registration) => registration.registrationId)).size !==
      safe.length ||
    new Set(
      safe.map(
        (registration) =>
          `${registration.sessionId}:${registration.customerId}`,
      ),
    ).size !== safe.length
  )
    return empty;
  return { registrations: safe };
};

export const useAuctionCustomerRegistrationStore =
  create<AuctionCustomerRegistrationState>()(
    persist(
      (set, get) => ({
        registrations: [],
        getByCustomerAndSession: (customerId, sessionId) =>
          get().registrations.find(
            (registration) =>
              registration.customerId === customerId &&
              registration.sessionId === sessionId,
          ),
        createRegistrationDraft: (command) => {
          if (
            Object.keys(command).some((key) => !createKeys.has(key))
          )
            return failure(
              "UNSUPPORTED_FIELD",
              "Create Registration command chứa field ngoài phạm vi.",
            );
          const sameCommand = get().registrations.find((registration) =>
            registration.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "CUSTOMER_REGISTRATION_DRAFT_CREATED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              registration: sameCommand,
              created: false,
              changed: false,
            };
          const existing = get().registrations.find(
            (registration) =>
              registration.sessionId === command.sessionId &&
              registration.customerId === command.actorId,
          );
          if (existing)
            return failure(
              existing.status === "SUBMITTED"
                ? CUSTOMER_REGISTRATION_ALREADY_SUBMITTED
                : CUSTOMER_REGISTRATION_ALREADY_EXISTS,
              existing.status === "SUBMITTED"
                ? REGISTRATION_ALREADY_SUBMITTED_MESSAGE
                : "Customer đã có Registration Draft cho Session này.",
              existing,
            );
          let eligibility = evaluateCustomerRegistrationEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          eligibility = evaluateCustomerRegistrationEligibility(command);
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const { session, registrationWindow } = eligibility.authority;
          const registrationId = registrationIdFor(
            session.sessionId,
            command.actorId,
          );
          const occurredAt = eligibility.evaluatedAt;
          const registration = freezeRegistration({
            registrationId,
            registrationVersion: 1,
            sessionId: session.sessionId,
            sessionVersionAtCreation: session.currentVersion,
            customerId: command.actorId,
            registrationWindowId:
              registrationWindow.registrationWindowId,
            registrationWindowRecordVersion:
              registrationWindow.recordVersion,
            status: "DRAFT",
            rulesAccepted: false,
            createdAt: occurredAt,
            updatedAt: occurredAt,
            history: [
              {
                historyId: `${registrationId}-history-1`,
                registrationVersion: 1,
                action: "CUSTOMER_REGISTRATION_DRAFT_CREATED",
                resultingStatus: "DRAFT",
                rulesAccepted: false,
                actorId: command.actorId,
                actorRole: "CUSTOMER",
                commandId: command.commandId,
                occurredAt,
                visibility: "CUSTOMER_AND_STAFF",
              },
            ],
          });
          set({ registrations: [...get().registrations, registration] });
          return {
            ok: true,
            registration,
            created: true,
            changed: true,
          };
        },
        saveRegistrationDraft: (command) => {
          if (command.actorRole !== "CUSTOMER")
            return failure(
              "ACCESS_DENIED",
              "Chỉ CUSTOMER được lưu Registration Draft.",
            );
          if (
            Object.keys(command).some((key) => !saveKeys.has(key))
          )
            return failure(
              "UNSUPPORTED_FIELD",
              "Only rulesAccepted may be changed.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().registrations.find((registration) =>
            registration.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "CUSTOMER_REGISTRATION_DRAFT_SAVED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              registration: sameCommand,
              created: false,
              changed: false,
            };
          const registration = get().registrations.find(
            (item) => item.registrationId === command.registrationId,
          );
          if (!registration)
            return failure("REGISTRATION_NOT_FOUND", "Registration not found.");
          if (registration.customerId !== command.actorId)
            return failure(
              "REGISTRATION_OWNERSHIP_MISMATCH",
              "Customer cannot mutate another Customer's Registration.",
            );
          if (registration.status === "SUBMITTED")
            return failure(
              CUSTOMER_REGISTRATION_ALREADY_SUBMITTED,
              REGISTRATION_ALREADY_SUBMITTED_MESSAGE,
              registration,
            );
          if (
            registration.registrationVersion !==
            command.expectedRegistrationVersion
          )
            return failure(
              "STALE_REGISTRATION_VERSION",
              "Registration version đã thay đổi.",
              registration,
            );
          if (registration.rulesAccepted === command.rulesAccepted)
            return {
              ok: true,
              registration,
              created: false,
              changed: false,
            };
          const nextVersion = registration.registrationVersion + 1;
          const occurredAt = getRegistrationReadinessDeterministicNow();
          const next = freezeRegistration({
            ...registration,
            registrationVersion: nextVersion,
            rulesAccepted: command.rulesAccepted,
            ...(command.rulesAccepted
              ? { rulesAcceptedAt: occurredAt }
              : { rulesAcceptedAt: undefined }),
            updatedAt: occurredAt,
            history: [
              ...registration.history,
              {
                historyId: `${registration.registrationId}-history-${nextVersion}`,
                registrationVersion: nextVersion,
                action: "CUSTOMER_REGISTRATION_DRAFT_SAVED",
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
            registrations: get().registrations.map((item) =>
              item.registrationId === next.registrationId ? next : item,
            ),
          });
          return {
            ok: true,
            registration: next,
            created: false,
            changed: true,
          };
        },
        submitRegistration: (command) => {
          if (command.actorRole !== "CUSTOMER")
            return failure(
              "ACCESS_DENIED",
              "Chỉ CUSTOMER được gửi Registration.",
            );
          if (
            Object.keys(command).some((key) => !submitKeys.has(key))
          )
            return failure(
              "UNSUPPORTED_FIELD",
              "Submit Registration command chứa field ngoài phạm vi.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().registrations.find((registration) =>
            registration.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "CUSTOMER_REGISTRATION_SUBMITTED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              registration: sameCommand,
              created: false,
              changed: false,
            };
          const registration = get().registrations.find(
            (item) => item.registrationId === command.registrationId,
          );
          if (!registration)
            return failure("REGISTRATION_NOT_FOUND", "Registration not found.");
          if (registration.customerId !== command.actorId)
            return failure(
              "REGISTRATION_OWNERSHIP_MISMATCH",
              "Customer cannot submit another Customer's Registration.",
            );
          if (registration.status === "SUBMITTED")
            return failure(
              CUSTOMER_REGISTRATION_ALREADY_SUBMITTED,
              REGISTRATION_ALREADY_SUBMITTED_MESSAGE,
              registration,
            );
          if (
            registration.registrationVersion !==
            command.expectedRegistrationVersion
          )
            return failure(
              "STALE_REGISTRATION_VERSION",
              "Registration version đã thay đổi.",
              registration,
            );
          if (!registration.rulesAccepted)
            return failure(
              "RULES_ACCEPTANCE_REQUIRED",
              "Auction rules must be accepted before submission.",
              registration,
            );
          let eligibility = evaluateCustomerRegistrationEligibility({
            sessionId: registration.sessionId,
            actorId: command.actorId,
            actorRole: command.actorRole,
            expectedSessionVersion: registration.sessionVersionAtCreation,
            expectedRegistrationWindowId:
              command.expectedRegistrationWindowId,
            commandId: command.commandId,
          });
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message, registration);
          eligibility = evaluateCustomerRegistrationEligibility({
            sessionId: registration.sessionId,
            actorId: command.actorId,
            actorRole: command.actorRole,
            expectedSessionVersion: registration.sessionVersionAtCreation,
            expectedRegistrationWindowId:
              command.expectedRegistrationWindowId,
            commandId: command.commandId,
          });
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message, registration);
          const nextVersion = registration.registrationVersion + 1;
          const submittedAt = eligibility.evaluatedAt;
          const next = freezeRegistration({
            ...registration,
            registrationVersion: nextVersion,
            status: "SUBMITTED",
            submittedAt,
            submissionRecord: {
              recordVersion: 1,
              submittedBy: command.actorId,
              submittedAt,
            },
            updatedAt: submittedAt,
            history: [
              ...registration.history,
              {
                historyId: `${registration.registrationId}-history-${nextVersion}`,
                registrationVersion: nextVersion,
                action: "CUSTOMER_REGISTRATION_SUBMITTED",
                resultingStatus: "SUBMITTED",
                rulesAccepted: true,
                actorId: command.actorId,
                actorRole: "CUSTOMER",
                commandId: command.commandId,
                occurredAt: submittedAt,
                visibility: "CUSTOMER_AND_STAFF",
              },
            ],
          });
          set({
            registrations: get().registrations.map((item) =>
              item.registrationId === next.registrationId ? next : item,
            ),
          });
          return {
            ok: true,
            registration: next,
            created: false,
            changed: true,
          };
        },
        resetDeterministicCustomerRegistrationState: () =>
          set({ registrations: [] }),
      }),
      {
        name: AUCTION_CUSTOMER_REGISTRATION_STORAGE_KEY,
        version: AUCTION_CUSTOMER_REGISTRATION_SCHEMA_VERSION,
        partialize: (state) => ({ registrations: state.registrations }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionCustomerRegistrationState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
