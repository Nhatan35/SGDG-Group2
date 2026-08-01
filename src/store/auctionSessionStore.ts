import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  getAuctionSessionById as getCompatibilitySessionById,
  getAuctionSessions as getCompatibilitySessions,
  getLinkedSessionForOpeningRequest as getCompatibilityLinkedSession,
  type AuctionSessionFixture,
} from "../services/mock/operationsService";
import {
  type CustomerOpeningRequest,
  useOpeningRequestStore,
} from "./openingRequestStore";
import {
  evaluateSgdgManagedDraftReadiness,
  getCurrentAssetVersion,
  type AssetReadinessReference,
  type SgdgManagedSessionDraft,
} from "../services/assetReadinessService";
import { useAssetReadinessStore } from "./assetReadinessStore";

export interface LinkedSessionHistoryEntry {
  id: string;
  action: "LINKED_SESSION_CREATED";
  sessionId: string;
  requestId: string;
  acceptedRequestVersion: number;
  actorId: string;
  actorRole: ActorRole;
  commandId: string;
  visibility: "STAFF_ONLY";
  createdAt: string;
}

export interface PersistedLinkedAuctionSession extends AuctionSessionFixture {
  recordKind: "DYNAMIC_LINKED_SESSION";
  history: LinkedSessionHistoryEntry[];
}

export interface SgdgManagedSessionHistoryEntry {
  id: string;
  action: "SGDG_MANAGED_SESSION_CREATED";
  sessionId: string;
  assetId: string;
  assetReadinessReferenceId: string;
  evaluatedAssetVersion: number;
  intentKey: string;
  actorId: string;
  actorRole: "CONTENT_STAFF";
  commandId: string;
  visibility: "STAFF_ONLY";
  createdAt: string;
}

export interface PersistedSgdgManagedSession extends AuctionSessionFixture {
  recordKind: "DYNAMIC_SGDG_MANAGED_SESSION";
  creationSource: "DIRECT_SGDG";
  managementMode: "SGDG_MANAGED";
  assetReadinessReferenceId: string;
  evaluatedAssetVersion: number;
  assetSessionSequence: number;
  readinessObservedAt: string;
  draftPurpose: string;
  operatingRegion: string;
  history: SgdgManagedSessionHistoryEntry[];
}

export type PersistedAuctionSession =
  | PersistedLinkedAuctionSession
  | PersistedSgdgManagedSession;

export interface CreateLinkedSessionCommand {
  requestId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedRequestVersion: number;
  commandId: string;
  ownerId: string;
}

export type CreateLinkedSessionErrorCode =
  | "REQUEST_NOT_FOUND"
  | "ACCESS_DENIED"
  | "INVALID_REQUEST_STATUS"
  | "STALE_REQUEST_VERSION"
  | "DUPLICATE_COMMAND"
  | "ALREADY_LINKED"
  | "MISSING_SESSION_INPUT"
  | "BLOCKED";

export type CreateLinkedSessionResult =
  | {
      ok: true;
      session: PersistedLinkedAuctionSession;
      created: boolean;
    }
  | {
      ok: false;
      code: CreateLinkedSessionErrorCode;
      message: string;
      existingSessionId?: string;
      fieldErrors?: Record<string, string>;
    };

export interface CreateSgdgManagedSessionCommand {
  actorId: string;
  actorRole: ActorRole;
  commandId: string;
  draft: SgdgManagedSessionDraft;
  assetReadinessReferenceId: string;
  expectedAssetVersion: number;
  ownerId: string;
}

export type CreateSgdgManagedSessionResult =
  | {
      ok: true;
      session: PersistedSgdgManagedSession;
      created: boolean;
    }
  | {
      ok: false;
      code:
        | "ACCESS_DENIED"
        | "INVALID_DRAFT"
        | "ASSET_NOT_FOUND"
        | "ASSET_REFERENCE_STALE"
        | "ASSET_NOT_APPROVED"
        | "ASSET_UNAVAILABLE"
        | "ASSET_RESTRICTED"
        | "ASSET_ON_HOLD"
        | "ACTIVE_SESSION_CONFLICT"
        | "DUPLICATE_COMMAND"
        | "ALREADY_CREATED"
        | "SESSION_ID_COLLISION"
        | "BLOCKED";
      message: string;
      fieldErrors?: Record<string, string>;
      existingSessionId?: string;
    };

