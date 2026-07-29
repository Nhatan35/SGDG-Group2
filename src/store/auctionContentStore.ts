import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import { getApprovalPackages } from "../services/mock/operationsService";
import {
  type PersistedLinkedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import {
  type CustomerOpeningRequest,
  useOpeningRequestStore,
} from "./openingRequestStore";

export const AUCTION_CONTENT_STORAGE_KEY = "sgdg-auction-content-v1";
export const AUCTION_CONTENT_SCHEMA_VERSION = 1;
export const AUCTION_TITLE_MAX_LENGTH = 160;
export const AUCTION_SUMMARY_MAX_LENGTH = 1_000;

export const PROTOTYPE_CONTENT_POLICY = Object.freeze({
  classification:
    "MÔ HÌNH NỘI DUNG THỬ NGHIỆM — TRIỂN KHAI THEO YÊU CẦU NGƯỜI DÙNG — CHƯA ĐƯỢC CÁC BÊN LIÊN QUAN PHÊ DUYỆT — CẦN XÁC NHẬN LẠI NGHIỆP VỤ",
  titleLimit:
    "PROTOTYPE ASSUMPTION — NOT APPROVED BUSINESS REQUIREMENT: auctionTitle is limited to 160 characters.",
  summaryLimit:
    "PROTOTYPE ASSUMPTION — NOT APPROVED BUSINESS REQUIREMENT: auctionSummary is limited to 1,000 characters.",
  publicationBoundary:
    "Working content is not published, Customer-visible, or mapped to the public Auction DTO.",
} as const);

export interface AuctionWorkingContent {
  auctionTitle: string;
  auctionSummary: string;
}

export interface AuctionContentSourceLineage {
  readonly openingRequestId: string;
  readonly openingRequestVersion: number;
  readonly customerId: string;
  readonly originalTitle: string;
  readonly originalPurpose: string;
  readonly acceptedState: "ACCEPTED_FOR_DRAFT";
}

export type AuctionContentFindingCode =
  | "AUCTION_TITLE_REQUIRED"
  | "AUCTION_TITLE_TOO_LONG"
  | "AUCTION_TITLE_INVALID_CHARACTERS"
  | "AUCTION_SUMMARY_REQUIRED"
  | "AUCTION_SUMMARY_TOO_LONG"
  | "AUCTION_SUMMARY_INVALID_CHARACTERS"
  | "SOURCE_LINEAGE_INVALID"
  | "OPENING_REQUEST_VERSION_STALE"
  | "SESSION_VERSION_STALE";

export interface AuctionContentFinding {
  readonly code: AuctionContentFindingCode;
  readonly field?: keyof AuctionWorkingContent;
  readonly message: string;
  readonly severity: "ERROR" | "WARNING";
  readonly owner: "CONTENT_STAFF" | "CUSTOMER_SOURCE" | "AUCTION_SYSTEM";
  readonly correctableInCurrentWorkspace: boolean;
}

export interface AuctionContentCompleteness {
  readonly complete: boolean;
  readonly evaluatedContentVersion: number;
  readonly findings: readonly AuctionContentFinding[];
}

export interface AuctionContentVersionRecord {
  readonly versionId: string;
  readonly contentId: string;
  readonly sessionId: string;
  readonly contentVersion: number;
  readonly workingContent: Readonly<AuctionWorkingContent>;
  readonly sourceLineage: Readonly<
    Pick<
      AuctionContentSourceLineage,
      "openingRequestId" | "openingRequestVersion"
    >
  >;
  readonly changeReason?: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export type AuctionContentHistoryAction =
  | "CONTENT_INITIALIZED_FROM_OPENING_REQUEST"
  | "AUCTION_CONTENT_DRAFT_SAVED"
  | "AUCTION_CONTENT_SOURCE_REVALIDATED"
  | "AUCTION_CONTENT_SOURCE_STALE"
  | "AUCTION_CONTENT_BLOCKED";

export interface AuctionContentHistoryEntry {
  readonly historyId: string;
  readonly contentId: string;
  readonly sessionId: string;
  readonly contentVersion: number;
  readonly actorId: string;
  readonly actorRole: "CONTENT_STAFF";
  readonly commandId: string;
  readonly action: AuctionContentHistoryAction;
  readonly previousStatus?: AuctionContentStatus;
  readonly resultingStatus: AuctionContentStatus;
  readonly openingRequestId: string;
  readonly openingRequestVersion: number;
  readonly changedFields: readonly (keyof AuctionWorkingContent)[];
  readonly reason?: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export type AuctionContentStatus = "DRAFT" | "COMPLETE" | "STALE" | "BLOCKED";

export interface AuctionContent {
  readonly contentId: string;
  readonly sessionId: string;
  readonly sessionVersionAtInitialization: number;
  readonly creationSource: "OPENING_REQUEST";
  readonly managementMode: "CUSTOMER_REQUESTED";
  readonly sourceLineage: Readonly<AuctionContentSourceLineage>;
  readonly contentVersion: number;
  readonly status: AuctionContentStatus;
  readonly workingContent: Readonly<AuctionWorkingContent>;
  readonly completeness: AuctionContentCompleteness;
  readonly initializedBy: string;
  readonly initializedAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly versions: readonly AuctionContentVersionRecord[];
  readonly history: readonly AuctionContentHistoryEntry[];
}

export type AuctionContentCommandErrorCode =
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_DYNAMIC"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "ACCESS_DENIED"
  | "OPENING_REQUEST_NOT_FOUND"
  | "OPENING_REQUEST_NOT_ACCEPTED"
  | "OPENING_REQUEST_LINEAGE_MISMATCH"
  | "STALE_SESSION_VERSION"
  | "STALE_OPENING_REQUEST_VERSION"
  | "CONTENT_NOT_FOUND"
  | "CONTENT_ALREADY_INITIALIZED"
  | "STALE_CONTENT_VERSION"
  | "VALIDATION_ERROR"
  | "DUPLICATE_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "APPROVAL_PACKAGE_ALREADY_EXISTS"
  | "PERSISTENCE_ERROR"
  | "BLOCKED";

export type AuctionContentCommandResult =
  | {
      ok: true;
      content: AuctionContent;
      created?: boolean;
      changed?: boolean;
    }
  | {
      ok: false;
      code: AuctionContentCommandErrorCode;
      message: string;
      fieldErrors?: Partial<Record<keyof AuctionWorkingContent, string>>;
    };

export interface InitializeAuctionContentCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedOpeningRequestVersion: number;
  commandId: string;
}

export interface SaveAuctionContentDraftCommand {
  contentId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedContentVersion: number;
  expectedSessionVersion: number;
  commandId: string;
  auctionTitle: string;
  auctionSummary: string;
  changeReason?: string;
}

export interface RefreshAuctionContentSourceLineageCommand {
  contentId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedContentVersion: number;
  expectedSessionVersion: number;
  commandId: string;
}

export type AuctionContentEligibilityResult =
  | {
      eligible: true;
      session: PersistedLinkedAuctionSession;
      openingRequest: CustomerOpeningRequest;
    }
  | {
      eligible: false;
      code: AuctionContentCommandErrorCode;
      message: string;
    };

interface AuctionContentState {
  contents: AuctionContent[];
  getContentBySessionId: (sessionId: string) => AuctionContent | undefined;
  getContentById: (contentId: string) => AuctionContent | undefined;
  initializeAuctionContent: (
    command: InitializeAuctionContentCommand,
  ) => AuctionContentCommandResult;
  saveAuctionContentDraft: (
    command: SaveAuctionContentDraftCommand,
  ) => AuctionContentCommandResult;
  refreshAuctionContentSourceLineage: (
    command: RefreshAuctionContentSourceLineageCommand,
  ) => AuctionContentCommandResult;
  resetDeterministicContentState: () => void;
}

type SourceState = "CURRENT" | "STALE" | "INVALID";

const commandFailure = (
  code: AuctionContentCommandErrorCode,
  message: string,
  fieldErrors?: Partial<Record<keyof AuctionWorkingContent, string>>,
): AuctionContentCommandResult => ({
  ok: false,
  code,
  message,
  fieldErrors,
});

const hasControlCharacters = (value: string, allowNewlines: boolean) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    if (allowNewlines && code === 10) return false;
    return code <= 31 || code === 127;
  });

