import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";

export type RegistrationLifecycleStatus = "REGISTERED" | "WITHDRAWN";
export type EligibilityProjection =
  | "PENDING"
  | "MANUAL_REVIEW"
  | "ELIGIBLE"
  | "REJECTED"
  | "REVOKED";
export type EligibilityReviewStatus =
  | "PENDING"
  | "EVIDENCE_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export interface WorkflowHistory {
  at: string;
  actor: string;
  action: string;
  reason?: string;
}

export interface RegistrationWorkflowRecord {
  registrationId: string;
  auctionId: string;
  customerId: string;
  lifecycle: RegistrationLifecycleStatus;
  eligibility: EligibilityProjection;
  depositReferenceStatus: "READY" | "UNRESOLVED";
  withdrawalDeadline: string;
  activeAuthoritativeBid: boolean;
  version: number;
  updatedAt: string;
  history: WorkflowHistory[];
}

export interface EligibilityReviewCase {
  reviewId: string;
  registrationId: string;
  customerId: string;
  auctionId: string;
  kycReference: string;
  restrictionReference: string;
  financeReference: string;
  ruleVersion: string;
  failedChecks: string[];
  evidence: string[];
  status: EligibilityReviewStatus;
  version: number;
  updatedAt: string;
  history: WorkflowHistory[];
}

type Result<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "STALE"
        | "IMMUTABLE"
        | "BLOCKED"
        | "REASON_REQUIRED";
    };

interface WorkflowState {
  registrations: RegistrationWorkflowRecord[];
  reviews: EligibilityReviewCase[];
  withdraw: (
    registrationId: string,
    actor: ActorRole,
    expectedVersion: number,
  ) => Result<RegistrationWorkflowRecord>;
  decideReview: (
    reviewId: string,
    actor: ActorRole,
    expectedVersion: number,
    action: "APPROVE" | "REJECT" | "REQUEST_EVIDENCE",
    reason: string,
  ) => Result<EligibilityReviewCase>;
  resetForTests: () => void;
}

const now = "2026-07-26T02:00:00.000Z";
const demoNow = new Date(now).getTime();
const seedRegistrations: RegistrationWorkflowRecord[] = [
  {
    registrationId: "REG-PATEK-1048",
    auctionId: "patek-nautilus",
    customerId: "CUS-NMA-001",
    lifecycle: "REGISTERED",
    eligibility: "ELIGIBLE",
    depositReferenceStatus: "READY",
    withdrawalDeadline: "2026-07-28T10:00:00.000Z",
    activeAuthoritativeBid: false,
    version: 1,
    updatedAt: now,
    history: [{ at: now, actor: "SYSTEM", action: "REGISTRATION_ACCEPTED" }],
  },
  {
    registrationId: "REG-ROLEX-1048",
    auctionId: "rolex-126610lv",
    customerId: "CUS-NMA-001",
    lifecycle: "REGISTERED",
    eligibility: "ELIGIBLE",
    depositReferenceStatus: "READY",
    withdrawalDeadline: "2026-07-28T10:00:00.000Z",
    activeAuthoritativeBid: false,
    version: 1,
    updatedAt: now,
    history: [{ at: now, actor: "SYSTEM", action: "REGISTRATION_ACCEPTED" }],
  },
  {
    registrationId: "REG-PATEK-REVIEW-2049",
    auctionId: "patek-nautilus",
    customerId: "CUS-REVIEW-002",
    lifecycle: "REGISTERED",
    eligibility: "MANUAL_REVIEW",
    depositReferenceStatus: "READY",
    withdrawalDeadline: "2026-07-28T10:00:00.000Z",
    activeAuthoritativeBid: false,
    version: 1,
    updatedAt: now,
    history: [{ at: now, actor: "SYSTEM", action: "MANUAL_REVIEW_CREATED" }],
  },
];
const seedReviews: EligibilityReviewCase[] = [
  {
    reviewId: "ELR-2026-001",
    registrationId: "REG-PATEK-REVIEW-2049",
    customerId: "CUS-REVIEW-002",
    auctionId: "patek-nautilus",
    kycReference: "KYC-2817",
    restrictionReference: "RST-NONE-1048",
    financeReference: "FIN-6830",
    ruleVersion: "QD-2026.07",
    failedChecks: ["KYC address evidence requires manual confirmation"],
    evidence: ["KYC snapshot 2026-07-26", "Deposit reference FIN-6830"],
    status: "PENDING",
    version: 1,
    updatedAt: now,
    history: [{ at: now, actor: "SYSTEM", action: "REVIEW_CREATED" }],
  },
];