interface AuctionSessionState {
  sessions: PersistedAuctionSession[];
  createLinkedSessionFromAcceptedRequest: (
    command: CreateLinkedSessionCommand,
  ) => CreateLinkedSessionResult;
  createSgdgManagedDraftSession: (
    command: CreateSgdgManagedSessionCommand,
  ) => CreateSgdgManagedSessionResult;
  getSessionById: (
    sessionId: string,
  ) => PersistedAuctionSession | AuctionSessionFixture | undefined;
  getSessions: () => AuctionSessionFixture[];
  getSessionByOpeningRequest: (
    requestId: string,
    acceptedRequestVersion: number,
  ) => PersistedAuctionSession | AuctionSessionFixture | undefined;
  resetDeterministicSessionState: () => void;
}

const sessionFailure = (
  code: CreateLinkedSessionErrorCode,
  message: string,
  details?: Pick<
    Extract<CreateLinkedSessionResult, { ok: false }>,
    "existingSessionId" | "fieldErrors"
  >,
): CreateLinkedSessionResult => ({
  ok: false,
  code,
  message,
  ...details,
});

const normalizeIdPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const linkedSessionIdFor = (
  requestId: string,
  acceptedRequestVersion: number,
) =>
  `linked-${normalizeIdPart(requestId)}-v${acceptedRequestVersion}`;

export const linkedAuctionCodeFor = (
  requestId: string,
  acceptedRequestVersion: number,
) =>
  `SGD-REQ-${requestId
    .replace(/^ORQ-/i, "")
    .replace(/[^A-Z0-9]+/gi, "-")
    .toUpperCase()}-V${acceptedRequestVersion}`;

export const sgdgManagedSessionIdFor = (
  assetId: string,
  sequence: number,
) => `sgdg-managed-${normalizeIdPart(assetId)}-s${sequence}`;

export const sgdgManagedAuctionCodeFor = (
  assetId: string,
  sequence: number,
) =>
  `SGD-DIRECT-${assetId
    .replace(/^AST-/i, "")
    .replace(/[^A-Z0-9]+/gi, "-")
    .toUpperCase()}-S${sequence}`;

const deterministicCreationTime = (request: CustomerOpeningRequest) => {
  const acceptedAt = Date.parse(request.decisionAt ?? request.updatedAt);
  return Number.isFinite(acceptedAt)
    ? new Date(acceptedAt + 60_000).toISOString()
    : request.updatedAt;
};

const requiredSessionInputErrors = (request: CustomerOpeningRequest) => {
  const fieldErrors: Record<string, string> = {};
  if (!request.title.trim())
    fieldErrors.title = "Opening Request chưa có tên tài sản an toàn.";
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(request.assetReference.trim()))
    fieldErrors.assetReference =
      "Opening Request chưa có tham chiếu tài sản hợp lệ.";
  if (!request.acceptedOpeningRequestVersion)
    fieldErrors.acceptedOpeningRequestVersion =
      "Thiếu phiên bản Opening Request đã được tiếp nhận.";
  return fieldErrors;
};

const findCommittedCommand = (
  sessions: PersistedAuctionSession[],
  commandId: string,
) =>
  sessions.find((session) =>
    session.history.some((entry) => entry.commandId === commandId),
  );

const findDynamicLink = (
  sessions: PersistedAuctionSession[],
  requestId: string,
  acceptedRequestVersion: number,
): PersistedLinkedAuctionSession | undefined =>
  sessions.find(
    (session) =>
      session.recordKind === "DYNAMIC_LINKED_SESSION" &&
      session.openingRequestId === requestId &&
      session.openingRequestVersion === acceptedRequestVersion,
  ) as PersistedLinkedAuctionSession | undefined;

const buildLinkedSession = (
  request: CustomerOpeningRequest,
  command: CreateLinkedSessionCommand,
): PersistedLinkedAuctionSession => {
  const acceptedRequestVersion = request.acceptedOpeningRequestVersion!;
  const sessionId = linkedSessionIdFor(
    request.requestId,
    acceptedRequestVersion,
  );
  const auctionCode = linkedAuctionCodeFor(
    request.requestId,
    acceptedRequestVersion,
  );
  const createdAt = deterministicCreationTime(request);
  return {
    recordKind: "DYNAMIC_LINKED_SESSION",
    sessionId,
    auctionCode,
    code: auctionCode,
    assetId: request.assetReference,
    assetName: request.title,
    creationSource: "OPENING_REQUEST",
    managementMode: "CUSTOMER_REQUESTED",
    openingRequestId: request.requestId,
    requestId: request.requestId,
    openingRequestVersion: acceptedRequestVersion,
    lifecycleStatus: "DRAFT",
    publicationStatus: "NOT_READY",
    ownerId: command.ownerId,
    creatorId: command.actorId,
    currentVersion: 1,
    blockers: [],
    createdAt,
    updatedAt: createdAt,
    history: [
      {
        id: `ASH-${sessionId}-1`,
        action: "LINKED_SESSION_CREATED",
        sessionId,
        requestId: request.requestId,
        acceptedRequestVersion,
        actorId: command.actorId,
        actorRole: command.actorRole,
        commandId: command.commandId,
        visibility: "STAFF_ONLY",
        createdAt,
      },
    ],
  };
};

