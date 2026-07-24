import type { ActorRole } from "../../types/domain";

export type StaffRole = "CONTENT_STAFF" | "ADMIN";
export type SessionCreationSource =
  "OPENING_REQUEST" | "DIRECT_SGDG" | "REAUCTION_RECOMMENDATION";
export type AuctionManagementMode = "SGDG_MANAGED" | "CUSTOMER_REQUESTED";
export type AuctionAssetApprovalStatus =
  "APPROVED" | "PENDING_REVIEW" | "REJECTED";
export type AuctionAssetAvailability =
  | "AVAILABLE"
  | "HELD"
  | "RESTRICTED"
  | "COMMITTED_TO_ACTIVE_SESSION"
  | "UNAVAILABLE";
export type OpeningRequestStatus =
  | "UNASSIGNED"
  | "ASSIGNED"
  | "UNDER_REVIEW"
  | "HOLD"
  | "RETURNED"
  | "REJECTED"
  | "ACCEPTED_FOR_DRAFT";
export type SessionLifecycleStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "RETURNED_FOR_UPDATE"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "LIVE"
  | "CLOSED"
  | "CANCELLED";
export type PublicationStatus =
  | "NOT_READY"
  | "NOT_PUBLISHED"
  | "SCHEDULED_FOR_PUBLICATION"
  | "PUBLISHED"
  | "UNPUBLISHED_BY_GOVERNANCE"
  | "RETRYING";
export type ApprovalPackageStatus =
  "DRAFT" | "PENDING" | "CORRECTION_REQUESTED" | "APPROVED" | "REJECTED";

export interface ApprovedAuctionAssetFixture {
  assetId: string;
  assetName: string;
  category: string;
  region: string;
  approvalStatus: AuctionAssetApprovalStatus;
  availability: AuctionAssetAvailability;
  currentVersion: number;
  activeSessionId?: string;
  restrictionReason?: string;
  holdReference?: string;
  source: "Product Management Mock";
}
export interface OpeningRequestFixture {
  requestId: string;
  assetName: string;
  requesterMasked: string;
  status: OpeningRequestStatus;
  assigneeId?: string;
  createdAt: string;
  slaDueAt: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  holdReason?: string;
  currentVersion: number;
}
export interface AuctionSessionFixture {
  sessionId: string;
  auctionCode: string;
  code: string;
  assetId: string;
  assetName: string;
  creationSource: SessionCreationSource;
  managementMode: AuctionManagementMode;
  openingRequestId?: string;
  requestId?: string;
  openingRequestVersion?: number;
  reauctionRecommendationId?: string;
  originalSessionId?: string;
  lifecycleStatus: SessionLifecycleStatus;
  publicationStatus: PublicationStatus;
  ownerId: string;
  creatorId: string;
  currentVersion: number;
  approvedVersion?: number;
  blockers: string[];
  createdAt: string;
  updatedAt: string;
}
export interface ApprovalPackageFixture {
  approvalId: string;
  sessionId: string;
  makerUserId: string;
  checkerUserId?: string;
  status: ApprovalPackageStatus;
  submittedVersion: number;
  readinessPassed: boolean;
  blockers: string[];
  risks: string[];
  decisionReason?: string;
}

