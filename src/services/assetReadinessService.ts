import type { ActorRole } from "../types/domain";
import {
  getApprovedAuctionAssets,
  type ApprovedAuctionAssetFixture,
  type AuctionAssetApprovalStatus,
  type AuctionAssetAvailability,
} from "./mock/operationsService";

export type AssetReadinessScenario =
  | "ready"
  | "asset-unapproved"
  | "asset-unavailable"
  | "asset-restricted"
  | "asset-held"
  | "duplicate-active-session"
  | "stale-asset-version";

export interface AssetReadinessReference {
  readonly referenceId: string;
  readonly sourceDomain: "PRODUCT_ASSET";
  readonly assetId: string;
  readonly assetDisplayName: string;
  readonly assetVersion: number;
  readonly approvalStatus: AuctionAssetApprovalStatus;
  readonly availabilityStatus: AuctionAssetAvailability;
  readonly restrictionStatus?: string;
  readonly holdStatus?: string;
  readonly activeSessionReference?: string;
  readonly observedAt: string;
  readonly refreshedAt?: string;
}

export interface SgdgManagedSessionDraft {
  assetId: string;
  title: string;
  purpose: string;
  region: string;
  ownerId: string;
}

export interface ReadinessFinding {
  code:
    | "MISSING_DRAFT_FIELD"
    | "INVALID_DRAFT_FIELD"
    | "MISSING_ASSET_REFERENCE"
    | "ASSET_REFERENCE_STALE"
    | "ASSET_NOT_APPROVED"
    | "ASSET_UNAVAILABLE"
    | "ASSET_RESTRICTED"
    | "ASSET_ON_HOLD"
    | "ACTIVE_SESSION_CONFLICT"
    | "MISSING_SOURCE_FACT";
  message: string;
  owner: "CONTENT_STAFF" | "PRODUCT_ASSET" | "AUCTION_SYSTEM";
  severity: "ERROR" | "WARNING";
  field?: keyof SgdgManagedSessionDraft;
  correctableInCurrentWorkspace: boolean;
  existingSessionId?: string;
}

export interface SgdgManagedDraftReadinessResult {
  ready: boolean;
  evaluatedAssetVersion?: number;
  findings: ReadinessFinding[];
}

const referenceObservedAt = "2026-07-26T07:00:00.000Z";
const referenceRefreshedAt = "2026-07-26T07:05:00.000Z";

const canonicalAsset = () => getApprovedAuctionAssets()[0];

export const getSelectableAuctionAssets = (): ApprovedAuctionAssetFixture[] => [
  { ...canonicalAsset() },
];

const sourceAssetForScenario = (
  scenario: AssetReadinessScenario,
): ApprovedAuctionAssetFixture => {
  const base = canonicalAsset();
  if (scenario === "asset-unapproved")
    return { ...base, approvalStatus: "PENDING_REVIEW" };
  if (scenario === "asset-unavailable")
    return { ...base, availability: "UNAVAILABLE" };
  if (scenario === "asset-restricted")
    return getApprovedAuctionAssets("asset-restricted")[0];
  if (scenario === "asset-held")
    return getApprovedAuctionAssets("asset-held")[0];
  if (scenario === "duplicate-active-session")
    return getApprovedAuctionAssets("duplicate-active-session")[0];
  return base;
};

const statusSuffix = (scenario: AssetReadinessScenario) =>
  scenario
    .replace(/^asset-/, "")
    .replace("duplicate-active-session", "active")
    .replace("stale-asset-version", "stale")
    .toUpperCase();

const referenceFromAsset = (
  asset: ApprovedAuctionAssetFixture,
  scenario: AssetReadinessScenario,
  refreshed = false,
): AssetReadinessReference => {
  const stale = scenario === "stale-asset-version" && !refreshed;
  const assetVersion = stale
    ? Math.max(1, asset.currentVersion - 1)
    : asset.currentVersion;
  const effectiveScenario =
    refreshed && scenario === "stale-asset-version" ? "ready" : scenario;
  return Object.freeze({
    referenceId: `ARR-${asset.assetId}-V${assetVersion}-${statusSuffix(effectiveScenario)}`,
    sourceDomain: "PRODUCT_ASSET",
    assetId: asset.assetId,
    assetDisplayName: asset.assetName,
    assetVersion,
    approvalStatus: asset.approvalStatus,
    availabilityStatus: asset.availability,
    restrictionStatus: asset.restrictionReason,
    holdStatus: asset.holdReference,
    activeSessionReference: asset.activeSessionId,
    observedAt: stale
      ? "2026-07-26T06:00:00.000Z"
      : referenceObservedAt,
    refreshedAt: refreshed ? referenceRefreshedAt : undefined,
  });
};

export const getAssetReadinessReference = (
  assetId: string,
  scenario: AssetReadinessScenario = "ready",
) => {
  const asset = sourceAssetForScenario(scenario);
  if (asset.assetId !== assetId) return undefined;
  return referenceFromAsset(asset, scenario);
};

export const getCurrentAssetVersion = (assetId: string) => {
  const asset = canonicalAsset();
  return asset.assetId === assetId ? asset.currentVersion : undefined;
};

export const getRefreshedAssetReadinessReference = (
  assetId: string,
  scenario: AssetReadinessScenario = "ready",
) => {
  const asset = sourceAssetForScenario(scenario);
  if (asset.assetId !== assetId) return undefined;
  return referenceFromAsset(asset, scenario, true);
};