const normalizeTitle = (value: string) => value.trim();
const normalizeSummary = (value: string) =>
  value.replace(/\r\n?/g, "\n").trim();

const finding = (
  input: AuctionContentFinding,
): AuctionContentFinding => Object.freeze({ ...input });

export const evaluateAuctionContentCompleteness = ({
  workingContent,
  contentVersion,
  sourceState = "CURRENT",
}: {
  workingContent: AuctionWorkingContent;
  contentVersion: number;
  sourceState?: SourceState;
}): AuctionContentCompleteness => {
  const findings: AuctionContentFinding[] = [];
  const { auctionTitle, auctionSummary } = workingContent;
  if (!auctionTitle.trim())
    findings.push(
      finding({
        code: "AUCTION_TITLE_REQUIRED",
        field: "auctionTitle",
        message: "Tiêu đề phiên đấu giá là bắt buộc để nội dung hoàn chỉnh.",
        severity: "ERROR",
        owner: "CONTENT_STAFF",
        correctableInCurrentWorkspace: true,
      }),
    );
  if (auctionTitle.length > AUCTION_TITLE_MAX_LENGTH)
    findings.push(
      finding({
        code: "AUCTION_TITLE_TOO_LONG",
        field: "auctionTitle",
        message: `Tiêu đề không được vượt quá ${AUCTION_TITLE_MAX_LENGTH} ký tự.`,
        severity: "ERROR",
        owner: "CONTENT_STAFF",
        correctableInCurrentWorkspace: true,
      }),
    );
  if (hasControlCharacters(auctionTitle, false))
    findings.push(
      finding({
        code: "AUCTION_TITLE_INVALID_CHARACTERS",
        field: "auctionTitle",
        message: "Tiêu đề chứa ký tự điều khiển không được hỗ trợ.",
        severity: "ERROR",
        owner: "CONTENT_STAFF",
        correctableInCurrentWorkspace: true,
      }),
    );
  if (!auctionSummary.trim())
    findings.push(
      finding({
        code: "AUCTION_SUMMARY_REQUIRED",
        field: "auctionSummary",
        message: "Tóm tắt phiên đấu giá còn thiếu.",
        severity: "ERROR",
        owner: "CONTENT_STAFF",
        correctableInCurrentWorkspace: true,
      }),
    );
  if (auctionSummary.length > AUCTION_SUMMARY_MAX_LENGTH)
    findings.push(
      finding({
        code: "AUCTION_SUMMARY_TOO_LONG",
        field: "auctionSummary",
        message: `Tóm tắt không được vượt quá ${AUCTION_SUMMARY_MAX_LENGTH} ký tự.`,
        severity: "ERROR",
        owner: "CONTENT_STAFF",
        correctableInCurrentWorkspace: true,
      }),
    );
  if (hasControlCharacters(auctionSummary, true))
    findings.push(
      finding({
        code: "AUCTION_SUMMARY_INVALID_CHARACTERS",
        field: "auctionSummary",
        message: "Tóm tắt chứa ký tự điều khiển không được hỗ trợ.",
        severity: "ERROR",
        owner: "CONTENT_STAFF",
        correctableInCurrentWorkspace: true,
      }),
    );
  if (sourceState === "STALE")
    findings.push(
      finding({
        code: "OPENING_REQUEST_VERSION_STALE",
        message:
          "Phiên bản Opening Request nguồn đã thay đổi; cần quyết định đối soát có quản trị.",
        severity: "ERROR",
        owner: "CUSTOMER_SOURCE",
        correctableInCurrentWorkspace: false,
      }),
    );
  if (sourceState === "INVALID")
    findings.push(
      finding({
        code: "SOURCE_LINEAGE_INVALID",
        message: "Không thể xác nhận lineage Opening Request hiện hành.",
        severity: "ERROR",
        owner: "AUCTION_SYSTEM",
        correctableInCurrentWorkspace: false,
      }),
    );
  return Object.freeze({
    complete: findings.every((item) => item.severity !== "ERROR"),
    evaluatedContentVersion: contentVersion,
    findings: Object.freeze(findings),
  });
};