const normalizedDirectIntent = (
  draft: SgdgManagedSessionDraft,
  referenceId: string,
  assetVersion: number,
) =>
  [
    draft.assetId,
    draft.title,
    draft.purpose,
    draft.region,
    draft.ownerId,
    referenceId,
    assetVersion,
  ]
    .map((value) => String(value).trim().toLocaleLowerCase("vi"))
    .join("|");

const buildSgdgManagedSession = (
  command: CreateSgdgManagedSessionCommand,
  reference: AssetReadinessReference,
  assetSessionSequence: number,
): PersistedSgdgManagedSession => {
  const sessionId = sgdgManagedSessionIdFor(
    reference.assetId,
    assetSessionSequence,
  );
  const auctionCode = sgdgManagedAuctionCodeFor(
    reference.assetId,
    assetSessionSequence,
  );
  const observedTime = Date.parse(
    reference.refreshedAt ?? reference.observedAt,
  );
  const createdAt = Number.isFinite(observedTime)
    ? new Date(observedTime + 60_000).toISOString()
    : reference.observedAt;
  const intentKey = normalizedDirectIntent(
    command.draft,
    reference.referenceId,
    reference.assetVersion,
  );
  return {
    recordKind: "DYNAMIC_SGDG_MANAGED_SESSION",
    sessionId,
    auctionCode,
    code: auctionCode,
    assetId: reference.assetId,
    assetName: command.draft.title.trim(),
    creationSource: "DIRECT_SGDG",
    managementMode: "SGDG_MANAGED",
    lifecycleStatus: "DRAFT",
    publicationStatus: "NOT_READY",
    ownerId: command.ownerId,
    creatorId: command.actorId,
    currentVersion: 1,
    blockers: [],
    createdAt,
    updatedAt: createdAt,
    assetReadinessReferenceId: reference.referenceId,
    evaluatedAssetVersion: reference.assetVersion,
    assetSessionSequence,
    readinessObservedAt: reference.refreshedAt ?? reference.observedAt,
    draftPurpose: command.draft.purpose.trim(),
    operatingRegion: command.draft.region.trim(),
    history: [
      {
        id: `ASH-${sessionId}-1`,
        action: "SGDG_MANAGED_SESSION_CREATED",
        sessionId,
        assetId: reference.assetId,
        assetReadinessReferenceId: reference.referenceId,
        evaluatedAssetVersion: reference.assetVersion,
        intentKey,
        actorId: command.actorId,
        actorRole: "CONTENT_STAFF",
        commandId: command.commandId,
        visibility: "STAFF_ONLY",
        createdAt,
      },
    ],
  };
};

const isValidHistoryEntry = (
  value: unknown,
  sessionId: string,
  requestId: string,
  acceptedRequestVersion: number,
): value is LinkedSessionHistoryEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "id") === "string" &&
  Reflect.get(value, "action") === "LINKED_SESSION_CREATED" &&
  Reflect.get(value, "sessionId") === sessionId &&
  Reflect.get(value, "requestId") === requestId &&
  Reflect.get(value, "acceptedRequestVersion") === acceptedRequestVersion &&
  typeof Reflect.get(value, "actorId") === "string" &&
  Reflect.get(value, "actorRole") === "CONTENT_STAFF" &&
  typeof Reflect.get(value, "commandId") === "string" &&
  String(Reflect.get(value, "commandId")).trim().length > 0 &&
  Reflect.get(value, "visibility") === "STAFF_ONLY" &&
  typeof Reflect.get(value, "createdAt") === "string" &&
  Number.isFinite(Date.parse(String(Reflect.get(value, "createdAt"))));

