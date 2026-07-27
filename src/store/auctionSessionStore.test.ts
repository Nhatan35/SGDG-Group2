import { beforeEach, describe, expect, it } from "vitest";
import {
  auctionSession,
  getApprovalPackages,
} from "../services/mock/operationsService";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  type CustomerOpeningRequestStatus,
  useOpeningRequestStore,
} from "./openingRequestStore";
import {
  getAuctionSessionReadModel,
  linkedAuctionCodeFor,
  linkedSessionIdFor,
  sanitizePersistedAuctionSessions,
  useAuctionSessionStore,
} from "./auctionSessionStore";

const validFields = {
  title: "Đấu giá đồng hồ sưu tầm",
  assetReference: "AST-CUS-WATCH-001",
  purpose: "Đề nghị SGDG tiếp nhận và tổ chức đấu giá",
  proposedStartPrice: 250_000_000,
  customerNotes: "Hồ sơ tham chiếu đã sẵn sàng.",
  declarationAccepted: true,
};

function acceptedRequest() {
  const draft = useOpeningRequestStore
    .getState()
    .records.find(
      (record) =>
        record.ownerId === CURRENT_CUSTOMER_ID && record.status === "DRAFT",
    )!;
  const submitted = useOpeningRequestStore
    .getState()
    .submitOpeningRequest({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "session-test-submit",
      fields: validFields,
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const reviewing = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "session-test-start",
  });
  if (!reviewing.ok) throw new Error(reviewing.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewing.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.data.version,
      commandId: "session-test-accept",
      reason: "Hồ sơ hợp lệ để tiếp nhận cho bước chuẩn bị bản nháp.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  return accepted.data;
}

function commandFor(
  request: ReturnType<typeof acceptedRequest>,
  commandId = "CREATE_LINKED_SESSION:test",
) {
  return {
    requestId: request.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF" as const,
    expectedRequestVersion: request.version,
    commandId,
    ownerId: CONTENT_STAFF_ACTOR_ID,
  };
}

describe("persisted linked Auction Session command", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
  });

  it("creates exactly one DRAFT Session from ACCEPTED_FOR_DRAFT", () => {
    const request = acceptedRequest();
    const requestVersionBefore = request.version;
    const result = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.session).toMatchObject({
      sessionId: linkedSessionIdFor(request.requestId, request.version),
      auctionCode: linkedAuctionCodeFor(request.requestId, request.version),
      creationSource: "OPENING_REQUEST",
      managementMode: "CUSTOMER_REQUESTED",
      openingRequestId: request.requestId,
      openingRequestVersion: request.version,
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
      currentVersion: 1,
      blockers: [],
    });
    expect(result.session).not.toHaveProperty("approvedVersion");
    expect(result.session).not.toHaveProperty("approvalPackageId");
    expect(
      useOpeningRequestStore
        .getState()
        .records.find((item) => item.requestId === request.requestId)?.version,
    ).toBe(requestVersionBefore);
    expect(
      getApprovalPackages().some(
        (item) => item.sessionId === result.session.sessionId,
      ),
    ).toBe(false);
  });

  it.each([
    ["CUSTOMER", CURRENT_CUSTOMER_ID],
    ["ADMIN", "admin@sgdg.demo"],
    ["FINANCE", "finance@sgdg.demo"],
    ["CUSTOMER_SUPPORT", "support@sgdg.demo"],
  ] as const)("rejects unauthorized %s creation", (actorRole, actorId) => {
    const request = acceptedRequest();
    const result = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        ...commandFor(request, `unauthorized-${actorRole}`),
        actorRole,
        actorId,
        ownerId: actorId,
      });
    expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
  });

  it.each([
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED_FOR_CORRECTION",
    "GOVERNANCE_REVIEW",
    "REJECTED",
  ] satisfies CustomerOpeningRequestStatus[])(
    "rejects source status %s",
    (status) => {
      const accepted = acceptedRequest();
      useOpeningRequestStore.setState((state) => ({
        records: state.records.map((record) =>
          record.requestId === accepted.requestId
            ? { ...record, status }
            : record,
        ),
      }));
      const result = useAuctionSessionStore
        .getState()
        .createLinkedSessionFromAcceptedRequest(
          commandFor(
            { ...accepted, status },
            `invalid-status-${status}`,
          ),
        );
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST_STATUS",
      });
      expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
    },
  );

  it("rejects missing and stale requests", () => {
    const missing = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        requestId: "ORQ-MISSING-001",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedRequestVersion: 1,
        commandId: "missing-request",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      });
    expect(missing).toMatchObject({
      ok: false,
      code: "REQUEST_NOT_FOUND",
    });

    const request = acceptedRequest();
    const stale = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        ...commandFor(request, "stale-request"),
        expectedRequestVersion: request.version - 1,
      });
    expect(stale).toMatchObject({
      ok: false,
      code: "STALE_REQUEST_VERSION",
    });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
  });

  it("returns the same Session for a repeated committed command", () => {
    const request = acceptedRequest();
    const command = commandFor(request, "same-command");
    const first = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(command);
    const repeated = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(command);
    expect(first.ok).toBe(true);
    expect(repeated.ok).toBe(true);
    if (!first.ok || !repeated.ok) return;
    expect(first.created).toBe(true);
    expect(repeated.created).toBe(false);
    expect(repeated.session.sessionId).toBe(first.session.sessionId);
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
  });

  it("returns ALREADY_LINKED for a different command on the same accepted version", () => {
    const request = acceptedRequest();
    const first = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request, "first"));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request, "second"));
    expect(second).toMatchObject({
      ok: false,
      code: "ALREADY_LINKED",
      existingSessionId: first.session.sessionId,
    });
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
  });

  it("loads the persisted Session by ID and Opening Request lineage", () => {
    const request = acceptedRequest();
    const result = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      useAuctionSessionStore
        .getState()
        .getSessionById(result.session.sessionId),
    ).toBe(result.session);
    expect(
      useAuctionSessionStore
        .getState()
        .getSessionByOpeningRequest(request.requestId, request.version),
    ).toBe(result.session);
    expect(result.session.history[0]).toMatchObject({
      action: "LINKED_SESSION_CREATED",
      requestId: request.requestId,
      acceptedRequestVersion: request.version,
      sessionId: result.session.sessionId,
      visibility: "STAFF_ONLY",
    });
  });

  it("safely validates persisted, invalid, duplicate, and stale records", () => {
    const request = acceptedRequest();
    const created = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const valid = sanitizePersistedAuctionSessions(
      [created.session],
      useOpeningRequestStore.getState().records,
    );
    expect(valid).toEqual([created.session]);
    expect(
      sanitizePersistedAuctionSessions(
        [{ bad: true }],
        useOpeningRequestStore.getState().records,
      ),
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionSessions(
        [created.session, { ...created.session }],
        useOpeningRequestStore.getState().records,
      ),
    ).toEqual([created.session]);
    expect(
      sanitizePersistedAuctionSessions(
        [{ ...created.session, openingRequestId: "ORQ-STALE-001" }],
        useOpeningRequestStore.getState().records,
      ),
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionSessions(
        [{ ...created.session, lifecycleStatus: "PENDING_APPROVAL" }],
        useOpeningRequestStore.getState().records,
      ),
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionSessions(
        [{ ...created.session, approvalPackageId: "APR-UNSAFE-001" }],
        useOpeningRequestStore.getState().records,
      ),
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionSessions(
        [
          {
            ...created.session,
            history: [
              { ...created.session.history[0], actorRole: "ADMIN" },
            ],
          },
        ],
        useOpeningRequestStore.getState().records,
      ),
    ).toEqual([]);
  });

  it("rehydrates valid local persistence and rejects an invalid replacement", async () => {
    const request = acceptedRequest();
    const created = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const validStorage = localStorage.getItem("sgdg-auction-sessions-v1");
    expect(validStorage).not.toBeNull();

    useAuctionSessionStore.getState().resetDeterministicSessionState();
    localStorage.setItem("sgdg-auction-sessions-v1", validStorage!);
    await useAuctionSessionStore.persist.rehydrate();
    expect(useAuctionSessionStore.getState().sessions).toEqual([
      created.session,
    ]);

    localStorage.setItem(
      "sgdg-auction-sessions-v1",
      JSON.stringify({
        state: {
          sessions: [
            { ...created.session, publicationStatus: "PUBLISHED" },
          ],
        },
        version: 1,
      }),
    );
    await useAuctionSessionStore.persist.rehydrate();
    expect(useAuctionSessionStore.getState().sessions).toEqual([]);
  });

  it("keeps compatibility fixtures immutable and collision-safe", () => {
    const fixtureBefore = structuredClone(auctionSession);
    const request = acceptedRequest();
    const created = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(auctionSession).toEqual(fixtureBefore);
    const readModel = getAuctionSessionReadModel([
      created.session,
      { ...created.session },
      { ...created.session, sessionId: auctionSession.sessionId },
    ]);
    expect(
      readModel.filter(
        (session) => session.sessionId === created.session.sessionId,
      ),
    ).toHaveLength(1);
    expect(
      readModel.filter(
        (session) => session.sessionId === auctionSession.sessionId,
      ),
    ).toHaveLength(1);
    expect(
      readModel.find(
        (session) => session.sessionId === auctionSession.sessionId,
      ),
    ).toBe(auctionSession);
    expect(created.session.sessionId).not.toBe(auctionSession.sessionId);
  });

  it("resets dynamic state deterministically without deleting fixtures", () => {
    const request = acceptedRequest();
    useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest(commandFor(request));
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
    expect(
      useAuctionSessionStore
        .getState()
        .getSessionById(auctionSession.sessionId),
    ).toBe(auctionSession);
  });
});
