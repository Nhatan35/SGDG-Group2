import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";

export type CustomerOpeningRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "RETURNED_FOR_CORRECTION"
  | "GOVERNANCE_REVIEW"
  | "ACCEPTED_FOR_DRAFT"
  | "REJECTED";

export type OpeningRequestHistoryAction =
  | "CREATE_DRAFT"
  | "SAVE_DRAFT"
  | "SUBMIT"
  | "START_REVIEW"
  | "RETURN_FOR_CORRECTION"
  | "RESUBMIT"
  | "REJECT"
  | "ACCEPT_FOR_DRAFT"
  | "ROUTE_TO_GOVERNED_REVIEW";

export type OpeningRequestHistoryVisibility =
  | "CUSTOMER_SAFE"
  | "STAFF_ONLY"
  | "GOVERNANCE_ONLY";

export interface OpeningRequestDecisionHistoryEntry {
  id: string;
  requestId: string;
  requestVersion: number;
  action: OpeningRequestHistoryAction;
  fromStatus: CustomerOpeningRequestStatus;
  toStatus: CustomerOpeningRequestStatus;
  actorId: string;
  actorRole: ActorRole;
  reason?: string;
  affectedSections?: string[];
  evidenceReferenceIds?: string[];
  visibility: OpeningRequestHistoryVisibility;
  commandId: string;
  createdAt: string;
}

export interface OpeningRequestGovernanceConcern {
  reason: string;
  evidenceReferenceIds: string[];
  recordedAt: string;
  recordedBy: string;
}

export interface CustomerOpeningRequest {
  requestId: string;
  ownerId: string;
  title: string;
  assetReference: string;
  assetCategory?: string;
  assetCondition?: string;
  assetImageUrl?: string;
  purpose: string;
  proposedStartPrice: number | null;
  customerNotes: string;
  declarationAccepted: boolean;
  status: CustomerOpeningRequestStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  previousSubmittedAt?: string;
  reviewStartedAt?: string;
  returnedAt?: string;
  decisionAt?: string;
  reviewerComment?: string;
  correctionSections?: string[];
  decisionReason?: string;
  governanceConcern?: OpeningRequestGovernanceConcern;
  acceptedOpeningRequestVersion?: number;
  history: OpeningRequestDecisionHistoryEntry[];
}

export type OpeningRequestEditableFields = Pick<
  CustomerOpeningRequest,
  | "title"
  | "assetReference"
  | "assetCategory"
  | "assetCondition"
  | "assetImageUrl"
  | "purpose"
  | "proposedStartPrice"
  | "customerNotes"
  | "declarationAccepted"
>;

export type OpeningRequestCommandErrorCode =
  | "NOT_FOUND"
  | "ACCESS_DENIED"
  | "INVALID_TRANSITION"
  | "STALE_VERSION"
  | "DUPLICATE_COMMAND"
  | "VALIDATION_ERROR"
  | "BLOCKED";

export type OpeningRequestCommandResult<T = CustomerOpeningRequest> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: OpeningRequestCommandErrorCode;
      message: string;
      fieldErrors?: Record<string, string>;
    };

interface ActorCommand {
  actorId: string;
  actorRole: ActorRole;
  commandId: string;
}

interface VersionedCommand extends ActorCommand {
  requestId: string;
  expectedVersion: number;
}

interface CustomerMutationCommand extends VersionedCommand {
  fields: OpeningRequestEditableFields;
}

export interface ReturnForCorrectionCommand extends VersionedCommand {
  reason: string;
  affectedSections: string[];
}

export interface ReasonedReviewCommand extends VersionedCommand {
  reason: string;
}

export interface GovernanceConcernCommand extends VersionedCommand {
  concernReason: string;
  evidenceReferenceIds: string[];
}