const hasNoLaterPhaseFields = (value: object) =>
  Reflect.get(value, "approvedVersion") === undefined &&
  Reflect.get(value, "approvalPackageId") === undefined &&
  Reflect.get(value, "scheduleVersion") === undefined &&
  Reflect.get(value, "publishedAt") === undefined &&
  Reflect.get(value, "registrationState") === undefined &&
  Reflect.get(value, "publicVisibility") === undefined;

const isPersistedLinkedAuctionSession = (
  value: unknown,
): value is PersistedLinkedAuctionSession => {
  if (typeof value !== "object" || value === null) return false;
  const openingRequestId = Reflect.get(value, "openingRequestId");
  const openingRequestVersion = Reflect.get(value, "openingRequestVersion");
  const sessionId = Reflect.get(value, "sessionId");
  const auctionCode = Reflect.get(value, "auctionCode");
  const history = Reflect.get(value, "history");
  return (
    Reflect.get(value, "recordKind") === "DYNAMIC_LINKED_SESSION" &&
    typeof sessionId === "string" &&
    typeof auctionCode === "string" &&
    typeof openingRequestId === "string" &&
    typeof openingRequestVersion === "number" &&
    Number.isInteger(openingRequestVersion) &&
    openingRequestVersion > 0 &&
    sessionId === linkedSessionIdFor(openingRequestId, openingRequestVersion) &&
    auctionCode ===
      linkedAuctionCodeFor(openingRequestId, openingRequestVersion) &&
    Reflect.get(value, "code") === auctionCode &&
    typeof Reflect.get(value, "assetId") === "string" &&
    String(Reflect.get(value, "assetId")).trim().length > 0 &&
    typeof Reflect.get(value, "assetName") === "string" &&
    String(Reflect.get(value, "assetName")).trim().length > 0 &&
    Reflect.get(value, "creationSource") === "OPENING_REQUEST" &&
    Reflect.get(value, "managementMode") === "CUSTOMER_REQUESTED" &&
    Reflect.get(value, "requestId") === openingRequestId &&
    Reflect.get(value, "lifecycleStatus") === "DRAFT" &&
    Reflect.get(value, "publicationStatus") === "NOT_READY" &&
    typeof Reflect.get(value, "ownerId") === "string" &&
    String(Reflect.get(value, "ownerId")).trim().length > 0 &&
    typeof Reflect.get(value, "creatorId") === "string" &&
    String(Reflect.get(value, "creatorId")).trim().length > 0 &&
    Reflect.get(value, "currentVersion") === 1 &&
    hasNoLaterPhaseFields(value) &&
    Array.isArray(Reflect.get(value, "blockers")) &&
    Reflect.get(value, "blockers").length === 0 &&
    typeof Reflect.get(value, "createdAt") === "string" &&
    Number.isFinite(Date.parse(String(Reflect.get(value, "createdAt")))) &&
    typeof Reflect.get(value, "updatedAt") === "string" &&
    Number.isFinite(Date.parse(String(Reflect.get(value, "updatedAt")))) &&
    Array.isArray(history) &&
    history.length > 0 &&
    history.every((entry) =>
      isValidHistoryEntry(
        entry,
        sessionId,
        openingRequestId,
        openingRequestVersion,
      ),
    )
  );
};

const isValidSgdgHistoryEntry = (
  value: unknown,
  sessionId: string,
  assetId: string,
  referenceId: string,
  assetVersion: number,
): value is SgdgManagedSessionHistoryEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "id") === "string" &&
  Reflect.get(value, "action") === "SGDG_MANAGED_SESSION_CREATED" &&
  Reflect.get(value, "sessionId") === sessionId &&
  Reflect.get(value, "assetId") === assetId &&
  Reflect.get(value, "assetReadinessReferenceId") === referenceId &&
  Reflect.get(value, "evaluatedAssetVersion") === assetVersion &&
  typeof Reflect.get(value, "intentKey") === "string" &&
  String(Reflect.get(value, "intentKey")).trim().length > 0 &&
  typeof Reflect.get(value, "actorId") === "string" &&
  Reflect.get(value, "actorRole") === "CONTENT_STAFF" &&
  typeof Reflect.get(value, "commandId") === "string" &&
  String(Reflect.get(value, "commandId")).trim().length > 0 &&
  Reflect.get(value, "visibility") === "STAFF_ONLY" &&
  typeof Reflect.get(value, "createdAt") === "string" &&
  Number.isFinite(Date.parse(String(Reflect.get(value, "createdAt"))));