const deterministicTimestamp = (version: number, offset = 0) =>
  new Date(Date.UTC(2026, 6, 27, 9, version, offset)).toISOString();

const contentIdFor = (sessionId: string) => `auction-content-${sessionId}`;
const versionIdFor = (contentId: string, version: number) =>
  `${contentId}-v${version}`;
const historyIdFor = (
  contentId: string,
  historyIndex: number,
  action: AuctionContentHistoryAction,
) => `${contentId}-h${historyIndex}-${action.toLowerCase()}`;

const freezeContent = (content: AuctionContent): AuctionContent => {
  const sourceLineage = Object.freeze({ ...content.sourceLineage });
  const workingContent = Object.freeze({ ...content.workingContent });
  const completeness = Object.freeze({
    ...content.completeness,
    findings: Object.freeze(
      content.completeness.findings.map((item) =>
        Object.freeze({ ...item }),
      ),
    ),
  });
  const versions = Object.freeze(
    content.versions.map((record) =>
      Object.freeze({
        ...record,
        workingContent: Object.freeze({ ...record.workingContent }),
        sourceLineage: Object.freeze({ ...record.sourceLineage }),
      }),
    ),
  );
  const history = Object.freeze(
    content.history.map((entry) =>
      Object.freeze({
        ...entry,
        changedFields: Object.freeze([...entry.changedFields]),
      }),
    ),
  );
  return Object.freeze({
    ...content,
    sourceLineage,
    workingContent,
    completeness,
    versions,
    history,
  });
};

const hasLaterPhaseFields = (value: object) =>
  [
    "approvalPackage",
    "approvalPackageId",
    "approvalId",
    "approvedVersion",
    "schedule",
    "scheduleId",
    "publication",
    "publicationId",
    "registration",
    "registrationStatus",
  ].some((key) => Reflect.get(value, key) !== undefined);

export const evaluateAuctionContentEligibility = ({
  sessionId,
  expectedSessionVersion,
  expectedOpeningRequestVersion,
}: {
  sessionId: string;
  expectedSessionVersion: number;
  expectedOpeningRequestVersion: number;
}): AuctionContentEligibilityResult => {
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === sessionId);
  if (!session) {
    const compatibilitySession = useAuctionSessionStore
      .getState()
      .getSessionById(sessionId);
    return {
      eligible: false,
      code: compatibilitySession
        ? "SESSION_NOT_DYNAMIC"
        : "SESSION_NOT_FOUND",
      message: compatibilitySession
        ? "Fixture Session không phải authority cho Dynamic Auction Content."
        : "Không tìm thấy dynamic Auction Session.",
    };
  }
  if (session.recordKind !== "DYNAMIC_LINKED_SESSION")
    return {
      eligible: false,
      code: "SESSION_NOT_DYNAMIC",
      message:
        "Chỉ dynamic Customer-requested Session được khởi tạo nội dung bằng Opening Request mapping.",
    };
  if (
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "SESSION_NOT_DYNAMIC",
      message: "Session không thuộc Customer-requested content mapping.",
    };
  if (session.lifecycleStatus !== "DRAFT")
    return {
      eligible: false,
      code: "INVALID_SESSION_STATE",
      message: "Auction Content chỉ được khởi tạo khi Session còn DRAFT.",
    };
  if (session.publicationStatus !== "NOT_READY")
    return {
      eligible: false,
      code: "INVALID_PUBLICATION_STATE",
      message: "Publication phải ở NOT_READY.",
    };
  if (session.currentVersion !== expectedSessionVersion)
    return {
      eligible: false,
      code: "STALE_SESSION_VERSION",
      message: "Session version đã thay đổi. Hãy tải lại workspace.",
    };
  if (
    hasLaterPhaseFields(session) ||
    getApprovalPackages().some(
      (approval) => approval.sessionId === session.sessionId,
    )
  )
    return {
      eligible: false,
      code: "APPROVAL_PACKAGE_ALREADY_EXISTS",
      message: "Session đã có dữ liệu phase sau.",
    };
  const request = useOpeningRequestStore
    .getState()
    .records.find((item) => item.requestId === session.openingRequestId);
  if (!request)
    return {
      eligible: false,
      code: "OPENING_REQUEST_NOT_FOUND",
      message: "Không tìm thấy Opening Request nguồn.",
    };
  if (
    request.requestId !== session.openingRequestId ||
    request.acceptedOpeningRequestVersion !==
      session.openingRequestVersion
  )
    return {
      eligible: false,
      code: "OPENING_REQUEST_LINEAGE_MISMATCH",
      message: "Opening Request lineage không khớp Session.",
    };
  if (
    request.version !== expectedOpeningRequestVersion ||
    session.openingRequestVersion !== expectedOpeningRequestVersion
  )
    return {
      eligible: false,
      code: "STALE_OPENING_REQUEST_VERSION",
      message: "Opening Request version đã thay đổi.",
    };
  if (
    request.status !== "ACCEPTED_FOR_DRAFT" ||
    request.acceptedOpeningRequestVersion !== request.version
  )
    return {
      eligible: false,
      code: "OPENING_REQUEST_NOT_ACCEPTED",
      message: "Opening Request không còn ở ACCEPTED_FOR_DRAFT.",
    };
  return { eligible: true, session, openingRequest: request };
};

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string =>
  typeof value === "string";
const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;
const isIsoTime = (value: unknown) =>
  isString(value) && Number.isFinite(Date.parse(value));