interface OpeningRequestState {
  records: CustomerOpeningRequest[];
  createDraft: (
    command: ActorCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  saveDraft: (
    command: CustomerMutationCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  submitOpeningRequest: (
    command: CustomerMutationCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  startReview: (
    command: VersionedCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  returnForCorrection: (
    command: ReturnForCorrectionCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  rejectOpeningRequest: (
    command: ReasonedReviewCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  acceptForDraftPreparation: (
    command: ReasonedReviewCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  recordGovernanceConcern: (
    command: GovernanceConcernCommand,
  ) => OpeningRequestCommandResult<CustomerOpeningRequest>;
  resetForTests: () => void;
}

export const CURRENT_CUSTOMER_ID = "CUS-NMA-001";
export const CONTENT_STAFF_ACTOR_ID = "content.staff@mock.local";
export const ADMIN_ACTOR_ID = "admin.governance@mock.local";
const OTHER_CUSTOMER_ID = "CUS-OTHER-002";
const anchor = "2026-07-24T03:00:00.000Z";

const legacyReviewHistory: OpeningRequestDecisionHistoryEntry[] = [
  {
    id: "ORH-ORQ-ROYAL-OAK-001-1",
    requestId: "ORQ-ROYAL-OAK-001",
    requestVersion: 1,
    action: "START_REVIEW",
    fromStatus: "SUBMITTED",
    toStatus: "UNDER_REVIEW",
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    visibility: "STAFF_ONLY",
    commandId: "seed-start-review-royal-oak",
    createdAt: "2026-07-20T02:30:00.000Z",
  },
];

const seedRecords: CustomerOpeningRequest[] = [
  {
    requestId: "ORQ-CUS-2026-001",
    ownerId: CURRENT_CUSTOMER_ID,
    title: "Đề nghị đấu giá bộ sưu tập đồng hồ",
    assetReference: "AST-CUS-WATCH-001",
    purpose: "",
    proposedStartPrice: null,
    customerNotes: "",
    declarationAccepted: false,
    status: "DRAFT",
    version: 1,
    createdAt: anchor,
    updatedAt: anchor,
    history: [],
  },
  {
    requestId: "ORQ-CUS-OTHER-001",
    ownerId: OTHER_CUSTOMER_ID,
    title: "Yêu cầu thuộc khách hàng khác",
    assetReference: "AST-OTHER-001",
    purpose: "Đấu giá tài sản sưu tầm",
    proposedStartPrice: 120_000_000,
    customerNotes: "",
    declarationAccepted: true,
    status: "SUBMITTED",
    version: 2,
    createdAt: anchor,
    updatedAt: "2026-07-24T04:00:00.000Z",
    submittedAt: "2026-07-24T04:00:00.000Z",
    history: [],
  },
  {
    requestId: "ORQ-ROYAL-OAK-001",
    ownerId: "CUS-ROYAL-OAK-001",
    title: "Audemars Piguet Royal Oak 15500ST",
    assetReference: "AST-ROYAL-OAK-001",
    purpose: "Đề nghị SGDG tiếp nhận hồ sơ để chuẩn bị đấu giá",
    proposedStartPrice: 850_000_000,
    customerNotes: "Hồ sơ tài sản đã đính kèm.",
    declarationAccepted: true,
    status: "UNDER_REVIEW",
    version: 1,
    createdAt: "2026-07-20T02:00:00.000Z",
    updatedAt: "2026-07-20T02:30:00.000Z",
    submittedAt: "2026-07-20T02:15:00.000Z",
    reviewStartedAt: "2026-07-20T02:30:00.000Z",
    history: legacyReviewHistory,
  },
];

const cloneSeeds = () =>
  seedRecords.map((record) => ({
    ...record,
    history: record.history.map((entry) => ({ ...entry })),
  }));

export const isOpeningRequestCustomerEditable = (
  status: CustomerOpeningRequestStatus,
) => status === "DRAFT" || status === "RETURNED_FOR_CORRECTION";

export const selectOwnedOpeningRequests = (
  records: CustomerOpeningRequest[],
  ownerId: string,
) => records.filter((record) => record.ownerId === ownerId);

export const selectOpeningRequestForOwner = (
  records: CustomerOpeningRequest[],
  requestId: string,
  ownerId: string,
) =>
  records.find(
    (record) => record.requestId === requestId && record.ownerId === ownerId,
  );

export const selectCustomerVisibleHistory = (
  record: CustomerOpeningRequest,
) => record.history.filter((entry) => entry.visibility === "CUSTOMER_SAFE");

const validForSubmission = (fields: OpeningRequestEditableFields) => {
  const fieldErrors: Record<string, string> = {};
  if (!fields.title.trim()) fieldErrors.title = "Tên yêu cầu là bắt buộc.";
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(fields.assetReference.trim()))
    fieldErrors.assetReference = "Tham chiếu tài sản không đúng cấu trúc.";
  if (!fields.purpose.trim())
    fieldErrors.purpose = "Mục đích đấu giá là bắt buộc.";
  if (
    typeof fields.proposedStartPrice !== "number" ||
    !Number.isFinite(fields.proposedStartPrice) ||
    fields.proposedStartPrice <= 0
  )
    fieldErrors.proposedStartPrice = "Giá đề xuất phải lớn hơn 0.";
  if (!fields.declarationAccepted)
    fieldErrors.declarationAccepted = "Cần xác nhận khai báo.";
  return fieldErrors;
};

const commandFailure = (
  code: OpeningRequestCommandErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): OpeningRequestCommandResult<never> => ({
  ok: false,
  code,
  message,
  fieldErrors,
});

const hasCommand = (records: CustomerOpeningRequest[], commandId: string) =>
  records.some((record) =>
    record.history.some((entry) => entry.commandId === commandId),
  );

const validateRecordCommand = (
  records: CustomerOpeningRequest[],
  command: VersionedCommand,
  allowedRoles: ActorRole[],
  allowedStatuses: CustomerOpeningRequestStatus[],
) => {
  if (!allowedRoles.includes(command.actorRole))
    return commandFailure("ACCESS_DENIED", "Vai trò không có quyền thực hiện.");
  const record = records.find((item) => item.requestId === command.requestId);
  if (!record)
    return commandFailure("NOT_FOUND", "Không tìm thấy yêu cầu mở phiên.");
  if (
    command.actorRole === "CUSTOMER" &&
    record.ownerId !== command.actorId
  )
    return commandFailure(
      "NOT_FOUND",
      "Không tìm thấy yêu cầu mở phiên.",
    );
  if (record.version !== command.expectedVersion)
    return commandFailure(
      "STALE_VERSION",
      "Phiên bản yêu cầu đã thay đổi.",
    );
  if (hasCommand(records, command.commandId))
    return commandFailure(
      "DUPLICATE_COMMAND",
      "Lệnh này đã được xử lý trước đó.",
    );
  if (!allowedStatuses.includes(record.status))
    return commandFailure(
      "INVALID_TRANSITION",
      `Không thể thực hiện lệnh khi yêu cầu ở trạng thái ${record.status}.`,
    );
  return { ok: true as const, data: record };
};

const appendHistory = (
  record: CustomerOpeningRequest,
  command: VersionedCommand,
  action: OpeningRequestHistoryAction,
  toStatus: CustomerOpeningRequestStatus,
  createdAt: string,
  details: Pick<
    OpeningRequestDecisionHistoryEntry,
    | "reason"
    | "affectedSections"
    | "evidenceReferenceIds"
    | "visibility"
  >,
) => {
  const requestVersion = record.version + 1;
  const entry: OpeningRequestDecisionHistoryEntry = {
    id: `ORH-${record.requestId}-${requestVersion}-${record.history.length + 1}`,
    requestId: record.requestId,
    requestVersion,
    action,
    fromStatus: record.status,
    toStatus,
    actorId: command.actorId,
    actorRole: command.actorRole,
    commandId: command.commandId,
    createdAt,
    ...details,
  };
  return [...record.history, entry];
};

const replaceRecord = (
  records: CustomerOpeningRequest[],
  next: CustomerOpeningRequest,
) =>
  records.map((record) =>
    record.requestId === next.requestId ? next : record,
  );

type PersistedOpeningRequest = Partial<
  Omit<CustomerOpeningRequest, "status">
> & {
  requestId: string;
  status?: CustomerOpeningRequestStatus | "ACCEPTED";
};

const migrateRecord = (
  record: PersistedOpeningRequest,
): CustomerOpeningRequest => {
  const fallback = seedRecords.find((item) => item.requestId === record.requestId);
  const base: CustomerOpeningRequest = fallback ?? {
    requestId: record.requestId,
    ownerId: "",
    title: "",
    assetReference: "",
    purpose: "",
    proposedStartPrice: null,
    customerNotes: "",
    declarationAccepted: false,
    status: "DRAFT",
    version: 1,
    createdAt: anchor,
    updatedAt: anchor,
    history: [],
  };
  const {
    status: persistedStatus,
    history: persistedHistory,
    ...persistedFields
  } = record;
  return {
    ...base,
    ...persistedFields,
    status:
      persistedStatus === "ACCEPTED"
        ? "ACCEPTED_FOR_DRAFT"
        : (persistedStatus ?? base.status),
    history: Array.isArray(persistedHistory) ? persistedHistory : [],
  };
};

const isPersistedOpeningRequest = (
  value: unknown,
): value is PersistedOpeningRequest => {
  if (typeof value !== "object" || value === null) return false;
  const status = Reflect.get(value, "status");
  const proposedStartPrice = Reflect.get(value, "proposedStartPrice");
  return (
    typeof Reflect.get(value, "requestId") === "string" &&
    typeof Reflect.get(value, "ownerId") === "string" &&
    typeof Reflect.get(value, "title") === "string" &&
    typeof Reflect.get(value, "assetReference") === "string" &&
    typeof Reflect.get(value, "purpose") === "string" &&
    typeof Reflect.get(value, "customerNotes") === "string" &&
    typeof Reflect.get(value, "declarationAccepted") === "boolean" &&
    (proposedStartPrice === null ||
      typeof proposedStartPrice === "number") &&
    typeof Reflect.get(value, "version") === "number" &&
    typeof Reflect.get(value, "createdAt") === "string" &&
    typeof Reflect.get(value, "updatedAt") === "string" &&
    typeof status === "string" &&
    [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "RETURNED_FOR_CORRECTION",
      "GOVERNANCE_REVIEW",
      "ACCEPTED_FOR_DRAFT",
      "ACCEPTED",
      "REJECTED",
    ].includes(status)
  );
};

const migratePersistedRecords = (value: unknown) => {
  if (!Array.isArray(value)) return cloneSeeds();
  const migrated = value.filter(isPersistedOpeningRequest).map(migrateRecord);
  return migrated.length ? migrated : cloneSeeds();
};

export const useOpeningRequestStore = create<OpeningRequestState>()(
  persist(
    (set, get) => ({
      records: cloneSeeds(),
      createDraft: (command) => {
        const records = get().records;
        if (command.actorRole !== "CUSTOMER")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ Customer được tạo Opening Request.",
          );
        if (hasCommand(records, command.commandId))
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Lệnh này đã được xử lý trước đó.",
          );
        const existingIds = new Set(records.map((item) => item.requestId));
        let sequence = records.length + 1;
        let requestId = `ORQ-CUS-2026-${String(sequence).padStart(3, "0")}`;
        while (existingIds.has(requestId)) {
          sequence += 1;
          requestId = `ORQ-CUS-2026-${String(sequence).padStart(3, "0")}`;
        }
        const now = new Date().toISOString();
        const history: OpeningRequestDecisionHistoryEntry[] = [
          {
            id: `ORH-${requestId}-1-1`,
            requestId,
            requestVersion: 1,
            action: "CREATE_DRAFT",
            fromStatus: "DRAFT",
            toStatus: "DRAFT",
            actorId: command.actorId,
            actorRole: command.actorRole,
            visibility: "CUSTOMER_SAFE",
            commandId: command.commandId,
            createdAt: now,
          },
        ];
        const request: CustomerOpeningRequest = {
          requestId,
          ownerId: command.actorId,
          title: "",
          assetReference: "",
          purpose: "",
          proposedStartPrice: null,
          customerNotes: "",
          declarationAccepted: false,
          status: "DRAFT",
          version: 1,
          createdAt: now,
          updatedAt: now,
          history,
        };
        set({ records: [...records, request] });
        return { ok: true, data: request };
      },
      saveDraft: (command) => {
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CUSTOMER"],
          ["DRAFT", "RETURNED_FOR_CORRECTION"],
        );
        if (!validation.ok) return validation;
        const now = new Date().toISOString();
        const record = validation.data;
        const next: CustomerOpeningRequest = {
          ...record,
          ...command.fields,
          version: record.version + 1,
          updatedAt: now,
          history: appendHistory(
            record,
            command,
            "SAVE_DRAFT",
            record.status,
            now,
            { visibility: "CUSTOMER_SAFE" },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      submitOpeningRequest: (command) => {
        const fieldErrors = validForSubmission(command.fields);
        if (Object.keys(fieldErrors).length)
          return commandFailure(
            "VALIDATION_ERROR",
            "Thông tin yêu cầu chưa hợp lệ.",
            fieldErrors,
          );
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CUSTOMER"],
          ["DRAFT", "RETURNED_FOR_CORRECTION"],
        );
        if (!validation.ok) return validation;
        const now = new Date().toISOString();
        const record = validation.data;
        const action =
          record.status === "RETURNED_FOR_CORRECTION" ? "RESUBMIT" : "SUBMIT";
        const next: CustomerOpeningRequest = {
          ...record,
          ...command.fields,
          status: "SUBMITTED",
          version: record.version + 1,
          updatedAt: now,
          previousSubmittedAt:
            action === "RESUBMIT" ? record.submittedAt : record.previousSubmittedAt,
          submittedAt: now,
          returnedAt: undefined,
          reviewStartedAt: undefined,
          decisionAt: undefined,
          governanceConcern: undefined,
          history: appendHistory(
            record,
            command,
            action,
            "SUBMITTED",
            now,
            { visibility: "CUSTOMER_SAFE" },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      startReview: (command) => {
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CONTENT_STAFF"],
          ["SUBMITTED"],
        );
        if (!validation.ok) return validation;
        const now = new Date().toISOString();
        const record = validation.data;
        const next: CustomerOpeningRequest = {
          ...record,
          status: "UNDER_REVIEW",
          version: record.version + 1,
          updatedAt: now,
          reviewStartedAt: now,
          history: appendHistory(
            record,
            command,
            "START_REVIEW",
            "UNDER_REVIEW",
            now,
            { visibility: "STAFF_ONLY" },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      returnForCorrection: (command) => {
        const reason = command.reason.trim();
        const fieldErrors: Record<string, string> = {};
        if (reason.length < 10)
          fieldErrors.reason = "Lý do cần có ít nhất 10 ký tự.";
        if (!command.affectedSections.length)
          fieldErrors.affectedSections = "Chọn ít nhất một phần cần cập nhật.";
        if (Object.keys(fieldErrors).length)
          return commandFailure(
            "VALIDATION_ERROR",
            "Thông tin trả lại chưa đầy đủ.",
            fieldErrors,
          );
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CONTENT_STAFF"],
          ["UNDER_REVIEW"],
        );
        if (!validation.ok) return validation;
        const now = new Date().toISOString();
        const record = validation.data;
        const next: CustomerOpeningRequest = {
          ...record,
          status: "RETURNED_FOR_CORRECTION",
          version: record.version + 1,
          updatedAt: now,
          returnedAt: now,
          reviewerComment: reason,
          correctionSections: [...command.affectedSections],
          history: appendHistory(
            record,
            command,
            "RETURN_FOR_CORRECTION",
            "RETURNED_FOR_CORRECTION",
            now,
            {
              reason,
              affectedSections: [...command.affectedSections],
              visibility: "CUSTOMER_SAFE",
            },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      rejectOpeningRequest: (command) => {
        const reason = command.reason.trim();
        if (reason.length < 10)
          return commandFailure(
            "VALIDATION_ERROR",
            "Cần nhập lý do từ chối có ít nhất 10 ký tự.",
            { reason: "Lý do cần có ít nhất 10 ký tự." },
          );
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CONTENT_STAFF"],
          ["UNDER_REVIEW"],
        );
        if (!validation.ok) return validation;
        const now = new Date().toISOString();
        const record = validation.data;
        const next: CustomerOpeningRequest = {
          ...record,
          status: "REJECTED",
          version: record.version + 1,
          updatedAt: now,
          decisionAt: now,
          decisionReason: reason,
          history: appendHistory(
            record,
            command,
            "REJECT",
            "REJECTED",
            now,
            { reason, visibility: "CUSTOMER_SAFE" },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      acceptForDraftPreparation: (command) => {
        const reason = command.reason.trim();
        if (reason.length < 10)
          return commandFailure(
            "VALIDATION_ERROR",
            "Cần nhập căn cứ tiếp nhận có ít nhất 10 ký tự.",
            { reason: "Căn cứ cần có ít nhất 10 ký tự." },
          );
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CONTENT_STAFF"],
          ["UNDER_REVIEW"],
        );
        if (!validation.ok) return validation;
        const finalErrors = validForSubmission(validation.data);
        if (Object.keys(finalErrors).length)
          return commandFailure(
            "BLOCKED",
            "Yêu cầu không còn đáp ứng điều kiện tiếp nhận.",
            finalErrors,
          );
        const now = new Date().toISOString();
        const record = validation.data;
        const nextVersion = record.version + 1;
        const next: CustomerOpeningRequest = {
          ...record,
          status: "ACCEPTED_FOR_DRAFT",
          version: nextVersion,
          updatedAt: now,
          decisionAt: now,
          decisionReason: reason,
          acceptedOpeningRequestVersion: nextVersion,
          history: appendHistory(
            record,
            command,
            "ACCEPT_FOR_DRAFT",
            "ACCEPTED_FOR_DRAFT",
            now,
            { reason, visibility: "CUSTOMER_SAFE" },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      recordGovernanceConcern: (command) => {
        const reason = command.concernReason.trim();
        if (reason.length < 10)
          return commandFailure(
            "VALIDATION_ERROR",
            "Cần mô tả quan ngại quản trị có ít nhất 10 ký tự.",
            { concernReason: "Quan ngại cần có ít nhất 10 ký tự." },
          );
        const validation = validateRecordCommand(
          get().records,
          command,
          ["CONTENT_STAFF"],
          ["UNDER_REVIEW"],
        );
        if (!validation.ok) return validation;
        const now = new Date().toISOString();
        const record = validation.data;
        const evidenceReferenceIds = command.evidenceReferenceIds
          .map((item) => item.trim())
          .filter(Boolean);
        const next: CustomerOpeningRequest = {
          ...record,
          status: "GOVERNANCE_REVIEW",
          version: record.version + 1,
          updatedAt: now,
          governanceConcern: {
            reason,
            evidenceReferenceIds,
            recordedAt: now,
            recordedBy: command.actorId,
          },
          history: appendHistory(
            record,
            command,
            "ROUTE_TO_GOVERNED_REVIEW",
            "GOVERNANCE_REVIEW",
            now,
            {
              reason,
              evidenceReferenceIds,
              visibility: "GOVERNANCE_ONLY",
            },
          ),
        };
        set({ records: replaceRecord(get().records, next) });
        return { ok: true, data: next };
      },
      resetForTests: () => set({ records: cloneSeeds() }),
    }),
    {
      name: "sgdg-opening-requests-v1",
      version: 2,
      partialize: (state) => ({ records: state.records }),
      migrate: (persisted) => {
        const candidate =
          typeof persisted === "object" && persisted !== null
            ? Reflect.get(persisted, "records")
            : undefined;
        return {
          records: migratePersistedRecords(candidate),
        };
      },
      merge: (persisted, current) => {
        const candidate =
          typeof persisted === "object" && persisted !== null
            ? Reflect.get(persisted, "records")
            : undefined;
        return {
          ...current,
          records: migratePersistedRecords(candidate),
        };
      },
    },
  ),
);

export const openingRequestStatusLabel: Record<
  CustomerOpeningRequestStatus,
  string
> = {
  DRAFT: "Bản nháp",
  SUBMITTED: "Đã gửi",
  UNDER_REVIEW: "Đang xem xét",
  RETURNED_FOR_CORRECTION: "Cần chỉnh sửa",
  GOVERNANCE_REVIEW: "Đang xem xét quản trị",
  ACCEPTED_FOR_DRAFT: "Đã tiếp nhận để chuẩn bị phiên",
  REJECTED: "Đã từ chối",
};
