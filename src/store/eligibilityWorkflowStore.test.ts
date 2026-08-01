import { beforeEach, describe, expect, it } from "vitest";
import {
  canEnterAuction,
  useEligibilityWorkflowStore,
} from "./eligibilityWorkflowStore";

describe("registration and eligibility workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    useEligibilityWorkflowStore.getState().resetForTests();
  });

  it("keeps registration lifecycle separate from eligibility and blocks entry after withdrawal", () => {
    const record = useEligibilityWorkflowStore
      .getState()
      .registrations.find((item) => item.registrationId === "REG-ROLEX-1048")!;
    expect(canEnterAuction(record)).toBe(true);
    const result = useEligibilityWorkflowStore
      .getState()
      .withdraw(record.registrationId, "CUSTOMER", record.version);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lifecycle).toBe("WITHDRAWN");
    expect(result.value.eligibility).toBe("ELIGIBLE");
    expect(canEnterAuction(result.value)).toBe(false);
  });

  it("enforces customer authority, optimistic version and immutable withdrawal", () => {
    const record = useEligibilityWorkflowStore.getState().registrations[1];
    expect(
      useEligibilityWorkflowStore
        .getState()
        .withdraw(record.registrationId, "ADMIN", record.version),
    ).toEqual({ ok: false, reason: "FORBIDDEN" });
    expect(
      useEligibilityWorkflowStore
        .getState()
        .withdraw(record.registrationId, "CUSTOMER", 99),
    ).toEqual({ ok: false, reason: "STALE" });
  });

  it("allows only admin to decide with a reason and projects the result", () => {
    const review = useEligibilityWorkflowStore.getState().reviews[0];
    expect(
      useEligibilityWorkflowStore
        .getState()
        .decideReview(review.reviewId, "FINANCE", review.version, "APPROVE", "ok"),
    ).toEqual({ ok: false, reason: "FORBIDDEN" });
    expect(
      useEligibilityWorkflowStore
        .getState()
        .decideReview(review.reviewId, "ADMIN", review.version, "APPROVE", ""),
    ).toEqual({ ok: false, reason: "REASON_REQUIRED" });
    const approved = useEligibilityWorkflowStore
      .getState()
      .decideReview(
        review.reviewId,
        "ADMIN",
        review.version,
        "APPROVE",
        "Đã kiểm tra bằng chứng.",
      );
    expect(approved.ok).toBe(true);
    const registration = useEligibilityWorkflowStore
      .getState()
      .registrations.find(
        (item) => item.registrationId === review.registrationId,
      );
    expect(registration?.eligibility).toBe("ELIGIBLE");
    expect(canEnterAuction(registration)).toBe(true);
  });
});
