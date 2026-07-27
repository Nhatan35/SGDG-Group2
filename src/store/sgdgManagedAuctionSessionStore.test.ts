import { beforeEach, describe, expect, it } from "vitest";
import {
  auctionSession,
  directSgdgSession,
  getApprovalPackages,
} from "../services/mock/operationsService";
import type { SgdgManagedSessionDraft } from "../services/assetReadinessService";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "./openingRequestStore";
import { useAssetReadinessStore } from "./assetReadinessStore";
import {
  getAuctionSessionReadModel,
  sanitizePersistedAuctionSessions,
  sgdgManagedAuctionCodeFor,
  sgdgManagedSessionIdFor,
  useAuctionSessionStore,
} from "./auctionSessionStore";

const assetId = "AST-OMEGA-SPD-001";
const readyDraft: SgdgManagedSessionDraft = {
  assetId,
  title: "Omega Speedmaster — Phiên SGDG tháng 8",
  purpose: "Đấu giá tài sản đã có Product reference",
  region: "Hà Nội",
  ownerId: CONTENT_STAFF_ACTOR_ID,
};

function requestReference(
  scenario:
    | "ready"
    | "asset-unapproved"
    | "asset-unavailable"
    | "asset-restricted"
    | "asset-held"
    | "duplicate-active-session"
    | "stale-asset-version" = "ready",
) {
  const result = useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: `managed-reference-${scenario}`,
      scenario,
    });
  if (!result.ok) throw new Error(result.message);
  return result.reference;
}

function creationCommand(
  reference: ReturnType<typeof requestReference>,
  commandId = "CREATE_SGDG_SESSION:test",
  draft = readyDraft,
) {
  return {
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF" as const,
    commandId,
    draft,
    assetReadinessReferenceId: reference.referenceId,
    expectedAssetVersion: reference.assetVersion,
    ownerId: CONTENT_STAFF_ACTOR_ID,
  };
}