const sameWorkingContent = (
  left: Readonly<AuctionWorkingContent>,
  right: Readonly<AuctionWorkingContent>,
) =>
  left.auctionTitle === right.auctionTitle &&
  left.auctionSummary === right.auctionSummary;

const validWorkingContent = (value: unknown): value is AuctionWorkingContent =>
  isRecord(value) &&
  exactKeys(value, ["auctionTitle", "auctionSummary"]) &&
  isString(value.auctionTitle) &&
  isString(value.auctionSummary) &&
  value.auctionTitle === normalizeTitle(value.auctionTitle) &&
  value.auctionSummary === normalizeSummary(value.auctionSummary) &&
  value.auctionTitle.length <= AUCTION_TITLE_MAX_LENGTH &&
  value.auctionSummary.length <= AUCTION_SUMMARY_MAX_LENGTH &&
  !hasControlCharacters(value.auctionTitle, false) &&
  !hasControlCharacters(value.auctionSummary, true);

const validSourceLineage = (
  value: unknown,
): value is AuctionContentSourceLineage =>
  isRecord(value) &&
  exactKeys(value, [
    "openingRequestId",
    "openingRequestVersion",
    "customerId",
    "originalTitle",
    "originalPurpose",
    "acceptedState",
  ]) &&
  isString(value.openingRequestId) &&
  isPositiveInteger(value.openingRequestVersion) &&
  isString(value.customerId) &&
  isString(value.originalTitle) &&
  isString(value.originalPurpose) &&
  value.acceptedState === "ACCEPTED_FOR_DRAFT";

const findingCodes: AuctionContentFindingCode[] = [
  "AUCTION_TITLE_REQUIRED",
  "AUCTION_TITLE_TOO_LONG",
  "AUCTION_TITLE_INVALID_CHARACTERS",
  "AUCTION_SUMMARY_REQUIRED",
  "AUCTION_SUMMARY_TOO_LONG",
  "AUCTION_SUMMARY_INVALID_CHARACTERS",
  "SOURCE_LINEAGE_INVALID",
  "OPENING_REQUEST_VERSION_STALE",
  "SESSION_VERSION_STALE",
];

const validCompleteness = (
  value: unknown,
  workingContent: AuctionWorkingContent,
  contentVersion: number,
  status: AuctionContentStatus,
): value is AuctionContentCompleteness => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["complete", "evaluatedContentVersion", "findings"]) ||
    typeof value.complete !== "boolean" ||
    value.evaluatedContentVersion !== contentVersion ||
    !Array.isArray(value.findings)
  )
    return false;
  const validFindings = value.findings.every(
    (candidate) =>
      isRecord(candidate) &&
      exactKeys(
        candidate,
        [
          "code",
          "message",
          "severity",
          "owner",
          "correctableInCurrentWorkspace",
        ],
        ["field"],
      ) &&
      findingCodes.includes(
        candidate.code as AuctionContentFindingCode,
      ) &&
      isString(candidate.message) &&
      candidate.severity === "ERROR" &&
      ["CONTENT_STAFF", "CUSTOMER_SOURCE", "AUCTION_SYSTEM"].includes(
        String(candidate.owner),
      ) &&
      typeof candidate.correctableInCurrentWorkspace === "boolean" &&
      (candidate.field === undefined ||
        ["auctionTitle", "auctionSummary"].includes(
          String(candidate.field),
        )),
  );
  if (!validFindings) return false;
  const sourceState =
    status === "STALE"
      ? "STALE"
      : status === "BLOCKED"
        ? "INVALID"
        : "CURRENT";
  const expected = evaluateAuctionContentCompleteness({
    workingContent,
    contentVersion,
    sourceState,
  });
  return (
    value.complete === expected.complete &&
    JSON.stringify(value.findings) === JSON.stringify(expected.findings)
  );
};

const validVersionRecord = (
  value: unknown,
  contentId: string,
  sessionId: string,
  sourceLineage: AuctionContentSourceLineage,
): value is AuctionContentVersionRecord =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "versionId",
      "contentId",
      "sessionId",
      "contentVersion",
      "workingContent",
      "sourceLineage",
      "createdBy",
      "createdAt",
    ],
    ["changeReason"],
  ) &&
  value.contentId === contentId &&
  value.sessionId === sessionId &&
  isPositiveInteger(value.contentVersion) &&
  value.versionId === versionIdFor(contentId, value.contentVersion) &&
  validWorkingContent(value.workingContent) &&
  isRecord(value.sourceLineage) &&
  exactKeys(value.sourceLineage, [
    "openingRequestId",
    "openingRequestVersion",
  ]) &&
  value.sourceLineage.openingRequestId === sourceLineage.openingRequestId &&
  value.sourceLineage.openingRequestVersion ===
    sourceLineage.openingRequestVersion &&
  isString(value.createdBy) &&
  value.createdBy.trim().length > 0 &&
  isIsoTime(value.createdAt) &&
  (value.changeReason === undefined || isString(value.changeReason));

const historyActions: AuctionContentHistoryAction[] = [
  "CONTENT_INITIALIZED_FROM_OPENING_REQUEST",
  "AUCTION_CONTENT_DRAFT_SAVED",
  "AUCTION_CONTENT_SOURCE_REVALIDATED",
  "AUCTION_CONTENT_SOURCE_STALE",
  "AUCTION_CONTENT_BLOCKED",
];
const contentStatuses: AuctionContentStatus[] = [
  "DRAFT",
  "COMPLETE",
  "STALE",
  "BLOCKED",
];