export const useEligibilityWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      registrations: seedRegistrations,
      reviews: seedReviews,
      withdraw: (registrationId, actor, expectedVersion) => {
        const record = get().registrations.find(
          (item) => item.registrationId === registrationId,
        );
        if (!record) return { ok: false, reason: "NOT_FOUND" };
        if (actor !== "CUSTOMER") return { ok: false, reason: "FORBIDDEN" };
        if (record.version !== expectedVersion)
          return { ok: false, reason: "STALE" };
        if (record.lifecycle !== "REGISTERED")
          return { ok: false, reason: "IMMUTABLE" };
        if (
          record.activeAuthoritativeBid ||
          record.depositReferenceStatus === "UNRESOLVED" ||
          new Date(record.withdrawalDeadline).getTime() <= demoNow
        )
          return { ok: false, reason: "BLOCKED" };
        const timestamp = new Date().toISOString();
        const next: RegistrationWorkflowRecord = {
          ...record,
          lifecycle: "WITHDRAWN",
          version: record.version + 1,
          updatedAt: timestamp,
          history: [
            ...record.history,
            { at: timestamp, actor: "CUSTOMER", action: "WITHDRAWN" },
          ],
        };
        set((state) => ({
          registrations: state.registrations.map((item) =>
            item.registrationId === registrationId ? next : item,
          ),
        }));
        return { ok: true, value: next };
      },
      decideReview: (reviewId, actor, expectedVersion, action, reason) => {
        const review = get().reviews.find((item) => item.reviewId === reviewId);
        if (!review) return { ok: false, reason: "NOT_FOUND" };
        if (actor !== "ADMIN") return { ok: false, reason: "FORBIDDEN" };
        if (review.version !== expectedVersion)
          return { ok: false, reason: "STALE" };
        if (review.status === "APPROVED" || review.status === "REJECTED")
          return { ok: false, reason: "IMMUTABLE" };
        if (!reason.trim()) return { ok: false, reason: "REASON_REQUIRED" };
        const timestamp = new Date().toISOString();
        const status: EligibilityReviewStatus =
          action === "APPROVE"
            ? "APPROVED"
            : action === "REJECT"
              ? "REJECTED"
              : "EVIDENCE_REQUESTED";
        const next = {
          ...review,
          status,
          version: review.version + 1,
          updatedAt: timestamp,
          history: [
            ...review.history,
            { at: timestamp, actor: "ADMIN", action, reason: reason.trim() },
          ],
        };
        set((state) => ({
          reviews: state.reviews.map((item) =>
            item.reviewId === reviewId ? next : item,
          ),
          registrations: state.registrations.map((item) =>
            item.registrationId === review.registrationId
              ? {
                  ...item,
                  eligibility:
                    action === "APPROVE"
                      ? "ELIGIBLE"
                      : action === "REJECT"
                        ? "REJECTED"
                        : "MANUAL_REVIEW",
                  version: item.version + 1,
                  updatedAt: timestamp,
                  history: [
                    ...item.history,
                    {
                      at: timestamp,
                      actor: "ADMIN",
                      action: `ELIGIBILITY_${action}`,
                      reason: reason.trim(),
                    },
                  ],
                }
              : item,
          ),
        }));
        return { ok: true, value: next };
      },
      resetForTests: () =>
        set({ registrations: seedRegistrations, reviews: seedReviews }),
    }),
    {
      name: "sgdg-eligibility-workflow-v1",
      version: 2,
      partialize: (state) => ({
        registrations: state.registrations,
        reviews: state.reviews,
      }),
    },
  ),
);

export function canEnterAuction(record?: RegistrationWorkflowRecord) {
  return Boolean(
    record &&
      record.lifecycle === "REGISTERED" &&
      record.eligibility === "ELIGIBLE" &&
      record.depositReferenceStatus === "READY",
  );
}