const isPersistedSgdgManagedSession = (
  value: unknown,
): value is PersistedSgdgManagedSession => {
  if (typeof value !== "object" || value === null) return false;
  const sessionId = Reflect.get(value, "sessionId");
  const assetId = Reflect.get(value, "assetId");
  const assetVersion = Reflect.get(value, "evaluatedAssetVersion");
  const assetSessionSequence = Reflect.get(value, "assetSessionSequence");
  const referenceId = Reflect.get(value, "assetReadinessReferenceId");
  const auctionCode = Reflect.get(value, "auctionCode");
  const history = Reflect.get(value, "history");
  return (
    Reflect.get(value, "recordKind") ===
      "DYNAMIC_SGDG_MANAGED_SESSION" &&
    typeof sessionId === "string" &&
    typeof assetId === "string" &&
    typeof assetVersion === "number" &&
    Number.isInteger(assetVersion) &&
    assetVersion > 0 &&
    typeof assetSessionSequence === "number" &&
    Number.isInteger(assetSessionSequence) &&
    assetSessionSequence > 0 &&
    typeof referenceId === "string" &&
    referenceId.trim().length > 0 &&
    sessionId ===
      sgdgManagedSessionIdFor(assetId, assetSessionSequence) &&
    typeof auctionCode === "string" &&
    auctionCode ===
      sgdgManagedAuctionCodeFor(assetId, assetSessionSequence) &&
    Reflect.get(value, "code") === auctionCode &&
    typeof Reflect.get(value, "assetName") === "string" &&
    String(Reflect.get(value, "assetName")).trim().length > 0 &&
    Reflect.get(value, "creationSource") === "DIRECT_SGDG" &&
    Reflect.get(value, "managementMode") === "SGDG_MANAGED" &&
    Reflect.get(value, "openingRequestId") === undefined &&
    Reflect.get(value, "openingRequestVersion") === undefined &&
    Reflect.get(value, "requestId") === undefined &&
    Reflect.get(value, "lifecycleStatus") === "DRAFT" &&
    Reflect.get(value, "publicationStatus") === "NOT_READY" &&
    typeof Reflect.get(value, "ownerId") === "string" &&
    String(Reflect.get(value, "ownerId")).trim().length > 0 &&
    typeof Reflect.get(value, "creatorId") === "string" &&
    String(Reflect.get(value, "creatorId")).trim().length > 0 &&
    Reflect.get(value, "currentVersion") === 1 &&
    hasNoLaterPhaseFields(value) &&
    Array.isArray(Reflect.get(value, "blockers")) &&
    Reflect.get(value, "blockers").length === 0 &&
    typeof Reflect.get(value, "readinessObservedAt") === "string" &&
    Number.isFinite(
      Date.parse(String(Reflect.get(value, "readinessObservedAt"))),
    ) &&
    typeof Reflect.get(value, "draftPurpose") === "string" &&
    String(Reflect.get(value, "draftPurpose")).trim().length > 0 &&
    typeof Reflect.get(value, "operatingRegion") === "string" &&
    String(Reflect.get(value, "operatingRegion")).trim().length > 0 &&
    typeof Reflect.get(value, "createdAt") === "string" &&
    Number.isFinite(Date.parse(String(Reflect.get(value, "createdAt")))) &&
    typeof Reflect.get(value, "updatedAt") === "string" &&
    Number.isFinite(Date.parse(String(Reflect.get(value, "updatedAt")))) &&
    Array.isArray(history) &&
    history.length > 0 &&
    history.every((entry) =>
      isValidSgdgHistoryEntry(
        entry,
        sessionId,
        assetId,
        referenceId,
        assetVersion,
      ),
    )
  );
};

export const sanitizePersistedAuctionSessions = (
  value: unknown,
  requests: CustomerOpeningRequest[] = useOpeningRequestStore.getState().records,
) => {
  if (!Array.isArray(value)) return [];
  const sessionIds = new Set<string>();
  const lineageKeys = new Set<string>();
  const commandIds = new Set<string>();
  return value.filter((candidate): candidate is PersistedAuctionSession => {
    if (
      !isPersistedLinkedAuctionSession(candidate) &&
      !isPersistedSgdgManagedSession(candidate)
    )
      return false;
    const linked =
      candidate.recordKind === "DYNAMIC_LINKED_SESSION";
    const request = linked
      ? requests.find(
          (item) =>
            item.requestId === candidate.openingRequestId &&
            item.status === "ACCEPTED_FOR_DRAFT" &&
            item.acceptedOpeningRequestVersion ===
              candidate.openingRequestVersion,
        )
      : undefined;
    const lineageKey = linked
      ? `REQUEST:${candidate.openingRequestId}:${candidate.openingRequestVersion}`
      : `ASSET:${candidate.assetId}`;
    const candidateCommandIds = candidate.history.map(
      (entry) => entry.commandId,
    );
    if (
      (linked && !request) ||
      getCompatibilitySessionById(candidate.sessionId) ||
      sessionIds.has(candidate.sessionId) ||
      lineageKeys.has(lineageKey) ||
      candidateCommandIds.some((commandId) => commandIds.has(commandId))
    )
      return false;
    sessionIds.add(candidate.sessionId);
    lineageKeys.add(lineageKey);
    candidateCommandIds.forEach((commandId) => commandIds.add(commandId));
    return true;
  });
};