function acceptCustomerRequest() {
  const draft = useOpeningRequestStore
    .getState()
    .records.find(
      (record) =>
        record.ownerId === CURRENT_CUSTOMER_ID &&
        record.status === "DRAFT",
    )!;
  const submitted = useOpeningRequestStore
    .getState()
    .submitOpeningRequest({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "cross-branch-submit",
      fields: {
        title: "Đấu giá bộ sưu tập đồng hồ",
        assetReference: "AST-CUS-WATCH-001",
        purpose: "Đề nghị SGDG chuẩn bị phiên",
        proposedStartPrice: 250_000_000,
        customerNotes: "",
        declarationAccepted: true,
      },
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const reviewing = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "cross-branch-review",
  });
  if (!reviewing.ok) throw new Error(reviewing.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewing.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.data.version,
      commandId: "cross-branch-accept",
      reason: "Hồ sơ hợp lệ cho bước chuẩn bị bản nháp.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  return accepted.data;
}

describe("SGDG-managed Session command", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
  });

  it("uses a deterministic per-Asset sequence that can represent later history", () => {
    expect(sgdgManagedSessionIdFor(assetId, 1)).not.toBe(
      sgdgManagedSessionIdFor(assetId, 2),
    );
    expect(sgdgManagedAuctionCodeFor(assetId, 1)).not.toBe(
      sgdgManagedAuctionCodeFor(assetId, 2),
    );
  });

  it("creates one persisted DIRECT_SGDG / SGDG_MANAGED DRAFT", () => {
    const reference = requestReference();
    const result = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(creationCommand(reference));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.session).toMatchObject({
      sessionId: sgdgManagedSessionIdFor(assetId, 1),
      auctionCode: sgdgManagedAuctionCodeFor(assetId, 1),
      creationSource: "DIRECT_SGDG",
      managementMode: "SGDG_MANAGED",
      assetId,
      assetReadinessReferenceId: reference.referenceId,
      evaluatedAssetVersion: 3,
      assetSessionSequence: 1,
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
      currentVersion: 1,
      blockers: [],
    });
    expect(result.session).not.toHaveProperty("openingRequestId");
    expect(result.session).not.toHaveProperty("approvalPackageId");
    expect(result.session).not.toHaveProperty("approvedVersion");
    expect(result.session).not.toHaveProperty("scheduleVersion");
    expect(result.session).not.toHaveProperty("publishedAt");
    expect(result.session).not.toHaveProperty("registrationState");
    expect(
      getApprovalPackages().some(
        (item) => item.sessionId === result.session.sessionId,
      ),
    ).toBe(false);
    expect(
      useAuctionSessionStore
        .getState()
        .getSessionById(result.session.sessionId),
    ).toBe(result.session);
  });

  it.each([
    ["CUSTOMER", "customer@sgdg.demo"],
    ["ADMIN", "admin@sgdg.demo"],
    ["FINANCE", "finance@sgdg.demo"],
    ["CUSTOMER_SUPPORT", "support@sgdg.demo"],
  ] as const)("rejects unauthorized %s creation", (actorRole, actorId) => {
    const reference = requestReference();
    const result = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession({
        ...creationCommand(reference, `managed-${actorRole}`),
        actorRole,
        actorId,
        ownerId: actorId,
        draft: { ...readyDraft, ownerId: actorId },
      });
    expect(result).toMatchObject({
      ok: false,
      code: "ACCESS_DENIED",
    });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
  });

  it("rejects incomplete and structurally invalid Draft fields", () => {
    const reference = requestReference();
    const result = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, "invalid-draft", {
          ...readyDraft,
          title: "",
          region: "",
          ownerId: "invalid-owner",
        }),
      );
    expect(result).toMatchObject({
      ok: false,
      code: "ACCESS_DENIED",
    });
    const contentOwnedInvalid = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, "invalid-content-draft", {
          ...readyDraft,
          title: "",
          region: "",
        }),
      );
    expect(contentOwnedInvalid).toMatchObject({
      ok: false,
      code: "INVALID_DRAFT",
      fieldErrors: expect.objectContaining({
        title: expect.any(String),
        region: expect.any(String),
      }),
    });
  });

  it.each([
    ["asset-unapproved", "ASSET_NOT_APPROVED"],
    ["asset-unavailable", "ASSET_UNAVAILABLE"],
    ["asset-restricted", "ASSET_RESTRICTED"],
    ["asset-held", "ASSET_ON_HOLD"],
    ["duplicate-active-session", "ACTIVE_SESSION_CONFLICT"],
    ["stale-asset-version", "ASSET_REFERENCE_STALE"],
  ] as const)("blocks creation for %s", (scenario, code) => {
    const reference = requestReference(scenario);
    const result = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, `blocked-${scenario}`),
      );
    expect(result).toMatchObject({ ok: false, code });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
  });

  it("is idempotent for the same command and rejects another command for the committed intent", () => {
    const reference = requestReference();
    const command = creationCommand(reference, "same-managed-command");
    const first = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(command);
    const repeated = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(command);
    expect(first.ok).toBe(true);
    expect(repeated.ok).toBe(true);
    if (!first.ok || !repeated.ok) return;
    expect(repeated.created).toBe(false);
    expect(repeated.session.sessionId).toBe(first.session.sessionId);
    const another = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, "different-managed-command"),
      );
    expect(another).toMatchObject({
      ok: false,
      code: "ALREADY_CREATED",
      existingSessionId: first.session.sessionId,
    });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
  });

  it("enforces a dynamic active-Asset conflict for a different intent", () => {
    const reference = requestReference();
    const created = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, "active-first"),
      );
    expect(created.ok).toBe(true);
    const conflict = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(
          reference,
          "active-second",
          { ...readyDraft, title: "Một Session intent khác" },
        ),
      );
    expect(conflict).toMatchObject({
      ok: false,
      code: "ACTIVE_SESSION_CONFLICT",
    });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
  });

  it("keeps both creation branches distinct in one read model", () => {
    const accepted = acceptCustomerRequest();
    const linked = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        requestId: accepted.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedRequestVersion: accepted.version,
        commandId: "cross-branch-linked",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      });
    expect(linked.ok).toBe(true);
    const reference = requestReference();
    const managed = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, "cross-branch-managed"),
      );
    expect(managed.ok).toBe(true);
    if (!linked.ok || !managed.ok) return;
    const readModel = getAuctionSessionReadModel(
      useAuctionSessionStore.getState().sessions,
    );
    expect(
      readModel.map((session) => session.sessionId),
    ).toEqual(
      expect.arrayContaining([
        linked.session.sessionId,
        managed.session.sessionId,
        auctionSession.sessionId,
      ]),
    );
    expect(linked.session).toHaveProperty(
      "openingRequestId",
      accepted.requestId,
    );
    expect(managed.session).not.toHaveProperty("openingRequestId");
  });

  it("preserves fixtures and rejects malformed mixed persisted data", () => {
    const omegaBefore = structuredClone(directSgdgSession);
    const royalBefore = structuredClone(auctionSession);
    const reference = requestReference();
    const created = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(creationCommand(reference));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(directSgdgSession).toEqual(omegaBefore);
    expect(auctionSession).toEqual(royalBefore);
    expect(
      sanitizePersistedAuctionSessions([
        created.session,
        { ...created.session, publicationStatus: "PUBLISHED" },
        { ...created.session, openingRequestId: "ORQ-UNSAFE-001" },
      ]),
    ).toEqual([created.session]);
  });

  it("preserves the active-Asset conflict after Session rehydration", async () => {
    const reference = requestReference();
    const created = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(reference, "persist-active-first"),
      );
    expect(created.ok).toBe(true);
    const persisted = localStorage.getItem("sgdg-auction-sessions-v1");
    expect(persisted).not.toBeNull();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    localStorage.setItem("sgdg-auction-sessions-v1", persisted!);
    await useAuctionSessionStore.persist.rehydrate();
    const conflict = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession(
        creationCommand(
          reference,
          "persist-active-second",
          { ...readyDraft, title: "Intent mới sau reload" },
        ),
      );
    expect(conflict).toMatchObject({
      ok: false,
      code: "ACTIVE_SESSION_CONFLICT",
    });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
  });

  it("migrates a valid Phase 2A v1 persisted record into schema v2", async () => {
    const accepted = acceptCustomerRequest();
    const linked = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        requestId: accepted.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedRequestVersion: accepted.version,
        commandId: "migration-linked",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      });
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    localStorage.setItem(
      "sgdg-auction-sessions-v1",
      JSON.stringify({
        state: { sessions: [linked.session] },
        version: 1,
      }),
    );
    useAuctionSessionStore.setState({ sessions: [] });
    localStorage.setItem(
      "sgdg-auction-sessions-v1",
      JSON.stringify({
        state: { sessions: [linked.session] },
        version: 1,
      }),
    );
    await useAuctionSessionStore.persist.rehydrate();
    expect(useAuctionSessionStore.getState().sessions).toEqual([
      linked.session,
    ]);
  });
});