export const openingRequest: OpeningRequestFixture = {
  requestId: "ORQ-ROYAL-OAK-001",
  assetName: "Audemars Piguet Royal Oak 15500ST",
  requesterMasked: "Mi***A",
  status: "ACCEPTED_FOR_DRAFT",
  assigneeId: "content.staff@mock.local",
  createdAt: "2026-07-20T02:00:00.000Z",
  slaDueAt: "2026-07-21T09:00:00.000Z",
  riskLevel: "MEDIUM",
  currentVersion: 1,
};
export const auctionSession: AuctionSessionFixture = {
  sessionId: "royal-oak-15500st-draft",
  auctionCode: "SGD-260725-003",
  code: "SGD-260725-003",
  assetId: "AST-ROYAL-OAK-001",
  assetName: openingRequest.assetName,
  creationSource: "OPENING_REQUEST",
  managementMode: "CUSTOMER_REQUESTED",
  openingRequestId: openingRequest.requestId,
  requestId: openingRequest.requestId,
  openingRequestVersion: 1,
  lifecycleStatus: "PENDING_APPROVAL",
  publicationStatus: "NOT_READY",
  ownerId: "content.staff@mock.local",
  creatorId: "content.staff@mock.local",
  currentVersion: 1,
  blockers: [],
  createdAt: "2026-07-20T03:00:00.000Z",
  updatedAt: "2026-07-20T03:00:00.000Z",
};
export const directSgdgSession: AuctionSessionFixture = {
  sessionId: "sgdg-omega-speedmaster-draft-01",
  auctionCode: "SGD-260801-004",
  code: "SGD-260801-004",
  assetId: "AST-OMEGA-SPD-001",
  assetName: "Omega Speedmaster Moonwatch Professional",
  creationSource: "DIRECT_SGDG",
  managementMode: "SGDG_MANAGED",
  lifecycleStatus: "DRAFT",
  publicationStatus: "NOT_READY",
  ownerId: "content.staff@mock.local",
  creatorId: "content.staff@mock.local",
  currentVersion: 1,
  blockers: [],
  createdAt: "2026-07-21T03:00:00.000Z",
  updatedAt: "2026-07-21T03:00:00.000Z",
};
export const approvalPackage: ApprovalPackageFixture = {
  approvalId: "APR-ROYAL-OAK-001",
  sessionId: auctionSession.sessionId,
  makerUserId: "content.staff@mock.local",
  checkerUserId: "admin.checker@mock.local",
  status: "PENDING",
  submittedVersion: 1,
  readinessPassed: true,
  blockers: [],
  risks: ["Giá khởi điểm là trường governed", "Lịch publication cần phê duyệt"],
};
export const omegaApprovalPackage: ApprovalPackageFixture = {
  approvalId: "APR-OMEGA-SGDG-001",
  sessionId: directSgdgSession.sessionId,
  makerUserId: "content.staff@mock.local",
  checkerUserId: "admin.checker@mock.local",
  status: "PENDING",
  submittedVersion: 1,
  readinessPassed: true,
  blockers: [],
  risks: ["Direct SGDG session", "Schedule proposal pending approval"],
};
const omega: ApprovedAuctionAssetFixture = {
  assetId: "AST-OMEGA-SPD-001",
  assetName: "Omega Speedmaster Moonwatch Professional",
  category: "Đồng hồ",
  region: "Hà Nội",
  approvalStatus: "APPROVED",
  availability: "AVAILABLE",
  currentVersion: 3,
  source: "Product Management Mock",
};
const blockedAssets: ApprovedAuctionAssetFixture[] = [
  { ...omega, availability: "HELD", holdReference: "HOLD-OMEGA-001" },
  {
    ...omega,
    availability: "RESTRICTED",
    restrictionReason: "Tài sản đang bị hạn chế xử lý.",
  },
  {
    ...omega,
    availability: "COMMITTED_TO_ACTIVE_SESSION",
    activeSessionId: "sgdg-omega-speedmaster-draft-01",
  },
  { ...omega, currentVersion: 2 },
];

export const canCreateDirectSgdgSession = (role: ActorRole) =>
  role === "CONTENT_STAFF";
export const canUseAssetForNewSession = (asset: ApprovedAuctionAssetFixture) =>
  asset.approvalStatus === "APPROVED" &&
  asset.availability === "AVAILABLE" &&
  !asset.activeSessionId;
export const getAssetCreationBlockReason = (
  asset: ApprovedAuctionAssetFixture,
) =>
  canUseAssetForNewSession(asset)
    ? undefined
    : asset.activeSessionId
      ? `Tài sản đã thuộc phiên ${asset.activeSessionId}.`
      : asset.restrictionReason ||
        asset.holdReference ||
        "Tài sản chưa sẵn sàng để tạo phiên.";
export const validateDirectSessionDraft = (
  input: { title: string; purpose: string; region: string; owner: string },
  asset: ApprovedAuctionAssetFixture,
  role: ActorRole,
) => ({
  title: !input.title.trim(),
  purpose: !input.purpose.trim(),
  region: !input.region.trim(),
  owner: !input.owner.trim(),
  authority: !canCreateDirectSgdgSession(role),
  asset: !canUseAssetForNewSession(asset),
});
export const canApprovePackage = (
  user: string,
  item: ApprovalPackageFixture,
  role: ActorRole,
) =>
  role === "ADMIN" &&
  user !== item.makerUserId &&
  item.status === "PENDING" &&
  item.readinessPassed &&
  item.blockers.length === 0;