const validHistoryEntry = (
  value: unknown,
  contentId: string,
  sessionId: string,
  sourceLineage: AuctionContentSourceLineage,
): value is AuctionContentHistoryEntry =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "historyId",
      "contentId",
      "sessionId",
      "contentVersion",
      "actorId",
      "actorRole",
      "commandId",
      "action",
      "resultingStatus",
      "openingRequestId",
      "openingRequestVersion",
      "changedFields",
      "occurredAt",
      "visibility",
    ],
    ["previousStatus", "reason"],
  ) &&
  isString(value.historyId) &&
  value.contentId === contentId &&
  value.sessionId === sessionId &&
  isPositiveInteger(value.contentVersion) &&
  isString(value.actorId) &&
  value.actorRole === "CONTENT_STAFF" &&
  isString(value.commandId) &&
  value.commandId.trim().length > 0 &&
  historyActions.includes(value.action as AuctionContentHistoryAction) &&
  contentStatuses.includes(value.resultingStatus as AuctionContentStatus) &&
  (value.previousStatus === undefined ||
    contentStatuses.includes(value.previousStatus as AuctionContentStatus)) &&
  value.openingRequestId === sourceLineage.openingRequestId &&
  value.openingRequestVersion === sourceLineage.openingRequestVersion &&
  Array.isArray(value.changedFields) &&
  value.changedFields.every((field) =>
    ["auctionTitle", "auctionSummary"].includes(String(field)),
  ) &&
  (value.reason === undefined || isString(value.reason)) &&
  isIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeContent = (value: unknown): AuctionContent | undefined => {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "contentId",
      "sessionId",
      "sessionVersionAtInitialization",
      "creationSource",
      "managementMode",
      "sourceLineage",
      "contentVersion",
      "status",
      "workingContent",
      "completeness",
      "initializedBy",
      "initializedAt",
      "updatedBy",
      "updatedAt",
      "versions",
      "history",
    ]) ||
    !isString(value.contentId) ||
    !isString(value.sessionId) ||
    value.contentId !== contentIdFor(value.sessionId) ||
    !isPositiveInteger(value.sessionVersionAtInitialization) ||
    value.creationSource !== "OPENING_REQUEST" ||
    value.managementMode !== "CUSTOMER_REQUESTED" ||
    !validSourceLineage(value.sourceLineage) ||
    !isPositiveInteger(value.contentVersion) ||
    !contentStatuses.includes(value.status as AuctionContentStatus) ||
    !validWorkingContent(value.workingContent) ||
    !isString(value.initializedBy) ||
    !isIsoTime(value.initializedAt) ||
    !isString(value.updatedBy) ||
    !isIsoTime(value.updatedAt) ||
    !Array.isArray(value.versions) ||
    !Array.isArray(value.history)
  )
    return undefined;
  const contentId = value.contentId as string;
  const sessionId = value.sessionId as string;
  const sourceLineage =
    value.sourceLineage as unknown as AuctionContentSourceLineage;
  const workingContent =
    value.workingContent as unknown as AuctionWorkingContent;
  const contentVersion = value.contentVersion as number;
  const status = value.status as AuctionContentStatus;
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === sessionId);
  const request = useOpeningRequestStore
    .getState()
    .records.find(
      (item) => item.requestId === sourceLineage.openingRequestId,
    );
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.currentVersion !== value.sessionVersionAtInitialization ||
    session.openingRequestId !== sourceLineage.openingRequestId ||
    session.openingRequestVersion !==
      sourceLineage.openingRequestVersion ||
    !request ||
    request.version !== sourceLineage.openingRequestVersion ||
    request.acceptedOpeningRequestVersion !==
      sourceLineage.openingRequestVersion ||
    request.status !== "ACCEPTED_FOR_DRAFT" ||
    request.ownerId !== sourceLineage.customerId ||
    request.title !== sourceLineage.originalTitle ||
    request.purpose !== sourceLineage.originalPurpose ||
    hasLaterPhaseFields(value)
  )
    return undefined;
  const versions = value.versions.filter((record) =>
    validVersionRecord(
      record,
      contentId,
      sessionId,
      sourceLineage,
    ),
  );
  if (
    versions.length !== value.contentVersion ||
    versions.some(
      (record, index) => record.contentVersion !== index + 1,
    ) ||
    !sameWorkingContent(
      versions[versions.length - 1].workingContent,
      value.workingContent,
    )
  )
    return undefined;
  const history = value.history.filter((entry) =>
    validHistoryEntry(
      entry,
      contentId,
      sessionId,
      sourceLineage,
    ),
  );
  if (
    history.length !== value.history.length ||
    history[0]?.action !== "CONTENT_INITIALIZED_FROM_OPENING_REQUEST" ||
    new Set(history.map((entry) => entry.commandId)).size !== history.length ||
    history.filter(
      (entry) => entry.action === "AUCTION_CONTENT_DRAFT_SAVED",
    ).length !==
      value.contentVersion - 1 ||
    !validCompleteness(
      value.completeness,
      workingContent,
      contentVersion,
      status,
    )
  )
    return undefined;
  if (
    (value.status === "COMPLETE" && !value.completeness.complete) ||
    (value.status === "DRAFT" && value.completeness.complete)
  )
    return undefined;
  return freezeContent({
    ...(value as unknown as AuctionContent),
    versions,
    history,
  });
};

export const sanitizePersistedAuctionContentState = (persisted: unknown) => {
  const candidate =
    isRecord(persisted) && Array.isArray(persisted.contents)
      ? persisted.contents
      : [];
  const sanitized = candidate.map(sanitizeContent);
  if (sanitized.some((content) => content === undefined))
    return { contents: [] };
  const contentIds = new Set<string>();
  const sessionIds = new Set<string>();
  const commandIds = new Set<string>();
  const contents: AuctionContent[] = [];
  for (const content of sanitized) {
    if (!content) return { contents: [] };
    if (
      contentIds.has(content.contentId) ||
      sessionIds.has(content.sessionId) ||
      content.history.some((entry) => commandIds.has(entry.commandId))
    )
      return { contents: [] };
    contentIds.add(content.contentId);
    sessionIds.add(content.sessionId);
    content.history.forEach((entry) => commandIds.add(entry.commandId));
    contents.push(content);
  }
  return { contents };
};

