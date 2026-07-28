import { beforeEach, describe, expect, it } from "vitest";
import {
  AUCTION_SUMMARY_MAX_LENGTH,
  AUCTION_TITLE_MAX_LENGTH,
  PROTOTYPE_CONTENT_POLICY,
  evaluateAuctionContentCompleteness,
  sanitizePersistedAuctionContentState,
  type AuctionContent,
  useAuctionContentStore,
} from "./auctionContentStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "./openingRequestStore";
import {
  type PersistedLinkedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import { useAssetReadinessStore } from "./assetReadinessStore";

const customerFields = {
  title: "Phiên đấu giá đồng hồ sưu tầm Việt Nam",
  assetReference: "AST-CUS-CONTENT-001",
  purpose: "Giới thiệu bộ sưu tập tới cộng đồng thành viên phù hợp.",
  proposedStartPrice: 240_000_000,
  customerNotes: "Nguồn Customer phải được giữ nguyên.",
  declarationAccepted: true,
};

function createLinkedSession(): PersistedLinkedAuctionSession {
  const draft = useOpeningRequestStore
    .getState()
    .records.find(
      (item) =>
        item.ownerId === CURRENT_CUSTOMER_ID && item.status === "DRAFT",
    )!;
  const submitted = useOpeningRequestStore.getState().submitOpeningRequest({
    requestId: draft.requestId,
    actorId: CURRENT_CUSTOMER_ID,
    actorRole: "CUSTOMER",
    expectedVersion: draft.version,
    commandId: "content-source-submit",
    fields: customerFields,
  });
  if (!submitted.ok) throw new Error(submitted.message);
  const review = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "content-source-review",
  });
  if (!review.ok) throw new Error(review.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: review.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: review.data.version,
      commandId: "content-source-accept",
      reason: "Nguồn hợp lệ để khởi tạo content foundation độc lập.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "content-linked-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

function initialize(
  session = createLinkedSession(),
  commandId = "initialize-content-v1",
) {
  const result = useAuctionContentStore.getState().initializeAuctionContent({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedOpeningRequestVersion: session.openingRequestVersion!,
    commandId,
  });
  if (!result.ok) throw new Error(result.message);
  return result.content;
}

function save(
  content: AuctionContent,
  overrides: Partial<
    Parameters<
      ReturnType<
        typeof useAuctionContentStore.getState
      >["saveAuctionContentDraft"]
    >[0]
  > = {},
) {
  return useAuctionContentStore.getState().saveAuctionContentDraft({
    contentId: content.contentId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedContentVersion: content.contentVersion,
    expectedSessionVersion: content.sessionVersionAtInitialization,
    commandId: `save-content-v${content.contentVersion}`,
    auctionTitle: `${content.workingContent.auctionTitle} — biên tập`,
    auctionSummary: `${content.workingContent.auctionSummary}\nNội dung làm việc.`,
    ...overrides,
  });
}

const clone = <T,>(value: T): T => structuredClone(value);

describe("persisted Dynamic Auction Content foundation", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    useAuctionContentStore.getState().resetDeterministicContentState();
  });

  it("01 allows CONTENT_STAFF to initialize eligible Customer content", () => {
    expect(initialize().contentVersion).toBe(1);
  });

  for (const role of [
    "ADMIN",
    "CUSTOMER",
    "FINANCE",
    "CUSTOMER_SUPPORT",
  ] as const) {
    it(`rejects ${role} initialization`, () => {
      const session = createLinkedSession();
      const result = useAuctionContentStore
        .getState()
        .initializeAuctionContent({
          sessionId: session.sessionId,
          actorId: `${role.toLowerCase()}@mock.local`,
          actorRole: role,
          expectedSessionVersion: 1,
          expectedOpeningRequestVersion: session.openingRequestVersion!,
          commandId: `blocked-init-${role}`,
        });
      expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    });
  }

  it("06 rejects a missing Session", () => {
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: "missing-session",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: 1,
        commandId: "missing-session-content",
      });
    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });

  it("07 rejects fixture Sessions", () => {
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: "royal-oak-15500st-draft",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: 1,
        commandId: "fixture-content",
      });
    expect(result.ok).toBe(false);
  });

  it("08 does not initialize the SGDG branch through Customer mapping", () => {
    const reference = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId: "AST-OMEGA-SPD-001",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "content-direct-reference",
      });
    if (!reference.ok) throw new Error(reference.message);
    const direct = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession({
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "content-direct-session",
        ownerId: CONTENT_STAFF_ACTOR_ID,
        assetReadinessReferenceId: reference.reference.referenceId,
        expectedAssetVersion: reference.reference.assetVersion,
        draft: {
          assetId: reference.reference.assetId,
          title: "Direct SGDG title",
          purpose: "Direct SGDG purpose",
          region: "Hà Nội",
          ownerId: CONTENT_STAFF_ACTOR_ID,
        },
      });
    if (!direct.ok) throw new Error(direct.message);
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: direct.session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: 1,
        commandId: "blocked-direct-content",
      });
    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_DYNAMIC" });
  });

  it("09 rejects a non-DRAFT Session", () => {
    const session = createLinkedSession();
    useAuctionSessionStore.setState({
      sessions: [{ ...session, lifecycleStatus: "PENDING_APPROVAL" }],
    });
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: session.openingRequestVersion!,
        commandId: "non-draft-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_SESSION_STATE",
    });
  });

  it("10 rejects publication other than NOT_READY", () => {
    const session = createLinkedSession();
    useAuctionSessionStore.setState({
      sessions: [{ ...session, publicationStatus: "PUBLISHED" }],
    });
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: session.openingRequestVersion!,
        commandId: "published-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_PUBLICATION_STATE",
    });
  });

  it("11 rejects a missing Opening Request", () => {
    const session = createLinkedSession();
    useOpeningRequestStore.setState({ records: [] });
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: session.openingRequestVersion!,
        commandId: "missing-source-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "OPENING_REQUEST_NOT_FOUND",
    });
  });

  it("12 rejects a non-accepted Opening Request", () => {
    const session = createLinkedSession();
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === session.openingRequestId
          ? { ...record, status: "UNDER_REVIEW" }
          : record,
      ),
    }));
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: session.openingRequestVersion!,
        commandId: "unaccepted-source-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "OPENING_REQUEST_NOT_ACCEPTED",
    });
  });

  it("13 rejects Opening Request lineage mismatch", () => {
    const session = createLinkedSession();
    useAuctionSessionStore.setState({
      sessions: [{ ...session, openingRequestVersion: 999 }],
    });
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: 999,
        commandId: "mismatched-lineage-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "OPENING_REQUEST_LINEAGE_MISMATCH",
    });
  });

  it("14 rejects stale Session version", () => {
    const session = createLinkedSession();
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 99,
        expectedOpeningRequestVersion: session.openingRequestVersion!,
        commandId: "stale-session-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "STALE_SESSION_VERSION",
    });
  });

  it("15 rejects stale expected Opening Request version", () => {
    const session = createLinkedSession();
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: 99,
        commandId: "stale-request-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "STALE_OPENING_REQUEST_VERSION",
    });
  });

  it("16 copies the exact source title", () => {
    expect(initialize().workingContent.auctionTitle).toBe(customerFields.title);
  });

  it("17 copies purpose when present", () => {
    expect(initialize().workingContent.auctionSummary).toBe(
      customerFields.purpose,
    );
  });

  it("18 initializes an empty summary when accepted source purpose is absent", () => {
    const session = createLinkedSession();
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === session.openingRequestId
          ? { ...record, purpose: "" }
          : record,
      ),
    }));
    const content = initialize(session);
    expect(content.workingContent.auctionSummary).toBe("");
    expect(content.status).toBe("DRAFT");
  });

  it("19 freezes source title", () => {
    expect(Object.isFrozen(initialize().sourceLineage)).toBe(true);
  });

  it("20 preserves original source purpose", () => {
    const content = initialize();
    const result = save(content);
    if (!result.ok) throw new Error(result.message);
    expect(result.content.sourceLineage.originalPurpose).toBe(
      customerFields.purpose,
    );
  });

  it("21 edits working title", () => {
    const result = save(initialize(), { auctionTitle: "Tiêu đề mới" });
    expect(result.ok && result.content.workingContent.auctionTitle).toBe(
      "Tiêu đề mới",
    );
  });

  it("22 edits working summary and preserves paragraphs", () => {
    const result = save(initialize(), {
      auctionSummary: "Đoạn một.\r\n\r\nĐoạn hai.",
    });
    expect(result.ok && result.content.workingContent.auctionSummary).toBe(
      "Đoạn một.\n\nĐoạn hai.",
    );
  });

  it("23 leaves the Opening Request unchanged after save", () => {
    const content = initialize();
    const before = clone(
      useOpeningRequestStore
        .getState()
        .records.find(
          (record) =>
            record.requestId === content.sourceLineage.openingRequestId,
        ),
    );
    save(content);
    expect(
      useOpeningRequestStore
        .getState()
        .records.find(
          (record) =>
            record.requestId === content.sourceLineage.openingRequestId,
        ),
    ).toEqual(before);
  });

  it("24 initializes content v1", () => {
    expect(initialize().contentVersion).toBe(1);
  });

  it("25 creates immutable version record v1", () => {
    const content = initialize();
    expect(content.versions[0]).toMatchObject({
      contentVersion: 1,
      versionId: `${content.contentId}-v1`,
    });
    expect(Object.isFrozen(content.versions[0])).toBe(true);
  });

  it("26 makes the same initialize command idempotent", () => {
    const session = createLinkedSession();
    const first = initialize(session, "same-initialize");
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion: session.openingRequestVersion!,
        commandId: "same-initialize",
      });
    expect(result).toMatchObject({ ok: true, created: false });
    expect(result.ok && result.content.contentId).toBe(first.contentId);
    expect(useAuctionContentStore.getState().contents).toHaveLength(1);
  });

  it("27 rejects a different initialize command for the same Session", () => {
    const content = initialize();
    const result = useAuctionContentStore
      .getState()
      .initializeAuctionContent({
        sessionId: content.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedOpeningRequestVersion:
          content.sourceLineage.openingRequestVersion,
        commandId: "different-initialize",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "CONTENT_ALREADY_INITIALIZED",
    });
  });

  it("28 saves an incomplete Draft", () => {
    const result = save(initialize(), {
      auctionTitle: "",
      auctionSummary: "",
    });
    expect(result).toMatchObject({
      ok: true,
      content: { status: "DRAFT" },
    });
  });

  it("29 reports empty title completeness", () => {
    const result = evaluateAuctionContentCompleteness({
      workingContent: { auctionTitle: "", auctionSummary: "Có tóm tắt" },
      contentVersion: 2,
    });
    expect(result.findings.map((item) => item.code)).toContain(
      "AUCTION_TITLE_REQUIRED",
    );
  });

  it("30 reports empty summary completeness", () => {
    const result = evaluateAuctionContentCompleteness({
      workingContent: { auctionTitle: "Có tiêu đề", auctionSummary: "" },
      contentVersion: 2,
    });
    expect(result.findings.map((item) => item.code)).toContain(
      "AUCTION_SUMMARY_REQUIRED",
    );
  });

  it("31 marks valid title and summary COMPLETE", () => {
    expect(initialize()).toMatchObject({
      status: "COMPLETE",
      completeness: { complete: true, findings: [] },
    });
  });

  it("32 enforces title maximum length", () => {
    const result = save(initialize(), {
      auctionTitle: "a".repeat(AUCTION_TITLE_MAX_LENGTH + 1),
    });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("33 enforces summary maximum length", () => {
    const result = save(initialize(), {
      auctionSummary: "a".repeat(AUCTION_SUMMARY_MAX_LENGTH + 1),
    });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("34 rejects unsafe control characters", () => {
    const result = save(initialize(), { auctionTitle: "Unsafe\u0000title" });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("35 preserves Unicode and Vietnamese content", () => {
    const result = save(initialize(), {
      auctionTitle: "Đấu giá nghệ thuật — Nguyễn Gia Trí",
      auctionSummary: "Tóm tắt có dấu và ký tự Unicode ✓",
    });
    expect(result.ok && result.content.workingContent).toEqual({
      auctionTitle: "Đấu giá nghệ thuật — Nguyễn Gia Trí",
      auctionSummary: "Tóm tắt có dấu và ký tự Unicode ✓",
    });
  });

  it("36 increments content version after a meaningful save", () => {
    const result = save(initialize());
    expect(result.ok && result.content.contentVersion).toBe(2);
  });

  it("37 does not increment on no-op save", () => {
    const content = initialize();
    const result = save(content, {
      auctionTitle: content.workingContent.auctionTitle,
      auctionSummary: content.workingContent.auctionSummary,
    });
    expect(result).toMatchObject({
      ok: true,
      changed: false,
      content: { contentVersion: 1 },
    });
  });

  it("38 does not duplicate the same save command", () => {
    const content = initialize();
    const first = save(content, { commandId: "same-save-command" });
    if (!first.ok) throw new Error(first.message);
    const second = save(content, { commandId: "same-save-command" });
    expect(second).toMatchObject({
      ok: true,
      changed: false,
      content: { contentVersion: 2 },
    });
    expect(second.ok && second.content.versions).toHaveLength(2);
  });

  it("39 blocks a stale content version", () => {
    const content = initialize();
    const result = save(content, { expectedContentVersion: 99 });
    expect(result).toMatchObject({
      ok: false,
      code: "STALE_CONTENT_VERSION",
    });
  });

  it("40 blocks a stale Session version during save", () => {
    const content = initialize();
    const result = save(content, { expectedSessionVersion: 99 });
    expect(result).toMatchObject({
      ok: false,
      code: "STALE_SESSION_VERSION",
    });
  });

  for (const [number, key] of [
    [41, "unsupportedField"],
    [42, "sourceLineage"],
    [43, "assetId"],
    [44, "memberTitle"],
    [45, "configurationSnapshotId"],
    [46, "approvalPackageId"],
  ] as const) {
    it(`${number} rejects forbidden mutation field ${key}`, () => {
      const content = initialize();
      const command = {
        contentId: content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF" as const,
        expectedContentVersion: 1,
        expectedSessionVersion: 1,
        commandId: `unsupported-${key}`,
        auctionTitle: "Supported title",
        auctionSummary: "Supported summary",
        [key]: "forbidden",
      };
      const result = useAuctionContentStore
        .getState()
        .saveAuctionContentDraft(command);
      expect(result).toMatchObject({
        ok: false,
        code: "UNSUPPORTED_FIELD",
      });
    });
  }

  it("47 freezes all version records", () => {
    const result = save(initialize());
    if (!result.ok) throw new Error(result.message);
    expect(result.content.versions.every(Object.isFrozen)).toBe(true);
  });

  it("48 leaves the previous content version unchanged", () => {
    const content = initialize();
    const original = clone(content.versions[0]);
    const result = save(content);
    if (!result.ok) throw new Error(result.message);
    expect(result.content.versions[0]).toEqual(original);
  });

  it("49 records exact changed fields in history", () => {
    const content = initialize();
    const result = save(content, {
      auctionTitle: "Only title changed",
      auctionSummary: content.workingContent.auctionSummary,
    });
    if (!result.ok) throw new Error(result.message);
    expect(result.content.history.at(-1)?.changedFields).toEqual([
      "auctionTitle",
    ]);
  });

  it("50 source revalidation preserves working content", () => {
    const saved = save(initialize());
    if (!saved.ok) throw new Error(saved.message);
    const before = clone(saved.content.workingContent);
    const refresh = useAuctionContentStore
      .getState()
      .refreshAuctionContentSourceLineage({
        contentId: saved.content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: 2,
        expectedSessionVersion: 1,
        commandId: "refresh-current-source",
      });
    expect(refresh.ok && refresh.content.workingContent).toEqual(before);
  });

  it("51 marks changed source version STALE", () => {
    const content = initialize();
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === content.sourceLineage.openingRequestId
          ? { ...record, version: record.version + 1 }
          : record,
      ),
    }));
    const refresh = useAuctionContentStore
      .getState()
      .refreshAuctionContentSourceLineage({
        contentId: content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: 1,
        expectedSessionVersion: 1,
        commandId: "refresh-stale-source",
      });
    expect(refresh).toMatchObject({
      ok: true,
      content: { status: "STALE" },
    });
  });

  it("52 stale source refresh never overwrites working content", () => {
    const content = initialize();
    const before = clone(content.workingContent);
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === content.sourceLineage.openingRequestId
          ? { ...record, version: record.version + 1, title: "Changed source" }
          : record,
      ),
    }));
    const refresh = useAuctionContentStore
      .getState()
      .refreshAuctionContentSourceLineage({
        contentId: content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: 1,
        expectedSessionVersion: 1,
        commandId: "refresh-preserve-working",
      });
    expect(refresh.ok && refresh.content.workingContent).toEqual(before);
  });

  it("53 keeps Session version unchanged after content saves", () => {
    const content = initialize();
    save(content);
    expect(
      useAuctionSessionStore
        .getState()
        .sessions.find((item) => item.sessionId === content.sessionId)
        ?.currentVersion,
    ).toBe(1);
  });

  it("54 versions content independently", () => {
    const result = save(initialize());
    expect(result.ok && result.content).toMatchObject({
      contentVersion: 2,
      sessionVersionAtInitialization: 1,
    });
  });

  it("55 rejects malformed persisted aggregate", () => {
    const malformed = clone(initialize()) as unknown as Record<string, unknown>;
    malformed.status = "APPROVED";
    expect(
      sanitizePersistedAuctionContentState({ contents: [malformed] }).contents,
    ).toEqual([]);
  });

  it("56 rejects duplicate content for one Session", () => {
    const content = initialize();
    expect(
      sanitizePersistedAuctionContentState({
        contents: [clone(content), clone(content)],
      }).contents,
    ).toEqual([]);
  });

  it("57 rejects duplicate command IDs", () => {
    const content = initialize();
    const malformed = {
      ...clone(content),
      history: [...content.history, clone(content.history[0])],
    };
    expect(
      sanitizePersistedAuctionContentState({ contents: [malformed] }).contents,
    ).toEqual([]);
  });

  it("58 rejects missing version records", () => {
    const malformed = { ...clone(initialize()), versions: [] };
    expect(
      sanitizePersistedAuctionContentState({ contents: [malformed] }).contents,
    ).toEqual([]);
  });

  it("59 rejects current state/latest-version mismatch", () => {
    const content = initialize();
    const malformed = {
      ...clone(content),
      workingContent: {
        ...content.workingContent,
        auctionTitle: "Tampered current title",
      },
    };
    expect(
      sanitizePersistedAuctionContentState({ contents: [malformed] }).contents,
    ).toEqual([]);
  });

  for (const [number, key] of [
    [60, "description"],
    [61, "image"],
    [62, "altText"],
    [63, "approvalPackageId"],
    [64, "schedule"],
    [65, "publication"],
  ] as const) {
    it(`${number} rejects persisted fixture/later-phase field ${key}`, () => {
      const malformed = clone(initialize()) as AuctionContent &
        Record<string, unknown>;
      malformed[key] = "forbidden";
      expect(
        sanitizePersistedAuctionContentState({ contents: [malformed] })
          .contents,
      ).toEqual([]);
    });
  }

  it("66 deterministic reset isolates content state", () => {
    initialize();
    useAuctionContentStore.getState().resetDeterministicContentState();
    expect(useAuctionContentStore.getState().contents).toEqual([]);
  });

  it("67 policy metadata is explicitly classified and frozen", () => {
    expect(PROTOTYPE_CONTENT_POLICY.classification).toContain(
      "NOT STAKEHOLDER-APPROVED",
    );
    expect(Object.isFrozen(PROTOTYPE_CONTENT_POLICY)).toBe(true);
  });

  it("68 reports source findings as externally owned", () => {
    const result = evaluateAuctionContentCompleteness({
      workingContent: { auctionTitle: "Title", auctionSummary: "Summary" },
      contentVersion: 1,
      sourceState: "STALE",
    });
    expect(result.findings[0]).toMatchObject({
      owner: "CUSTOMER_SOURCE",
      correctableInCurrentWorkspace: false,
    });
  });

  it("69 makes unchanged refresh idempotent without history", () => {
    const content = initialize();
    const refresh = useAuctionContentStore
      .getState()
      .refreshAuctionContentSourceLineage({
        contentId: content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: 1,
        expectedSessionVersion: 1,
        commandId: "unchanged-refresh",
      });
    expect(refresh).toMatchObject({ ok: true, changed: false });
    expect(refresh.ok && refresh.content.history).toHaveLength(1);
  });

  it("70 blocks save after a stale refresh", () => {
    const content = initialize();
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === content.sourceLineage.openingRequestId
          ? { ...record, version: record.version + 1 }
          : record,
      ),
    }));
    useAuctionContentStore
      .getState()
      .refreshAuctionContentSourceLineage({
        contentId: content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: 1,
        expectedSessionVersion: 1,
        commandId: "mark-stale-before-save",
      });
    expect(save(content)).toMatchObject({ ok: false, code: "BLOCKED" });
  });
});