export const getOperationsDashboardFixture = () => ({
  kpis: [
    ["1", "Yêu cầu cần xử lý"],
    ["2", "Session bản nháp"],
    ["1", "Approval chờ quyết định"],
    ["0", "Cảnh báo Live"],
  ],
  activity: [
    "Opening request Royal Oak đã được chấp nhận tạo bản nháp",
    "Session Royal Oak đang ở bản nháp",
    "Approval package đang chờ checker",
  ],
});
export const getOpeningRequests = () => [openingRequest];
export const getOpeningRequestById = (id: string, scenario?: string) =>
  id === openingRequest.requestId
    ? {
        ...openingRequest,
        status:
          scenario === "under-review" ? "UNDER_REVIEW" : openingRequest.status,
      }
    : undefined;
export const getApprovedAuctionAssets = (scenario?: string) =>
  scenario === "asset-held"
    ? [blockedAssets[0]]
    : scenario === "asset-restricted"
      ? [blockedAssets[1]]
      : scenario === "duplicate-active-session"
        ? [blockedAssets[2]]
        : scenario === "stale-asset-version"
          ? [blockedAssets[3]]
          : [omega];
export const getApprovedAuctionAssetById = (id: string) =>
  id === omega.assetId ? omega : undefined;
export const getAuctionSessions = () => [auctionSession];
export const getAuctionSessionById = (id: string) =>
  id === auctionSession.sessionId
    ? auctionSession
    : id === directSgdgSession.sessionId
      ? directSgdgSession
      : undefined;
export const getLinkedSessionForOpeningRequest = (
  id: string,
  version: number,
) =>
  id === openingRequest.requestId && version === 1 ? auctionSession : undefined;
export const getApprovalPackages = () => [approvalPackage];
export const getApprovalPackageById = (id: string) =>
  id === approvalPackage.approvalId
    ? approvalPackage
    : id === omegaApprovalPackage.approvalId
      ? omegaApprovalPackage
      : undefined;
export const getDirectSgdgSessionCreationFixture = (scenario?: string) => ({
  asset: getApprovedAuctionAssets(scenario)[0],
  session: directSgdgSession,
});
export type PreparationApprovalScenario =
  | "request-under-review"
  | "request-returned"
  | "request-hold"
  | "request-rejected"
  | "request-accepted"
  | "session-draft"
  | "session-returned"
  | "session-pending-approval"
  | "session-approved"
  | "session-scheduled"
  | "session-published";
const scenarioOf = (value?: string): PreparationApprovalScenario =>
  (value as PreparationApprovalScenario) || "session-pending-approval";
