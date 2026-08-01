import { beforeEach, describe, expect, it } from "vitest";
import {
  evaluateSgdgManagedDraftReadiness,
  getCurrentAssetVersion,
  type AssetReadinessScenario,
  type SgdgManagedSessionDraft,
} from "../services/assetReadinessService";
import {
  sanitizeAssetReadinessPersistence,
  useAssetReadinessStore,
} from "./assetReadinessStore";

const actorId = "content.staff@mock.local";
const assetId = "AST-OMEGA-SPD-001";
const completeDraft: SgdgManagedSessionDraft = {
  assetId,
  title: "Omega Speedmaster — Phiên SGDG tháng 8",
  purpose: "Đấu giá tài sản đã có Product reference",
  region: "Hà Nội",
  ownerId: actorId,
};

function requestScenario(
  scenario: AssetReadinessScenario,
  commandId = `request-${scenario}`,
) {
  return useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId,
      actorId,
      actorRole: "CONTENT_STAFF",
      commandId,
      scenario,
    });
}

describe("Asset readiness reference boundary", () => {
  beforeEach(() => {
    localStorage.clear();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
  });

  it("allows CONTENT_STAFF to request a current read-only reference", () => {
    const result = requestScenario("ready");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reference).toMatchObject({
      sourceDomain: "PRODUCT_ASSET",
      assetId,
      assetVersion: 3,
      approvalStatus: "APPROVED",
      availabilityStatus: "AVAILABLE",
    });
    expect(Object.isFrozen(result.reference)).toBe(true);
    expect(
      evaluateSgdgManagedDraftReadiness({
        draft: completeDraft,
        reference: result.reference,
        currentAssetVersion: getCurrentAssetVersion(assetId),
      }),
    ).toEqual({
      ready: true,
      evaluatedAssetVersion: 3,
      findings: [],
    });
  });

  it.each([
    ["CUSTOMER", "customer@sgdg.demo"],
    ["ADMIN", "admin@sgdg.demo"],
    ["FINANCE", "finance@sgdg.demo"],
    ["CUSTOMER_SUPPORT", "support@sgdg.demo"],
  ] as const)("rejects %s readiness access", (actorRole, unauthorizedId) => {
    const result = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId,
        actorId: unauthorizedId,
        actorRole,
        commandId: `unauthorized-${actorRole}`,
      });
    expect(result).toMatchObject({
      ok: false,
      code: "ACCESS_DENIED",
    });
    expect(useAssetReadinessStore.getState().references).toHaveLength(0);
  });

  it("returns ASSET_NOT_FOUND for an unknown Asset", () => {
    const result = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId: "AST-MISSING-001",
        actorId,
        actorRole: "CONTENT_STAFF",
        commandId: "missing-asset",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "ASSET_NOT_FOUND",
    });
  });

  it.each([
    ["asset-unapproved", "ASSET_NOT_APPROVED", "PRODUCT_ASSET"],
    ["asset-unavailable", "ASSET_UNAVAILABLE", "PRODUCT_ASSET"],
    ["asset-restricted", "ASSET_RESTRICTED", "PRODUCT_ASSET"],
    ["asset-held", "ASSET_ON_HOLD", "PRODUCT_ASSET"],
    [
      "duplicate-active-session",
      "ACTIVE_SESSION_CONFLICT",
      "AUCTION_SYSTEM",
    ],
  ] as const)(
    "reports owned blocking finding for %s",
    (scenario, code, owner) => {
      const result = requestScenario(scenario);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const readiness = evaluateSgdgManagedDraftReadiness({
        draft: completeDraft,
        reference: result.reference,
        currentAssetVersion: getCurrentAssetVersion(assetId),
      });
      expect(readiness.ready).toBe(false);
      expect(readiness.findings).toContainEqual(
        expect.objectContaining({
          code,
          owner,
          correctableInCurrentWorkspace: false,
        }),
      );
    },
  );

  it("refreshes a stale v2 reference to current v3 and re-evaluates ready", () => {
    const requested = requestScenario("stale-asset-version");
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;
    expect(requested.reference.assetVersion).toBe(2);
    expect(
      evaluateSgdgManagedDraftReadiness({
        draft: completeDraft,
        reference: requested.reference,
        currentAssetVersion: 3,
      }).findings,
    ).toContainEqual(
      expect.objectContaining({ code: "ASSET_REFERENCE_STALE" }),
    );

    const refreshed = useAssetReadinessStore
      .getState()
      .refreshAssetReadinessReference({
        assetId,
        expectedAssetVersion: 2,
        actorId,
        actorRole: "CONTENT_STAFF",
        commandId: "refresh-stale-v2",
        scenario: "stale-asset-version",
      });
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.reference.assetVersion).toBe(3);
    expect(refreshed.reference.refreshedAt).toBeDefined();
    expect(
      evaluateSgdgManagedDraftReadiness({
        draft: completeDraft,
        reference: refreshed.reference,
        currentAssetVersion: 3,
      }).ready,
    ).toBe(true);
  });

  it("refreshes a held reference without changing Product-owned facts", () => {
    const requested = requestScenario("asset-held");
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;
    const refreshed = useAssetReadinessStore
      .getState()
      .refreshAssetReadinessReference({
        assetId,
        expectedAssetVersion: requested.reference.assetVersion,
        actorId,
        actorRole: "CONTENT_STAFF",
        commandId: "refresh-held",
        scenario: "asset-held",
      });
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.reference).toMatchObject({
      availabilityStatus: "HELD",
      holdStatus: "HOLD-OMEGA-001",
    });
  });

  it("identifies Draft-owned missing and invalid fields", () => {
    const requested = requestScenario("ready");
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;
    const readiness = evaluateSgdgManagedDraftReadiness({
      draft: {
        ...completeDraft,
        title: "",
        ownerId: "not-an-email",
      },
      reference: requested.reference,
      currentAssetVersion: 3,
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_DRAFT_FIELD",
          field: "title",
          owner: "CONTENT_STAFF",
        }),
        expect.objectContaining({
          code: "INVALID_DRAFT_FIELD",
          field: "ownerId",
          owner: "CONTENT_STAFF",
        }),
      ]),
    );
  });

  it("handles duplicate commands and malformed persistence safely", () => {
    const first = requestScenario("ready", "same-request");
    const second = requestScenario("ready", "same-request");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(useAssetReadinessStore.getState().references).toHaveLength(1);
    expect(
      sanitizeAssetReadinessPersistence(
        [{ bad: true }],
        [{ bad: true }],
      ),
    ).toEqual({ references: [], history: [] });
  });

  it("persists a refreshed reference across rehydration and rejects invalid storage", async () => {
    const requested = requestScenario("stale-asset-version");
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;
    const refreshed = useAssetReadinessStore
      .getState()
      .refreshAssetReadinessReference({
        assetId,
        expectedAssetVersion: requested.reference.assetVersion,
        actorId,
        actorRole: "CONTENT_STAFF",
        commandId: "persisted-refresh",
        scenario: "stale-asset-version",
      });
    expect(refreshed.ok).toBe(true);
    const persisted = localStorage.getItem("sgdg-asset-readiness-v1");
    expect(persisted).not.toBeNull();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    localStorage.setItem("sgdg-asset-readiness-v1", persisted!);
    await useAssetReadinessStore.persist.rehydrate();
    expect(useAssetReadinessStore.getState().references[0]).toMatchObject({
      assetId,
      assetVersion: 3,
      refreshedAt: expect.any(String),
    });
    expect(useAssetReadinessStore.getState().history).toHaveLength(2);

    localStorage.setItem(
      "sgdg-asset-readiness-v1",
      JSON.stringify({
        state: { references: [{ unsafe: true }], history: [] },
        version: 1,
      }),
    );
    await useAssetReadinessStore.persist.rehydrate();
    expect(useAssetReadinessStore.getState().references).toEqual([]);
  });

  it("resets reference and refresh history deterministically", () => {
    requestScenario("ready");
    expect(useAssetReadinessStore.getState().references).toHaveLength(1);
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    expect(useAssetReadinessStore.getState()).toMatchObject({
      references: [],
      history: [],
    });
  });
});