const allowedInitializeKeys = [
  "sessionId",
  "actorId",
  "actorRole",
  "expectedSessionVersion",
  "expectedOpeningRequestVersion",
  "commandId",
];
const allowedSaveKeys = [
  "contentId",
  "actorId",
  "actorRole",
  "expectedContentVersion",
  "expectedSessionVersion",
  "commandId",
  "auctionTitle",
  "auctionSummary",
  "changeReason",
];
const allowedRefreshKeys = [
  "contentId",
  "actorId",
  "actorRole",
  "expectedContentVersion",
  "expectedSessionVersion",
  "commandId",
];
const hasUnsupportedKeys = (
  command: object,
  allowedKeys: readonly string[],
) => Object.keys(command).some((key) => !allowedKeys.includes(key));

const contentCommandOwner = (
  contents: readonly AuctionContent[],
  commandId: string,
) =>
  contents.find((content) =>
    content.history.some((entry) => entry.commandId === commandId),
  );

const makeVersionRecord = ({
  contentId,
  sessionId,
  contentVersion,
  workingContent,
  sourceLineage,
  createdBy,
  createdAt,
  changeReason,
}: {
  contentId: string;
  sessionId: string;
  contentVersion: number;
  workingContent: AuctionWorkingContent;
  sourceLineage: AuctionContentSourceLineage;
  createdBy: string;
  createdAt: string;
  changeReason?: string;
}): AuctionContentVersionRecord =>
  Object.freeze({
    versionId: versionIdFor(contentId, contentVersion),
    contentId,
    sessionId,
    contentVersion,
    workingContent: Object.freeze({ ...workingContent }),
    sourceLineage: Object.freeze({
      openingRequestId: sourceLineage.openingRequestId,
      openingRequestVersion: sourceLineage.openingRequestVersion,
    }),
    ...(changeReason ? { changeReason } : {}),
    createdBy,
    createdAt,
  });

const makeHistory = ({
  content,
  actorId,
  commandId,
  action,
  resultingStatus,
  changedFields,
  occurredAt,
  reason,
}: {
  content: Pick<
    AuctionContent,
    "contentId" | "sessionId" | "contentVersion" | "sourceLineage" | "history"
  > & { status?: AuctionContentStatus };
  actorId: string;
  commandId: string;
  action: AuctionContentHistoryAction;
  resultingStatus: AuctionContentStatus;
  changedFields: readonly (keyof AuctionWorkingContent)[];
  occurredAt: string;
  reason?: string;
}): AuctionContentHistoryEntry =>
  Object.freeze({
    historyId: historyIdFor(
      content.contentId,
      content.history.length + 1,
      action,
    ),
    contentId: content.contentId,
    sessionId: content.sessionId,
    contentVersion: content.contentVersion,
    actorId,
    actorRole: "CONTENT_STAFF",
    commandId,
    action,
    ...(content.status ? { previousStatus: content.status } : {}),
    resultingStatus,
    openingRequestId: content.sourceLineage.openingRequestId,
    openingRequestVersion: content.sourceLineage.openingRequestVersion,
    changedFields: Object.freeze([...changedFields]),
    ...(reason ? { reason } : {}),
    occurredAt,
    visibility: "STAFF_ONLY",
  });