export function getOpeningRequestWorkspaceFixture(
  id: string,
  scenario?: string,
) {
  if (id !== openingRequest.requestId) return undefined;
  const state = scenarioOf(scenario);
  const requestStatus =
    state === "request-under-review"
      ? "UNDER_REVIEW"
      : state === "request-returned"
        ? "RETURNED"
        : state === "request-hold"
          ? "HOLD"
          : state === "request-rejected"
            ? "REJECTED"
            : "ACCEPTED_FOR_DRAFT";
  const linked =
    requestStatus === "ACCEPTED_FOR_DRAFT"
      ? {
          ...auctionSession,
          lifecycleStatus:
            state === "request-accepted" || state === "session-draft"
              ? "DRAFT"
              : auctionSession.lifecycleStatus,
        }
      : undefined;
  return {
    request: { ...openingRequest, status: requestStatus },
    linkedSession: linked,
    approvalPackage: undefined,
    evidence: ["Hồ sơ tài sản đã đính kèm", "Tham chiếu định danh đã được che"],
    notes: ["Yêu cầu được mở để review.", "Cần xác nhận mục đích đấu giá."],
    audit: ["Review opened", "Decision prepared"],
  };
}
export function getAuctionSessionWorkspaceFixture(
  id: string,
  scenario?: string,
) {
  const base = getAuctionSessionById(id);
  if (!base) return undefined;
  const state = scenarioOf(scenario);
  const lifecycle =
    state === "session-draft" || state === "request-accepted"
      ? "DRAFT"
      : state === "session-returned"
        ? "RETURNED_FOR_UPDATE"
        : state === "session-approved"
          ? "APPROVED"
          : state === "session-scheduled" || state === "session-published"
            ? "SCHEDULED"
            : state === "session-pending-approval"
              ? "PENDING_APPROVAL"
              : base.lifecycleStatus;
  const publication =
    state === "session-published"
      ? "PUBLISHED"
      : state === "session-scheduled"
        ? "SCHEDULED_FOR_PUBLICATION"
        : lifecycle === "APPROVED"
          ? "NOT_PUBLISHED"
          : base.publicationStatus;
  return {
    session: {
      ...base,
      lifecycleStatus: lifecycle,
      publicationStatus: publication,
    },
    readiness: [
      {
        id: "asset",
        label: "Asset reference current",
        passed: true,
        source: "Product Management Mock",
      },
      {
        id: "rules",
        label: "Rule proposal complete",
        passed: true,
        source: "Auction Management Mock",
      },
      {
        id: "schedule",
        label: "Schedule proposal complete",
        passed: true,
        source: "Auction Management Mock",
      },
    ],
    approvalPackage:
      lifecycle === "PENDING_APPROVAL" || lifecycle === "APPROVED"
        ? {
            ...approvalPackage,
            status: lifecycle === "APPROVED" ? "APPROVED" : "PENDING",
          }
        : undefined,
  };
}
export function getAuctionRuleFixture(sessionId: string, scenario?: string) {
  if (!getAuctionSessionById(sessionId)) return undefined;
  const approved = scenario === "approved-snapshot";
  return {
    ruleVersionId: `RULE-${sessionId}-V1`,
    version: 1,
    status: approved ? "APPROVED_SNAPSHOT" : "DRAFT_PROPOSAL",
    startingPrice: 2900000000,
    minimumIncrement: 25000000,
    depositPolicyReference: "DEP-STD-01",
    eligibilityPolicyReference: "ELG-STD-01",
    extensionPolicyReference: "EXT-02",
    fallbackPolicyReference: "FB-READONLY",
    immutableSnapshot: approved,
    sensitiveChange: scenario === "sensitive-change-pending",
  };
}
export function getAuctionScheduleFixture(
  sessionId: string,
  scenario?: string,
) {
  if (!getAuctionSessionById(sessionId)) return undefined;
  return {
    sessionId,
    scenario: scenario || "draft",
    timezone: "Asia/Ho_Chi_Minh",
    registrationOpenAt: "2026-07-23T02:00:00.000Z",
    registrationCloseAt: "2026-07-24T13:00:00.000Z",
    eligibilityCheckpointAt: "2026-07-24T15:00:00.000Z",
    biddingStartAt: "2026-07-25T03:00:00.000Z",
    biddingEndAt: "2026-07-25T04:00:00.000Z",
  };
}
export function getApprovalQueueFixture(scenario?: string) {
  const state = scenarioOf(scenario);
  return state === "session-draft" || state === "request-under-review"
    ? []
    : [
        {
          ...approvalPackage,
          status: state === "session-approved" ? "APPROVED" : "PENDING",
        },
      ];
}
export function getApprovalPackageFixture(
  id: string,
  scenario?: string,
  currentUserId = "admin.checker@mock.local",
  role: StaffRole = "ADMIN",
) {
  const base = getApprovalPackageById(id);
  if (!base) return undefined;
  const state = scenario || "ready";
  const status: ApprovalPackageStatus =
    state === "approved"
      ? "APPROVED"
      : state === "correction"
        ? "CORRECTION_REQUESTED"
        : state === "rejected"
          ? "REJECTED"
          : "PENDING";
  const item: ApprovalPackageFixture = {
    ...base,
    status,
    readinessPassed: state !== "missing-info",
    blockers: state === "missing-info" ? ["Thiếu schedule proposal"] : [],
  };
  return {
    item,
    currentUserId,
    role,
    makerConflict: currentUserId === item.makerUserId,
    canApprove:
      canApprovePackage(currentUserId, item, role) && state === "ready",
    stale: state === "stale-version",
  };
}
