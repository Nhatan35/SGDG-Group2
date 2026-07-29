import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";

export type ControlledFinanceAction =
  | "RE_REVIEW_FINANCE_PACKAGE"
  | "ROUTE_TO_REMEDIATION";
export type FinanceOverrideStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED";

export interface FinanceOverrideRequest {
  overrideId: string;
  packageId: string;
  targetReference: string;
  currentAuthoritativeState: "FINAL_WINNER_CONFIRMED";
  requestedAction: ControlledFinanceAction;
  businessReason: string;
  evidenceReferences: string[];
  requesterId: string;
  requestedAt: string;
  expectedVersion: number;
  status: FinanceOverrideStatus;
  version: number;
  reviewerId?: string;
  reviewedAt?: string;
  decisionReason?: string;
  history: Array<{
    at: string;
    actorId: string;
    action: string;
    reason?: string;
  }>;
}

type Result =
  | { ok: true; request: FinanceOverrideRequest }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "SELF_APPROVAL"
        | "STALE"
        | "IMMUTABLE"
        | "INVALID";
    };

interface FinanceOverrideState {
  requests: FinanceOverrideRequest[];
  createRequest: (
    actor: ActorRole,
    requesterId: string,
    input: Pick<
      FinanceOverrideRequest,
      | "packageId"
      | "targetReference"
      | "requestedAction"
      | "businessReason"
      | "evidenceReferences"
      | "expectedVersion"
    >,
  ) => Result;
  decide: (
    overrideId: string,
    actor: ActorRole,
    reviewerId: string,
    expectedVersion: number,
    decision: "APPROVE" | "REJECT",
    reason: string,
  ) => Result;
  startExecution: (
    overrideId: string,
    actor: ActorRole,
    actorId: string,
    expectedVersion: number,
  ) => Result;
  completeExecution: (
    overrideId: string,
    actor: ActorRole,
    actorId: string,
    expectedVersion: number,
    reason: string,
  ) => Result;
  resetForTests: () => void;
}

const seed: FinanceOverrideRequest[] = [
  {
    overrideId: "FOV-2026-001",
    packageId: "FIN-PKG-PATEK-5711R-V2",
    targetReference: "SGD-WIN-•••-5711R",
    currentAuthoritativeState: "FINAL_WINNER_CONFIRMED",
    requestedAction: "ROUTE_TO_REMEDIATION",
    businessReason:
      "Payment reference changed after confirmation; controlled remediation review is required.",
    evidenceReferences: ["PAY-REV-5711R", "AUD-FIN-2026-0718"],
    requesterId: "finance@sgdg.demo",
    requestedAt: "2026-07-26T02:00:00.000Z",
    expectedVersion: 2,
    status: "PENDING",
    version: 1,
    history: [
      {
        at: "2026-07-26T02:00:00.000Z",
        actorId: "finance@sgdg.demo",
        action: "REQUESTED",
      },
    ],
  },
];

export const useFinanceOverrideStore = create<FinanceOverrideState>()(
  persist(
    (set, get) => ({
      requests: seed,
      createRequest: (actor, requesterId, input) => {
        if (actor !== "FINANCE") return { ok: false, reason: "FORBIDDEN" };
        if (input.expectedVersion !== 2)
          return { ok: false, reason: "STALE" };
        if (
          !input.businessReason.trim() ||
          !input.evidenceReferences.length ||
          input.evidenceReferences.some((item) => !item.trim())
        )
          return { ok: false, reason: "INVALID" };
        const at = new Date().toISOString();
        const request: FinanceOverrideRequest = {
          overrideId: `FOV-2026-${String(get().requests.length + 1).padStart(3, "0")}`,
          ...input,
          businessReason: input.businessReason.trim(),
          evidenceReferences: input.evidenceReferences.map((item) => item.trim()),
          currentAuthoritativeState: "FINAL_WINNER_CONFIRMED",
          requesterId,
          requestedAt: at,
          status: "PENDING",
          version: 1,
          history: [{ at, actorId: requesterId, action: "REQUESTED" }],
        };
        set((state) => ({ requests: [...state.requests, request] }));
        return { ok: true, request };
      },
      decide: (
        overrideId,
        actor,
        reviewerId,
        expectedVersion,
        decision,
        reason,
      ) => {
        const request = get().requests.find((item) => item.overrideId === overrideId);
        if (!request) return { ok: false, reason: "NOT_FOUND" };
        if (actor !== "ADMIN") return { ok: false, reason: "FORBIDDEN" };
        if (request.requesterId === reviewerId)
          return { ok: false, reason: "SELF_APPROVAL" };
        if (request.version !== expectedVersion)
          return { ok: false, reason: "STALE" };
        if (request.status !== "PENDING")
          return { ok: false, reason: "IMMUTABLE" };
        if (!reason.trim()) return { ok: false, reason: "INVALID" };
        const at = new Date().toISOString();
        const next: FinanceOverrideRequest = {
          ...request,
          status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          version: request.version + 1,
          reviewerId,
          reviewedAt: at,
          decisionReason: reason.trim(),
          history: [
            ...request.history,
            { at, actorId: reviewerId, action: decision, reason: reason.trim() },
          ],
        };
        set((state) => ({
          requests: state.requests.map((item) =>
            item.overrideId === overrideId ? next : item,
          ),
        }));
        return { ok: true, request: next };
      },
      startExecution: (overrideId, actor, actorId, expectedVersion) => {
        const request = get().requests.find(
          (item) => item.overrideId === overrideId,
        );
        if (!request) return { ok: false, reason: "NOT_FOUND" };
        if (actor !== "FINANCE") return { ok: false, reason: "FORBIDDEN" };
        if (request.version !== expectedVersion)
          return { ok: false, reason: "STALE" };
        if (request.status !== "APPROVED")
          return { ok: false, reason: "IMMUTABLE" };
        const at = new Date().toISOString();
        const next: FinanceOverrideRequest = {
          ...request,
          status: "IN_PROGRESS",
          version: request.version + 1,
          history: [
            ...request.history,
            { at, actorId, action: "EXECUTION_STARTED" },
          ],
        };
        set((state) => ({
          requests: state.requests.map((item) =>
            item.overrideId === overrideId ? next : item,
          ),
        }));
        return { ok: true, request: next };
      },
      completeExecution: (
        overrideId,
        actor,
        actorId,
        expectedVersion,
        reason,
      ) => {
        const request = get().requests.find(
          (item) => item.overrideId === overrideId,
        );
        if (!request) return { ok: false, reason: "NOT_FOUND" };
        if (actor !== "FINANCE") return { ok: false, reason: "FORBIDDEN" };
        if (request.version !== expectedVersion)
          return { ok: false, reason: "STALE" };
        if (request.status !== "IN_PROGRESS")
          return { ok: false, reason: "IMMUTABLE" };
        if (!reason.trim()) return { ok: false, reason: "INVALID" };
        const at = new Date().toISOString();
        const next: FinanceOverrideRequest = {
          ...request,
          status: "COMPLETED",
          version: request.version + 1,
          history: [
            ...request.history,
            {
              at,
              actorId,
              action: "EXECUTION_COMPLETED",
              reason: reason.trim(),
            },
          ],
        };
        set((state) => ({
          requests: state.requests.map((item) =>
            item.overrideId === overrideId ? next : item,
          ),
        }));
        return { ok: true, request: next };
      },
      resetForTests: () => set({ requests: seed }),
    }),
    {
      name: "sgdg-finance-overrides-v1",
      version: 1,
      partialize: (state) => ({ requests: state.requests }),
    },
  ),
);