export const getAuctionSessionReadModel = (
  dynamicSessions: PersistedAuctionSession[],
) => {
  const compatibility = getCompatibilitySessions();
  const compatibilityIds = new Set(
    compatibility.map((session) => session.sessionId),
  );
  const dynamicIds = new Set<string>();
  const dynamicLineage = new Set<string>();
  const safeDynamic = dynamicSessions
    .filter((session) => {
      const lineage =
        session.recordKind === "DYNAMIC_LINKED_SESSION"
          ? `REQUEST:${session.openingRequestId}:${session.openingRequestVersion}`
          : `ASSET:${session.assetId}`;
      if (
        compatibilityIds.has(session.sessionId) ||
        dynamicIds.has(session.sessionId) ||
        dynamicLineage.has(lineage)
      )
        return false;
      dynamicIds.add(session.sessionId);
      dynamicLineage.add(lineage);
      return true;
    })
    .slice()
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.sessionId.localeCompare(right.sessionId),
    );
  return [...safeDynamic, ...compatibility];
};

const directSessionFailure = (
  code: Extract<CreateSgdgManagedSessionResult, { ok: false }>["code"],
  message: string,
  details?: Pick<
    Extract<CreateSgdgManagedSessionResult, { ok: false }>,
    "existingSessionId" | "fieldErrors"
  >,
): CreateSgdgManagedSessionResult => ({
  ok: false,
  code,
  message,
  ...details,
});

const directFailureFromReadiness = (
  readiness: ReturnType<typeof evaluateSgdgManagedDraftReadiness>,
): CreateSgdgManagedSessionResult | undefined => {
  const draftErrors = readiness.findings.filter(
    (finding) =>
      finding.owner === "CONTENT_STAFF" &&
      finding.field !== undefined,
  );
  if (draftErrors.length)
    return directSessionFailure(
      "INVALID_DRAFT",
      "Thông tin Session Draft chưa hợp lệ.",
      {
        fieldErrors: Object.fromEntries(
          draftErrors.map((finding) => [
            finding.field!,
            finding.message,
          ]),
        ),
      },
    );
  const blocking = readiness.findings.find(
    (finding) => finding.severity === "ERROR",
  );
  if (!blocking) return undefined;
  const codes = {
    MISSING_ASSET_REFERENCE: "ASSET_NOT_FOUND",
    MISSING_SOURCE_FACT: "ASSET_NOT_FOUND",
    ASSET_REFERENCE_STALE: "ASSET_REFERENCE_STALE",
    ASSET_NOT_APPROVED: "ASSET_NOT_APPROVED",
    ASSET_UNAVAILABLE: "ASSET_UNAVAILABLE",
    ASSET_RESTRICTED: "ASSET_RESTRICTED",
    ASSET_ON_HOLD: "ASSET_ON_HOLD",
    ACTIVE_SESSION_CONFLICT: "ACTIVE_SESSION_CONFLICT",
  } as const;
  const code =
    blocking.code in codes
      ? codes[blocking.code as keyof typeof codes]
      : "BLOCKED";
  return directSessionFailure(code, blocking.message, {
    existingSessionId: blocking.existingSessionId,
  });
};