export const useAuctionContentStore = create<AuctionContentState>()(
  persist(
    (set, get) => ({
      contents: [],
      getContentBySessionId: (sessionId) =>
        get().contents.find((content) => content.sessionId === sessionId),
      getContentById: (contentId) =>
        get().contents.find((content) => content.contentId === contentId),
      initializeAuctionContent: (command) => {
        if (hasUnsupportedKeys(command, allowedInitializeKeys))
          return commandFailure(
            "UNSUPPORTED_FIELD",
            "Initialize command chứa field không được hỗ trợ.",
          );
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF có thể khởi tạo Auction Content.",
          );
        if (!command.commandId.trim())
          return commandFailure("DUPLICATE_COMMAND", "Command ID là bắt buộc.");
        const committed = contentCommandOwner(
          get().contents,
          command.commandId,
        );
        if (committed) {
          if (
            committed.sessionId === command.sessionId &&
            committed.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action ===
                  "CONTENT_INITIALIZED_FROM_OPENING_REQUEST",
            )
          )
            return { ok: true, content: committed, created: false };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Auction Content khác.",
          );
        }
        const existing = get().contents.find(
          (content) => content.sessionId === command.sessionId,
        );
        if (existing)
          return commandFailure(
            "CONTENT_ALREADY_INITIALIZED",
            "Auction Content đã được khởi tạo cho Session.",
          );
        const eligibility = evaluateAuctionContentEligibility(command);
        if (!eligibility.eligible)
          return commandFailure(eligibility.code, eligibility.message);
        const finalEligibility = evaluateAuctionContentEligibility(command);
        if (!finalEligibility.eligible)
          return commandFailure(finalEligibility.code, finalEligibility.message);
        const contentId = contentIdFor(finalEligibility.session.sessionId);
        const workingContent = {
          auctionTitle: normalizeTitle(finalEligibility.openingRequest.title),
          auctionSummary: normalizeSummary(
            finalEligibility.openingRequest.purpose || "",
          ),
        };
        const sourceLineage: AuctionContentSourceLineage = Object.freeze({
          openingRequestId: finalEligibility.openingRequest.requestId,
          openingRequestVersion: finalEligibility.openingRequest.version,
          customerId: finalEligibility.openingRequest.ownerId,
          originalTitle: finalEligibility.openingRequest.title,
          originalPurpose: finalEligibility.openingRequest.purpose || "",
          acceptedState: "ACCEPTED_FOR_DRAFT",
        });
        const time = deterministicTimestamp(1);
        const completeness = evaluateAuctionContentCompleteness({
          workingContent,
          contentVersion: 1,
        });
        const status: AuctionContentStatus = completeness.complete
          ? "COMPLETE"
          : "DRAFT";
        const base = {
          contentId,
          sessionId: finalEligibility.session.sessionId,
          contentVersion: 1,
          sourceLineage,
          history: [] as AuctionContentHistoryEntry[],
        };
        const content = freezeContent({
          ...base,
          sessionVersionAtInitialization:
            finalEligibility.session.currentVersion,
          creationSource: "OPENING_REQUEST",
          managementMode: "CUSTOMER_REQUESTED",
          status,
          workingContent,
          completeness,
          initializedBy: command.actorId,
          initializedAt: time,
          updatedBy: command.actorId,
          updatedAt: time,
          versions: [
            makeVersionRecord({
              contentId,
              sessionId: finalEligibility.session.sessionId,
              contentVersion: 1,
              workingContent,
              sourceLineage,
              createdBy: command.actorId,
              createdAt: time,
            }),
          ],
          history: [
            makeHistory({
              content: base,
              actorId: command.actorId,
              commandId: command.commandId,
              action: "CONTENT_INITIALIZED_FROM_OPENING_REQUEST",
              resultingStatus: status,
              changedFields: ["auctionTitle", "auctionSummary"],
              occurredAt: time,
              reason:
                "Initialized from immutable accepted Opening Request source.",
            }),
          ],
        });
        set((state) => ({ contents: [...state.contents, content] }));
        return { ok: true, content, created: true };
      },
      saveAuctionContentDraft: (command) => {
        if (hasUnsupportedKeys(command, allowedSaveKeys))
          return commandFailure(
            "UNSUPPORTED_FIELD",
            "Save command chỉ chấp nhận auctionTitle và auctionSummary.",
          );
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF có thể lưu Auction Content.",
          );
        if (!command.commandId.trim())
          return commandFailure("DUPLICATE_COMMAND", "Command ID là bắt buộc.");
        const committed = contentCommandOwner(
          get().contents,
          command.commandId,
        );
        if (committed) {
          if (committed.contentId === command.contentId)
            return { ok: true, content: committed, changed: false };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Auction Content khác.",
          );
        }
        const content = get().contents.find(
          (item) => item.contentId === command.contentId,
        );
        if (!content)
          return commandFailure(
            "CONTENT_NOT_FOUND",
            "Không tìm thấy Auction Content.",
          );
        if (content.status === "STALE" || content.status === "BLOCKED")
          return commandFailure(
            "BLOCKED",
            "Source lineage đang stale hoặc blocked; không thể lưu.",
          );
        const session = useAuctionSessionStore
          .getState()
          .sessions.find((item) => item.sessionId === content.sessionId);
        if (!session)
          return commandFailure(
            "SESSION_NOT_FOUND",
            "Không tìm thấy dynamic Session.",
          );
        if (session.lifecycleStatus !== "DRAFT")
          return commandFailure(
            "INVALID_SESSION_STATE",
            "Session không còn ở DRAFT.",
          );
        if (session.publicationStatus !== "NOT_READY")
          return commandFailure(
            "INVALID_PUBLICATION_STATE",
            "Publication không còn ở NOT_READY.",
          );
        if (
          session.currentVersion !== command.expectedSessionVersion ||
          session.currentVersion !== content.sessionVersionAtInitialization
        )
          return commandFailure(
            "STALE_SESSION_VERSION",
            "Session version đã thay đổi. Nội dung nhập được giữ trên form.",
          );
        if (content.contentVersion !== command.expectedContentVersion)
          return commandFailure(
            "STALE_CONTENT_VERSION",
            "Content version đã thay đổi. Hãy tải lại trước khi lưu.",
          );
        const request = useOpeningRequestStore
          .getState()
          .records.find(
            (item) =>
              item.requestId === content.sourceLineage.openingRequestId,
          );
        if (!request)
          return commandFailure(
            "OPENING_REQUEST_NOT_FOUND",
            "Opening Request nguồn không còn tồn tại.",
          );
        if (
          request.version !== content.sourceLineage.openingRequestVersion ||
          request.status !== "ACCEPTED_FOR_DRAFT" ||
          request.ownerId !== content.sourceLineage.customerId
        )
          return commandFailure(
            "STALE_OPENING_REQUEST_VERSION",
            "Opening Request source đã thay đổi; working content không bị ghi đè.",
          );
        const workingContent = {
          auctionTitle: normalizeTitle(command.auctionTitle),
          auctionSummary: normalizeSummary(command.auctionSummary),
        };
        const fieldErrors: Partial<
          Record<keyof AuctionWorkingContent, string>
        > = {};
        if (workingContent.auctionTitle.length > AUCTION_TITLE_MAX_LENGTH)
          fieldErrors.auctionTitle = `Tối đa ${AUCTION_TITLE_MAX_LENGTH} ký tự.`;
        else if (hasControlCharacters(workingContent.auctionTitle, false))
          fieldErrors.auctionTitle =
            "Không chấp nhận ký tự điều khiển trong tiêu đề.";
        if (workingContent.auctionSummary.length > AUCTION_SUMMARY_MAX_LENGTH)
          fieldErrors.auctionSummary = `Tối đa ${AUCTION_SUMMARY_MAX_LENGTH} ký tự.`;
        else if (hasControlCharacters(workingContent.auctionSummary, true))
          fieldErrors.auctionSummary =
            "Không chấp nhận ký tự điều khiển trong tóm tắt.";
        if (Object.keys(fieldErrors).length)
          return commandFailure(
            "VALIDATION_ERROR",
            "Nội dung chứa giá trị không hợp lệ.",
            fieldErrors,
          );
        if (sameWorkingContent(content.workingContent, workingContent))
          return { ok: true, content, changed: false };
        const finalContent = get().contents.find(
          (item) => item.contentId === command.contentId,
        );
        const finalSession = useAuctionSessionStore
          .getState()
          .sessions.find((item) => item.sessionId === content.sessionId);
        if (
          !finalContent ||
          finalContent.contentVersion !== command.expectedContentVersion ||
          !finalSession ||
          finalSession.currentVersion !== command.expectedSessionVersion
        )
          return commandFailure(
            "STALE_CONTENT_VERSION",
            "State đã thay đổi tại thời điểm lưu.",
          );
        const nextVersion = content.contentVersion + 1;
        const time = deterministicTimestamp(nextVersion);
        const completeness = evaluateAuctionContentCompleteness({
          workingContent,
          contentVersion: nextVersion,
        });
        const nextStatus: AuctionContentStatus = completeness.complete
          ? "COMPLETE"
          : "DRAFT";
        const changedFields = (
          ["auctionTitle", "auctionSummary"] as const
        ).filter(
          (field) =>
            content.workingContent[field] !== workingContent[field],
        );
        const nextBase = {
          ...content,
          contentVersion: nextVersion,
          status: nextStatus,
          workingContent,
          completeness,
          updatedBy: command.actorId,
          updatedAt: time,
          versions: [
            ...content.versions,
            makeVersionRecord({
              contentId: content.contentId,
              sessionId: content.sessionId,
              contentVersion: nextVersion,
              workingContent,
              sourceLineage: content.sourceLineage,
              createdBy: command.actorId,
              createdAt: time,
              changeReason: command.changeReason?.trim() || undefined,
            }),
          ],
        };
        const next = freezeContent({
          ...nextBase,
          history: [
            ...content.history,
            makeHistory({
              content: { ...nextBase, status: content.status },
              actorId: command.actorId,
              commandId: command.commandId,
              action: "AUCTION_CONTENT_DRAFT_SAVED",
              resultingStatus: nextStatus,
              changedFields,
              occurredAt: time,
              reason: command.changeReason?.trim() || undefined,
            }),
          ],
        });
        set((state) => ({
          contents: state.contents.map((item) =>
            item.contentId === next.contentId ? next : item,
          ),
        }));
        return { ok: true, content: next, changed: true };
      },
      refreshAuctionContentSourceLineage: (command) => {
        if (hasUnsupportedKeys(command, allowedRefreshKeys))
          return commandFailure(
            "UNSUPPORTED_FIELD",
            "Refresh command chứa field không được hỗ trợ.",
          );
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF có thể kiểm tra lại source lineage.",
          );
        if (!command.commandId.trim())
          return commandFailure("DUPLICATE_COMMAND", "Command ID là bắt buộc.");
        const committed = contentCommandOwner(
          get().contents,
          command.commandId,
        );
        if (committed) {
          if (committed.contentId === command.contentId)
            return { ok: true, content: committed, changed: false };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Auction Content khác.",
          );
        }
        const content = get().contents.find(
          (item) => item.contentId === command.contentId,
        );
        if (!content)
          return commandFailure(
            "CONTENT_NOT_FOUND",
            "Không tìm thấy Auction Content.",
          );
        if (content.contentVersion !== command.expectedContentVersion)
          return commandFailure(
            "STALE_CONTENT_VERSION",
            "Content version đã thay đổi.",
          );
        const session = useAuctionSessionStore
          .getState()
          .sessions.find((item) => item.sessionId === content.sessionId);
        if (
          !session ||
          session.currentVersion !== command.expectedSessionVersion ||
          session.currentVersion !== content.sessionVersionAtInitialization
        )
          return commandFailure(
            "STALE_SESSION_VERSION",
            "Session version đã thay đổi.",
          );
        const request = useOpeningRequestStore
          .getState()
          .records.find(
            (item) =>
              item.requestId === content.sourceLineage.openingRequestId,
          );
        const sourceState: SourceState = !request
          ? "INVALID"
          : request.version !== content.sourceLineage.openingRequestVersion
            ? "STALE"
            : request.status !== "ACCEPTED_FOR_DRAFT" ||
                request.ownerId !== content.sourceLineage.customerId ||
                request.title !== content.sourceLineage.originalTitle ||
                request.purpose !== content.sourceLineage.originalPurpose
              ? "INVALID"
              : "CURRENT";
        const resultingStatus: AuctionContentStatus =
          sourceState === "STALE"
            ? "STALE"
            : sourceState === "INVALID"
              ? "BLOCKED"
              : content.completeness.complete
                ? "COMPLETE"
                : "DRAFT";
        if (resultingStatus === content.status)
          return { ok: true, content, changed: false };
        const time = deterministicTimestamp(
          content.contentVersion,
          content.history.length + 1,
        );
        const completeness = evaluateAuctionContentCompleteness({
          workingContent: { ...content.workingContent },
          contentVersion: content.contentVersion,
          sourceState,
        });
        const action: AuctionContentHistoryAction =
          sourceState === "STALE"
            ? "AUCTION_CONTENT_SOURCE_STALE"
            : sourceState === "INVALID"
              ? "AUCTION_CONTENT_BLOCKED"
              : "AUCTION_CONTENT_SOURCE_REVALIDATED";
        const nextBase = {
          ...content,
          status: resultingStatus,
          completeness,
          updatedBy: command.actorId,
          updatedAt: time,
        };
        const next = freezeContent({
          ...nextBase,
          history: [
            ...content.history,
            makeHistory({
              content: { ...nextBase, status: content.status },
              actorId: command.actorId,
              commandId: command.commandId,
              action,
              resultingStatus,
              changedFields: [],
              occurredAt: time,
              reason:
                sourceState === "CURRENT"
                  ? "Source lineage is current."
                  : "Source lineage changed; working content was preserved.",
            }),
          ],
        });
        set((state) => ({
          contents: state.contents.map((item) =>
            item.contentId === next.contentId ? next : item,
          ),
        }));
        return { ok: true, content: next, changed: true };
      },
      resetDeterministicContentState: () => set({ contents: [] }),
    }),
    {
      name: AUCTION_CONTENT_STORAGE_KEY,
      version: AUCTION_CONTENT_SCHEMA_VERSION,
      partialize: (state) => ({ contents: state.contents }),
      migrate: (persisted, version) =>
        version === AUCTION_CONTENT_SCHEMA_VERSION
          ? sanitizePersistedAuctionContentState(persisted)
          : { contents: [] },
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedAuctionContentState(persisted),
      }),
    },
  ),
);
