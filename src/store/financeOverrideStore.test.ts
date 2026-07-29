import { beforeEach, describe, expect, it } from "vitest";
import { canVisitStaffPath } from "../config/staffRoles";
import { useFinanceOverrideStore } from "./financeOverrideStore";

describe("controlled finance override maker-checker", () => {
  beforeEach(() => {
    localStorage.clear();
    useFinanceOverrideStore.getState().resetForTests();
  });

  it("allows Finance to request only a controlled action with evidence", () => {
    expect(
      useFinanceOverrideStore.getState().createRequest(
        "FINANCE",
        "finance@sgdg.demo",
        {
          packageId: "FIN-PKG-PATEK-5711R-V2",
          targetReference: "SGD-WIN-•••-5711R",
          requestedAction: "RE_REVIEW_FINANCE_PACKAGE",
          businessReason: "Evidence hợp lệ nhưng version cũ.",
          evidenceReferences: ["AUD-001"],
          expectedVersion: 1,
        },
      ),
    ).toEqual({ ok: false, reason: "STALE" });
    const invalid = useFinanceOverrideStore.getState().createRequest(
      "FINANCE",
      "finance@sgdg.demo",
      {
        packageId: "FIN-PKG-PATEK-5711R-V2",
        targetReference: "SGD-WIN-•••-5711R",
        requestedAction: "RE_REVIEW_FINANCE_PACKAGE",
        businessReason: "",
        evidenceReferences: [],
        expectedVersion: 2,
      },
    );
    expect(invalid).toEqual({ ok: false, reason: "INVALID" });
    const valid = useFinanceOverrideStore.getState().createRequest(
      "FINANCE",
      "finance@sgdg.demo",
      {
        packageId: "FIN-PKG-PATEK-5711R-V2",
        targetReference: "SGD-WIN-•••-5711R",
        requestedAction: "RE_REVIEW_FINANCE_PACKAGE",
        businessReason: "Cần kiểm tra lại evidence.",
        evidenceReferences: ["AUD-001"],
        expectedVersion: 2,
      },
    );
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect("candidateRank" in valid.request).toBe(false);
    expect("winnerId" in valid.request).toBe(false);
    expect("amount" in valid.request).toBe(false);
  });

  it("enforces ADMIN reviewer, no self approval, version and reason", () => {
    const request = useFinanceOverrideStore.getState().requests[0];
    expect(
      useFinanceOverrideStore
        .getState()
        .decide(request.overrideId, "FINANCE", "finance@sgdg.demo", 1, "APPROVE", "ok"),
    ).toEqual({ ok: false, reason: "FORBIDDEN" });
    expect(
      useFinanceOverrideStore
        .getState()
        .decide(request.overrideId, "ADMIN", request.requesterId, 1, "APPROVE", "ok"),
    ).toEqual({ ok: false, reason: "SELF_APPROVAL" });
    expect(
      useFinanceOverrideStore
        .getState()
        .decide(request.overrideId, "ADMIN", "admin@sgdg.demo", 99, "APPROVE", "ok"),
    ).toEqual({ ok: false, reason: "STALE" });
    expect(
      useFinanceOverrideStore
        .getState()
        .decide(request.overrideId, "ADMIN", "admin@sgdg.demo", 1, "APPROVE", ""),
    ).toEqual({ ok: false, reason: "INVALID" });
  });

  it("records an immutable decision without result mutation capability", () => {
    const request = useFinanceOverrideStore.getState().requests[0];
    const evidence = [...request.evidenceReferences];
    const result = useFinanceOverrideStore
      .getState()
      .decide(
        request.overrideId,
        "ADMIN",
        "admin@sgdg.demo",
        request.version,
        "APPROVE",
        "Chuyển sang remediation có kiểm soát.",
      );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe("APPROVED");
    expect(result.request.evidenceReferences).toEqual(evidence);
    expect(result.request.history.at(-1)?.action).toBe("APPROVE");
    expect(
      useFinanceOverrideStore
        .getState()
        .decide(
          request.overrideId,
          "ADMIN",
          "admin2@sgdg.demo",
          result.request.version,
          "REJECT",
          "Không đổi quyết định.",
        ),
    ).toEqual({ ok: false, reason: "IMMUTABLE" });
  });

  it("hands an approved request back to Finance for execution", () => {
    const request = useFinanceOverrideStore.getState().requests[0];
    const approved = useFinanceOverrideStore
      .getState()
      .decide(
        request.overrideId,
        "ADMIN",
        "admin@sgdg.demo",
        request.version,
        "APPROVE",
        "Đủ điều kiện xử lý.",
      );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const started = useFinanceOverrideStore
      .getState()
      .startExecution(
        request.overrideId,
        "FINANCE",
        "finance@sgdg.demo",
        approved.request.version,
      );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const completed = useFinanceOverrideStore
      .getState()
      .completeExecution(
        request.overrideId,
        "FINANCE",
        "finance@sgdg.demo",
        started.request.version,
        "Đã tạo hồ sơ khắc phục REM-001.",
      );
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.request.status).toBe("COMPLETED");
    expect(completed.request.history.at(-1)?.action).toBe(
      "EXECUTION_COMPLETED",
    );
  });

  it("protects the distinct Finance and ADMIN routes", () => {
    expect(canVisitStaffPath("FINANCE", "/finance/override-requests/new")).toBe(true);
    expect(canVisitStaffPath("ADMIN", "/governance/finance-overrides")).toBe(true);
    expect(canVisitStaffPath("FINANCE", "/governance/finance-overrides")).toBe(false);
  });
});
