export type ActorRole =
  "CUSTOMER" | "ADMIN" | "CUSTOMER_SUPPORT" | "CONTENT_STAFF" | "FINANCE";
export type AuctionStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "PUBLISHED"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "LIVE"
  | "PAUSED"
  | "CLOSED"
  | "RESULT_PENDING"
  | "COMPLETED"
  | "CANCELLED";
export type RegistrationStatus =
  | "NOT_STARTED"
  | "KYC_REQUIRED"
  | "DOCUMENT_PENDING"
  | "RULE_ACCEPTANCE_PENDING"
  | "DEPOSIT_PENDING"
  | "UNDER_REVIEW"
  | "ELIGIBLE"
  | "REJECTED";
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "OUTBID";
export type AutoBidStatus =
  "OFF" | "ACTIVE" | "PAUSED" | "LIMIT_REACHED" | "DISABLED_BY_SESSION";
export type PaymentState =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "RECONCILING"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";
export type HandoverState =
  | "NOT_READY"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CUSTOMER_CONFIRMED"
  | "COMPLETED"
  | "DISPUTED";
export interface AuctionSummary {
  id: string;
  code: string;
  assetName: string;
  status: AuctionStatus;
  currentPrice: number;
  minimumIncrement: number;
  participantCount: number;
  watcherCount: number;
  acceptedBidCount: number;
  heatScore: number;
  endsAt: string;
}
export type FinancePackageScenario =
  | "draft"
  | "submitted"
  | "correction-requested"
  | "resubmitted"
  | "accepted"
  | "rejected"
  | "superseded"
  | "error";
export type FinancePackageStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CORRECTION_REQUESTED"
  | "RESUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "SUPERSEDED";
export interface FinancePackageValidationItem {
  id: string;
  label: string;
  status: "PASS" | "WARNING" | "FAIL";
  description?: string;
  relatedReference?: string;
}
export interface FinancePackageVersion {
  packageId: string;
  packageGroupId: string;
  version: number;
  status: FinancePackageStatus;
  purpose: string;
  resultReference: string;
  candidateReference: string;
  auctionCode: string;
  amount: number;
  currency: "VND";
  validationItems: FinancePackageValidationItem[];
  payloadSummary: Array<{ label: string; value: string }>;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  decisionReason?: string;
  supersedesVersion?: number;
  acceptedEffective: boolean;
}
export type AuditObjectType =
  | "opening-request"
  | "auction-session"
  | "approval-package"
  | "live-session"
  | "result"
  | "candidate-attempt"
  | "handover"
  | "remediation"
  | "finance-package";
export interface AuditProjectionEvent {
  eventId: string;
  objectType: AuditObjectType;
  objectId: string;
  action: string;
  actorRole: string;
  actorDisplay: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  occurredAt: string;
  correlationId: string;
  source: string;
  relatedRoute?: string;
  metadata?: Array<{ label: string; value: string }>;
}
export type ReportsScenario =
  "default" | "no-data" | "loading" | "error" | "stale-projection";
export interface ReportKPI {
  id: string;
  label: string;
  value: number | string;
  description: string;
  authority: "NON_AUTHORITATIVE";
}
export interface ReportSeriesItem {
  id: string;
  label: string;
  value: number;
  description: string;
}
export interface ReportsProjectionFixture {
  scenario: ReportsScenario;
  periodLabel: string;
  generatedAt: string;
  projectionAsOf: string;
  stale: boolean;
  kpis: ReportKPI[];
  auctionFunnel: ReportSeriesItem[];
  lifecycleDistribution: ReportSeriesItem[];
  publicationDistribution: ReportSeriesItem[];
  candidateOutcomes: ReportSeriesItem[];
  paymentSummary: ReportSeriesItem[];
  handoverSummary: ReportSeriesItem[];
  disclosure: string;
}
