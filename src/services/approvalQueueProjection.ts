import type {
  AccessRequest,
  ConfigurationItem,
} from "../store/administrationStore";
import type { CmsContent } from "../store/cmsStore";
import type { EligibilityReviewCase } from "../store/eligibilityWorkflowStore";
import type { FinanceOverrideRequest } from "../store/financeOverrideStore";
import type { CustomerOpeningRequest } from "../store/openingRequestStore";
import type { DisputeCase } from "../store/supportStore";

export type ApprovalQueueStatus =
  | "PENDING"
  | "RETURNED"
  | "APPROVED"
  | "REJECTED"
  | "AWAITING_DOMAIN"
  | "COMPLETED"
  | "FAILED";

export interface ApprovalQueueItem {
  id: string;
  sourceDomain:
    | "ACCESS"
    | "CONTENT"
    | "FINANCE"
    | "CUSTOMER"
    | "AUCTION"
    | "SUPPORT"
    | "CONFIGURATION";
  title: string;
  summary: string;
  requester: string;
  status: ApprovalQueueStatus;
  risk: "LOW" | "MEDIUM" | "HIGH";
  submittedAt: string;
  detailRoute: string;
}

interface ProjectionSources {
  accessRequests: AccessRequest[];
  contents: CmsContent[];
  financeOverrides: FinanceOverrideRequest[];
  eligibilityReviews: EligibilityReviewCase[];
  openingRequests: CustomerOpeningRequest[];
  disputes: DisputeCase[];
  configurations: ConfigurationItem[];
}

export function buildApprovalQueue(
  sources: ProjectionSources,
): ApprovalQueueItem[] {
  const access: ApprovalQueueItem[] = sources.accessRequests.map((item) => ({
    id: item.id,
    sourceDomain: "ACCESS",
    title: `Yêu cầu cấp quyền ${item.requestedRole}`,
    summary: `${item.targetId} · ${item.scope}`,
    requester: item.requester,
    status:
      item.status === "PENDING_REVIEW"
        ? "PENDING"
        : item.status === "RETURNED"
          ? "RETURNED"
          : item.status,
    risk: item.risk,
    submittedAt: item.submittedAt,
    detailRoute: `/admin/access-requests/${item.id}`,
  }));

  const content: ApprovalQueueItem[] = sources.contents
    .filter((item) =>
      [
        "PENDING_REVIEW",
        "CHANGES_REQUESTED",
        "APPROVED",
        "SCHEDULED",
        "PUBLISHED",
      ].includes(item.status),
    )
    .map((item) => ({
      id: item.id,
      sourceDomain: "CONTENT",
      title: item.title,
      summary: `${item.type} · phiên bản ${item.version}`,
      requester: item.author,
      status:
        item.status === "PENDING_REVIEW"
          ? "PENDING"
          : item.status === "CHANGES_REQUESTED"
            ? "RETURNED"
            : item.status === "PUBLISHED"
              ? "COMPLETED"
              : item.status === "APPROVED"
                ? "AWAITING_DOMAIN"
                : "APPROVED",
      risk: item.type === "POLICY" ? "HIGH" : "MEDIUM",
      submittedAt: item.updatedAt,
      detailRoute: `/governance/content-approvals/${item.id}`,
    }));

  const finance: ApprovalQueueItem[] = sources.financeOverrides.map((item) => ({
    id: item.overrideId,
    sourceDomain: "FINANCE",
    title: "Ngoại lệ tài chính có kiểm soát",
    summary: `${item.packageId} · ${item.requestedAction}`,
    requester: item.requesterId,
    status:
      item.status === "PENDING"
        ? "PENDING"
        : item.status,
    risk: "HIGH",
    submittedAt: item.requestedAt,
    detailRoute: `/governance/finance-overrides/${item.overrideId}`,
  }));

  const eligibility: ApprovalQueueItem[] = sources.eligibilityReviews.map(
    (item) => ({
      id: item.reviewId,
      sourceDomain: "CUSTOMER",
      title: "Ngoại lệ điều kiện tham gia",
      summary: `${item.registrationId} · ${item.failedChecks.join(", ")}`,
      requester: item.customerId,
      status:
        item.status === "PENDING"
          ? "PENDING"
          : item.status === "EVIDENCE_REQUESTED"
            ? "RETURNED"
            : item.status,
      risk: "HIGH",
      submittedAt: item.updatedAt,
      detailRoute: `/governance/eligibility-reviews/${item.reviewId}`,
    }),
  );

  const auction: ApprovalQueueItem[] = sources.openingRequests
    .filter((item) =>
      [
        "GOVERNANCE_REVIEW",
        "ACCEPTED_FOR_DRAFT",
        "REJECTED",
        "RETURNED_FOR_CORRECTION",
      ].includes(item.status),
    )
    .map((item) => ({
      id: item.requestId,
      sourceDomain: "AUCTION",
      title: item.title,
      summary: `${item.assetReference} · yêu cầu mở phiên`,
      requester: item.ownerId,
      status:
        item.status === "GOVERNANCE_REVIEW"
          ? "PENDING"
          : item.status === "RETURNED_FOR_CORRECTION"
            ? "RETURNED"
            : item.status === "ACCEPTED_FOR_DRAFT"
              ? "APPROVED"
              : "REJECTED",
      risk: "HIGH",
      submittedAt: item.submittedAt ?? item.updatedAt,
      detailRoute: `/governance/opening-requests/${item.requestId}`,
    }));

  const support: ApprovalQueueItem[] = sources.disputes
    .filter((item) => item.retentionHold)
    .map((item) => ({
      id: `RH-${item.id}`,
      sourceDomain: "SUPPORT",
      title: "Yêu cầu bảo toàn bằng chứng",
      summary: `${item.id} · ${item.retentionHold!.reason}`,
      requester: item.assignee,
      status:
        item.retentionHold!.status === "PENDING_ADMIN_APPROVAL"
          ? "PENDING"
          : item.retentionHold!.status === "ACTIVE"
            ? "APPROVED"
            : "REJECTED",
      risk: "HIGH",
      submittedAt: item.retentionHold!.createdAt,
      detailRoute: "/governance/retention-holds",
    }));

  const configuration: ApprovalQueueItem[] = sources.configurations
    .filter((item) => !["DRAFT", "ACTIVE"].includes(item.status))
    .map((item) => ({
      id: item.id,
      sourceDomain: "CONFIGURATION",
      title: item.name,
      summary: `${item.category} · ${item.scope} · v${item.version}`,
      requester: item.maker,
      status:
        item.status === "PENDING_APPROVAL"
          ? "PENDING"
          : item.status === "RETURNED"
            ? "RETURNED"
            : item.status === "REJECTED"
              ? "REJECTED"
          : item.status === "SCHEDULED"
            ? "AWAITING_DOMAIN"
            : item.status === "SUPERSEDED" || item.status === "INACTIVE"
              ? "COMPLETED"
              : "APPROVED",
      risk: item.category === "Workflow" ? "HIGH" : "MEDIUM",
      submittedAt: item.effectiveAt,
      detailRoute: `/admin/configurations?source=${item.id}`,
    }));

  const rank: Record<ApprovalQueueStatus, number> = {
    PENDING: 0,
    RETURNED: 1,
    AWAITING_DOMAIN: 2,
    FAILED: 3,
    APPROVED: 4,
    REJECTED: 5,
    COMPLETED: 6,
  };
  return [
    ...access,
    ...content,
    ...finance,
    ...eligibility,
    ...auction,
    ...support,
    ...configuration,
  ].sort((left, right) => rank[left.status] - rank[right.status]);
}