export const canRequestAssetReadiness = (actorRole: ActorRole) =>
  actorRole === "CONTENT_STAFF";

const draftFindings = (
  draft: SgdgManagedSessionDraft,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  const required: Array<
    [keyof SgdgManagedSessionDraft, string]
  > = [
    ["assetId", "Chọn một Asset reference hiện có."],
    ["title", "Nhập tiêu đề Session."],
    ["purpose", "Nhập mục đích đấu giá."],
    ["region", "Nhập khu vực vận hành."],
    ["ownerId", "Chọn owner nội bộ."],
  ];
  required.forEach(([field, message]) => {
    if (!draft[field].trim())
      findings.push({
        code: "MISSING_DRAFT_FIELD",
        message,
        owner: "CONTENT_STAFF",
        severity: "ERROR",
        field,
        correctableInCurrentWorkspace: true,
      });
  });
  if (
    draft.assetId.trim() &&
    !/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(draft.assetId.trim())
  )
    findings.push({
      code: "INVALID_DRAFT_FIELD",
      message: "Asset reference không đúng cấu trúc.",
      owner: "CONTENT_STAFF",
      severity: "ERROR",
      field: "assetId",
      correctableInCurrentWorkspace: true,
    });
  if (
    draft.ownerId.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.ownerId.trim())
  )
    findings.push({
      code: "INVALID_DRAFT_FIELD",
      message: "Owner nội bộ phải là định danh email hợp lệ.",
      owner: "CONTENT_STAFF",
      severity: "ERROR",
      field: "ownerId",
      correctableInCurrentWorkspace: true,
    });
  return findings;
};

export const evaluateSgdgManagedDraftReadiness = ({
  draft,
  reference,
  currentAssetVersion,
  activeSessionId,
}: {
  draft: SgdgManagedSessionDraft;
  reference?: AssetReadinessReference;
  currentAssetVersion?: number;
  activeSessionId?: string;
}): SgdgManagedDraftReadinessResult => {
  const findings = draftFindings(draft);
  if (!reference) {
    findings.push({
      code: "MISSING_ASSET_REFERENCE",
      message: "Chưa có Asset readiness reference để đánh giá.",
      owner: "PRODUCT_ASSET",
      severity: "ERROR",
      field: "assetId",
      correctableInCurrentWorkspace: false,
    });
    return { ready: false, findings };
  }
  if (
    reference.assetId !== draft.assetId ||
    currentAssetVersion === undefined
  )
    findings.push({
      code: "MISSING_SOURCE_FACT",
      message: "Asset reference không khớp hoặc thiếu phiên bản nguồn.",
      owner: "PRODUCT_ASSET",
      severity: "ERROR",
      field: "assetId",
      correctableInCurrentWorkspace: false,
    });
  else if (reference.assetVersion !== currentAssetVersion)
    findings.push({
      code: "ASSET_REFERENCE_STALE",
      message: `Tham chiếu đang ở v${reference.assetVersion}; nguồn hiện tại là v${currentAssetVersion}.`,
      owner: "PRODUCT_ASSET",
      severity: "ERROR",
      field: "assetId",
      correctableInCurrentWorkspace: false,
    });
  if (reference.approvalStatus !== "APPROVED")
    findings.push({
      code: "ASSET_NOT_APPROVED",
      message: `Asset approval đang là ${reference.approvalStatus}.`,
      owner: "PRODUCT_ASSET",
      severity: "ERROR",
      correctableInCurrentWorkspace: false,
    });
  if (reference.availabilityStatus !== "AVAILABLE") {
    const held = reference.availabilityStatus === "HELD";
    const restricted = reference.availabilityStatus === "RESTRICTED";
    findings.push({
      code: held
        ? "ASSET_ON_HOLD"
        : restricted
          ? "ASSET_RESTRICTED"
          : reference.availabilityStatus ===
              "COMMITTED_TO_ACTIVE_SESSION"
            ? "ACTIVE_SESSION_CONFLICT"
            : "ASSET_UNAVAILABLE",
      message: held
        ? `Asset đang hold: ${reference.holdStatus ?? "không có tham chiếu"}.`
        : restricted
          ? `Asset bị hạn chế: ${reference.restrictionStatus ?? "không có lý do"}.`
          : reference.activeSessionReference
            ? `Asset đang thuộc Session ${reference.activeSessionReference}.`
            : `Asset availability đang là ${reference.availabilityStatus}.`,
      owner:
        reference.availabilityStatus === "COMMITTED_TO_ACTIVE_SESSION"
          ? "AUCTION_SYSTEM"
          : "PRODUCT_ASSET",
      severity: "ERROR",
      correctableInCurrentWorkspace: false,
      existingSessionId: reference.activeSessionReference,
    });
  }
  if (
    activeSessionId &&
    !findings.some(
      (finding) =>
        finding.code === "ACTIVE_SESSION_CONFLICT" &&
        finding.existingSessionId === activeSessionId,
    )
  )
    findings.push({
      code: "ACTIVE_SESSION_CONFLICT",
      message: `Asset đã thuộc dynamic Session ${activeSessionId}.`,
      owner: "AUCTION_SYSTEM",
      severity: "ERROR",
      correctableInCurrentWorkspace: false,
      existingSessionId: activeSessionId,
    });
  return {
    ready: !findings.some((finding) => finding.severity === "ERROR"),
    evaluatedAssetVersion: reference.assetVersion,
    findings,
  };
};