export const useAuctionSessionStore = create<AuctionSessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      createLinkedSessionFromAcceptedRequest: (command) => {
        if (!command.commandId.trim())
          return sessionFailure(
            "BLOCKED",
            "Command ID là bắt buộc để bảo đảm idempotency.",
          );
        if (command.actorRole !== "CONTENT_STAFF")
          return sessionFailure(
            "ACCESS_DENIED",
            "Chỉ Content Staff được xác nhận tạo bản nháp phiên.",
          );
        if (!command.ownerId.trim() || command.ownerId !== command.actorId)
          return sessionFailure(
            "ACCESS_DENIED",
            "Owner của bản nháp phải nằm trong phạm vi Content Staff hiện tại.",
          );

        const request = useOpeningRequestStore
          .getState()
          .records.find((item) => item.requestId === command.requestId);
        if (!request)
          return sessionFailure(
            "REQUEST_NOT_FOUND",
            "Không tìm thấy Opening Request.",
          );
        if (request.version !== command.expectedRequestVersion)
          return sessionFailure(
            "STALE_REQUEST_VERSION",
            "Phiên bản Opening Request đã thay đổi. Hãy tải lại trước khi tạo phiên.",
          );

        const committed = findCommittedCommand(
          get().sessions,
          command.commandId,
        );
        if (committed) {
          if (
            committed.recordKind === "DYNAMIC_LINKED_SESSION" &&
            committed.openingRequestId === request.requestId &&
            committed.openingRequestVersion ===
              request.acceptedOpeningRequestVersion
          )
            return { ok: true, session: committed, created: false };
          return sessionFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã được dùng cho một Session khác.",
          );
        }

        if (
          request.status !== "ACCEPTED_FOR_DRAFT" ||
          request.acceptedOpeningRequestVersion !== request.version
        )
          return sessionFailure(
            "INVALID_REQUEST_STATUS",
            "Chỉ Opening Request ACCEPTED_FOR_DRAFT hiện hành mới được tạo Session.",
          );

        const existing = findDynamicLink(
          get().sessions,
          request.requestId,
          request.version,
        );
        if (existing)
          return sessionFailure(
            "ALREADY_LINKED",
            "Opening Request đã có bản nháp phiên.",
            { existingSessionId: existing.sessionId },
          );

        const fieldErrors = requiredSessionInputErrors(request);
        if (Object.keys(fieldErrors).length)
          return sessionFailure(
            "MISSING_SESSION_INPUT",
            "Opening Request thiếu dữ liệu cần thiết để tạo Session.",
            { fieldErrors },
          );

        const session = buildLinkedSession(request, command);
        if (
          getCompatibilitySessionById(session.sessionId) ||
          get().sessions.some((item) => item.sessionId === session.sessionId)
        )
          return sessionFailure(
            "BLOCKED",
            "Session ID xác định bị trùng với một Session hiện có.",
          );

        const finalRequest = useOpeningRequestStore
          .getState()
          .records.find((item) => item.requestId === command.requestId);
        if (
          !finalRequest ||
          finalRequest.version !== command.expectedRequestVersion ||
          finalRequest.status !== "ACCEPTED_FOR_DRAFT" ||
          finalRequest.acceptedOpeningRequestVersion !==
            command.expectedRequestVersion
        )
          return sessionFailure(
            "BLOCKED",
            "Opening Request không còn hợp lệ tại thời điểm cam kết.",
          );

        set((state) => ({ sessions: [...state.sessions, session] }));
        return { ok: true, session, created: true };
      },
      createSgdgManagedDraftSession: (command) => {
        if (!command.commandId.trim())
          return directSessionFailure(
            "BLOCKED",
            "Command ID là bắt buộc để bảo đảm idempotency.",
          );
        if (command.actorRole !== "CONTENT_STAFF")
          return directSessionFailure(
            "ACCESS_DENIED",
            "Chỉ Content Staff được tạo SGDG-managed Session.",
          );
        if (
          !command.ownerId.trim() ||
          command.ownerId !== command.actorId ||
          command.draft.ownerId !== command.ownerId
        )
          return directSessionFailure(
            "ACCESS_DENIED",
            "Owner phải là Content Staff đang thực hiện command.",
          );

        const committed = findCommittedCommand(
          get().sessions,
          command.commandId,
        );
        if (committed) {
          if (
            committed.recordKind ===
              "DYNAMIC_SGDG_MANAGED_SESSION" &&
            committed.history[0]?.intentKey ===
              normalizedDirectIntent(
                command.draft,
                command.assetReadinessReferenceId,
                command.expectedAssetVersion,
              )
          )
            return { ok: true, session: committed, created: false };
          return directSessionFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã được dùng cho một Session intent khác.",
          );
        }

        const reference = useAssetReadinessStore
          .getState()
          .getReferenceByAssetId(command.draft.assetId);
        if (!reference)
          return directSessionFailure(
            "ASSET_NOT_FOUND",
            "Chưa có Asset readiness reference cho Asset đã chọn.",
          );
        if (
          reference.referenceId !==
            command.assetReadinessReferenceId ||
          reference.assetVersion !== command.expectedAssetVersion
        )
          return directSessionFailure(
            "ASSET_REFERENCE_STALE",
            "Asset readiness reference đã thay đổi. Hãy làm mới và xác nhận lại.",
          );

        const intendedKey = normalizedDirectIntent(
          command.draft,
          reference.referenceId,
          reference.assetVersion,
        );
        const sameIntent = get().sessions.find(
          (session): session is PersistedSgdgManagedSession =>
            session.recordKind ===
              "DYNAMIC_SGDG_MANAGED_SESSION" &&
            session.history[0]?.intentKey === intendedKey,
        );
        if (sameIntent)
          return directSessionFailure(
            "ALREADY_CREATED",
            "Session Draft cho intent này đã tồn tại.",
            { existingSessionId: sameIntent.sessionId },
          );

        const activeSession = get().sessions.find(
          (session) =>
            session.assetId === command.draft.assetId &&
            !["CLOSED", "CANCELLED", "REJECTED"].includes(
              session.lifecycleStatus,
            ),
        );
        const readiness = evaluateSgdgManagedDraftReadiness({
          draft: command.draft,
          reference,
          currentAssetVersion: getCurrentAssetVersion(
            command.draft.assetId,
          ),
          activeSessionId: activeSession?.sessionId,
        });
        const blocked = directFailureFromReadiness(readiness);
        if (blocked) return blocked;

        const assetSessionSequence =
          get().sessions.filter(
            (item) =>
              item.recordKind ===
                "DYNAMIC_SGDG_MANAGED_SESSION" &&
              item.assetId === command.draft.assetId,
          ).length + 1;
        const session = buildSgdgManagedSession(
          command,
          reference,
          assetSessionSequence,
        );
        if (
          getCompatibilitySessionById(session.sessionId) ||
          get().sessions.some(
            (item) => item.sessionId === session.sessionId,
          )
        )
          return directSessionFailure(
            "SESSION_ID_COLLISION",
            "Session ID xác định bị trùng với Session hiện có.",
          );

        const finalReference = useAssetReadinessStore
          .getState()
          .getReferenceByAssetId(command.draft.assetId);
        const finalActiveSession = get().sessions.find(
          (item) =>
            item.assetId === command.draft.assetId &&
            !["CLOSED", "CANCELLED", "REJECTED"].includes(
              item.lifecycleStatus,
            ),
        );
        if (
          !finalReference ||
          finalReference.referenceId !== reference.referenceId ||
          finalReference.assetVersion !== reference.assetVersion
        )
          return directSessionFailure(
            "ASSET_REFERENCE_STALE",
            "Asset reference không còn hiện hành tại thời điểm cam kết.",
          );
        const finalReadiness = evaluateSgdgManagedDraftReadiness({
          draft: command.draft,
          reference: finalReference,
          currentAssetVersion: getCurrentAssetVersion(
            command.draft.assetId,
          ),
          activeSessionId: finalActiveSession?.sessionId,
        });
        const finalBlocked = directFailureFromReadiness(finalReadiness);
        if (finalBlocked) return finalBlocked;

        set((state) => ({
          sessions: [...state.sessions, session],
        }));
        return { ok: true, session, created: true };
      },
      getSessionById: (sessionId) =>
        get().sessions.find((session) => session.sessionId === sessionId) ??
        getCompatibilitySessionById(sessionId),
      getSessions: () => getAuctionSessionReadModel(get().sessions),
      getSessionByOpeningRequest: (
        requestId,
        acceptedRequestVersion,
      ) =>
        findDynamicLink(
          get().sessions,
          requestId,
          acceptedRequestVersion,
        ) ??
        getCompatibilityLinkedSession(requestId, acceptedRequestVersion),
      resetDeterministicSessionState: () => set({ sessions: [] }),
    }),
    {
      name: "sgdg-auction-sessions-v1",
      version: 2,
      partialize: (state) => ({ sessions: state.sessions }),
      migrate: (persisted, version) => {
        if (version === 1 || version === 2) return persisted;
        return { sessions: [] };
      },
      merge: (persisted, current) => {
        const candidate =
          typeof persisted === "object" && persisted !== null
            ? Reflect.get(persisted, "sessions")
            : undefined;
        return {
          ...current,
          sessions: sanitizePersistedAuctionSessions(candidate),
        };
      },
    },
  ),
);
