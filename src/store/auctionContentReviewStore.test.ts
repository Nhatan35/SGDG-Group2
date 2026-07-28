import { beforeEach, describe, expect, it } from "vitest";
import { getAuctionRoomFeePolicy } from "../services/roomValueTierPolicy";
import { useAssetReadinessStore } from "./assetReadinessStore";
import {
  type AuctionConfigurationRules,
  useAuctionConfigurationStore,
} from "./auctionConfigurationStore";
import {
  type AuctionContent,
  useAuctionContentStore,
} from "./auctionContentStore";
import {
  AUCTION_CONTENT_REVIEW_SCHEMA_VERSION,
  CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION,
  getSessionPackageProjection,
  sanitizePersistedAuctionContentReviewState,
  useAuctionContentReviewStore,
} from "./auctionContentReviewStore";
import {
  type PersistedLinkedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "./openingRequestStore";

const ADMIN_ID = "admin.configuration@mock.local";
const readyRules: AuctionConfigurationRules = {
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
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
    commandId: "review-request-submit",
    fields: {
      title: "Customer-requested Content Review",
      assetReference: "AST-CUS-REVIEW-001",
      purpose: "Authoritative purpose for the Auction Content source.",
      proposedStartPrice: 2_900_000_000,
      customerNotes: "",
      declarationAccepted: true,
    },
  });
  if (!submitted.ok) throw new Error(submitted.message);
  const reviewed = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "review-request-start-review",
  });
  if (!reviewed.ok) throw new Error(reviewed.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewed.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewed.data.version,
      commandId: "review-request-accept",
      reason: "Accepted for deterministic Content Review evidence.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "review-linked-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

function initializeContent(session: PersistedLinkedAuctionSession) {
  const result = useAuctionContentStore.getState().initializeAuctionContent({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedOpeningRequestVersion: session.openingRequestVersion!,
    commandId: "review-content-initialize",
  });
  if (!result.ok) throw new Error(result.message);
  return result.content;
}

function saveContent(
  content: AuctionContent,
  auctionSummary: string,
  commandId: string,
) {
  const result = useAuctionContentStore.getState().saveAuctionContentDraft({
    contentId: content.contentId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedContentVersion: content.contentVersion,
    expectedSessionVersion: content.sessionVersionAtInitialization,
    commandId,
    auctionTitle: content.workingContent.auctionTitle,
    auctionSummary,
    changeReason: "Content Review correction loop.",
  });
  if (!result.ok) throw new Error(result.message);
  return result.content;
}

function createConfiguration(
  session: PersistedLinkedAuctionSession,
) {
  const created = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId: "review-config-create",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: created.proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: created.proposal.proposalVersion,
    commandId: "review-config-save",
    values: readyRules,
  });
  if (!saved.ok) throw new Error(saved.message);
  const applied = useAuctionConfigurationStore
    .getState()
    .applyAuctionRoomMemberFeeResolution({
      configurationId: saved.proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: saved.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      expectedPolicyVersion: getAuctionRoomFeePolicy().decisionVersion,
      commandId: "review-config-apply-policy",
    });
  if (!applied.ok) throw new Error(applied.message);
  const submitted = useAuctionConfigurationStore
    .getState()
    .submitConfigurationProposal({
      configurationId: applied.proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: applied.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "review-config-submit",
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const confirmed = useAuctionConfigurationStore
    .getState()
    .confirmConfigurationProposal({
      configurationId: submitted.proposal.configurationId,
      actorId: ADMIN_ID,
      actorRole: "ADMIN",
      expectedProposalVersion: submitted.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "review-config-confirm",
    });
  if (!confirmed.ok || !confirmed.snapshot)
    throw new Error(confirmed.ok ? "Snapshot missing" : confirmed.message);
  return {
    proposal: confirmed.proposal,
    snapshot: confirmed.snapshot,
  };
}

function prepareReady() {
  const session = createLinkedSession();
  const content = initializeContent(session);
  const { snapshot } = createConfiguration(session);
  return { session, content, snapshot };
}

function startReview(
  prepared = prepareReady(),
  commandId = "start-content-review-command",
) {
  const result = useAuctionContentReviewStore.getState().startContentReview({
    sessionId: prepared.session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: prepared.session.currentVersion,
    expectedContentId: prepared.content.contentId,
    expectedContentVersion: prepared.content.contentVersion,
    expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
    commandId,
  });
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  return { ...prepared, review: result.review };
}

function completeReview(started = startReview()) {
  const result = useAuctionContentReviewStore
    .getState()
    .completeContentReview({
      reviewId: started.review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedReviewVersion: started.review.reviewVersion,
      expectedSessionVersion: started.session.currentVersion,
      expectedContentVersion: started.content.contentVersion,
      expectedConfigurationSnapshotId: started.snapshot.snapshotId,
      commandId: "complete-content-review-command",
    });
  if (!result.ok || !result.completionRecord)
    throw new Error(result.ok ? "Completion record missing" : result.message);
  return { ...started, completed: result.review, record: result.completionRecord };
}

describe("persisted Content Review and Session Package readiness", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAssetReadinessStore.getState().resetDeterministicAssetReadinessState();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useAuctionConfigurationStore
      .getState()
      .resetDeterministicConfigurationState();
    useAuctionContentStore.getState().resetDeterministicContentState();
    useAuctionContentReviewStore
      .getState()
      .resetDeterministicContentReviewState();
  });

  it("starts exactly one eligible Customer review at reviewVersion 1 with exact references", () => {
    const { session, content, snapshot, review } = startReview();
    expect(review).toMatchObject({
      sessionId: session.sessionId,
      sessionVersionAtStart: session.currentVersion,
      contentId: content.contentId,
      contentVersionAtStart: content.contentVersion,
      lastEvaluatedContentVersion: content.contentVersion,
      configurationSnapshotIdAtStart: snapshot.snapshotId,
      configurationProposalVersionAtStart: snapshot.proposalVersion,
      reviewVersion: 1,
      status: "READY_TO_COMPLETE",
    });
    expect(review).not.toHaveProperty("auctionTitle");
    expect(review).not.toHaveProperty("auctionSummary");
    expect(review.history.map((item) => item.action)).toEqual([
      "CONTENT_REVIEW_STARTED",
      "CONTENT_REVIEW_INITIAL_READINESS_EVALUATED",
    ]);
    expect(useAuctionContentReviewStore.getState().reviews).toHaveLength(1);
  });

  for (const actorRole of [
    "ADMIN",
    "CUSTOMER",
    "FINANCE",
    "CUSTOMER_SUPPORT",
  ] as const) {
    it(`rejects ${actorRole} start, revalidation, and completion`, () => {
      const prepared = prepareReady();
      expect(
        useAuctionContentReviewStore.getState().startContentReview({
          sessionId: prepared.session.sessionId,
          actorId: `blocked-${actorRole}`,
          actorRole,
          expectedSessionVersion: prepared.session.currentVersion,
          expectedContentId: prepared.content.contentId,
          expectedContentVersion: prepared.content.contentVersion,
          expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
          commandId: `blocked-start-${actorRole}`,
        }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
      const started = startReview(prepared);
      const shared = {
        reviewId: started.review.reviewId,
        actorId: `blocked-${actorRole}`,
        actorRole,
        expectedReviewVersion: started.review.reviewVersion,
        expectedSessionVersion: started.session.currentVersion,
        expectedContentVersion: started.content.contentVersion,
        expectedConfigurationSnapshotId: started.snapshot.snapshotId,
        commandId: `blocked-command-${actorRole}`,
      };
      expect(
        useAuctionContentReviewStore
          .getState()
          .revalidateSessionPackage(shared),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
      expect(
        useAuctionContentReviewStore.getState().completeContentReview(shared),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    });
  }

  it("rejects missing, fixture, and invalid Session inputs", () => {
    const base = {
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedSessionVersion: 1,
      expectedContentId: "missing-content",
      expectedContentVersion: 1,
      expectedConfigurationSnapshotId: "missing-snapshot",
      commandId: "missing-review-start",
    };
    expect(
      useAuctionContentReviewStore
        .getState()
        .startContentReview({ ...base, sessionId: "missing-session" }),
    ).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        ...base,
        sessionId: "royal-oak-15500st-draft",
        commandId: "fixture-review-start",
      }),
    ).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
    const prepared = prepareReady();
    useAuctionSessionStore.setState({
      sessions: [
        { ...prepared.session, lifecycleStatus: "PENDING_APPROVAL" },
      ],
    });
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        ...base,
        sessionId: prepared.session.sessionId,
        expectedContentId: prepared.content.contentId,
        expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
        commandId: "invalid-lifecycle-start",
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SESSION_STATE" });
  });

  it("rejects SGDG-managed Session with the exact Configuration blocker and creates nothing", () => {
    const reference = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId: "AST-OMEGA-SPD-001",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "review-sgdg-reference",
      });
    if (!reference.ok) throw new Error(reference.message);
    const direct = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession({
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "review-sgdg-session",
        ownerId: CONTENT_STAFF_ACTOR_ID,
        assetReadinessReferenceId: reference.reference.referenceId,
        expectedAssetVersion: reference.reference.assetVersion,
        draft: {
          assetId: reference.reference.assetId,
          title: "SGDG Content Review blocker",
          purpose: "Preserve Configuration business decision.",
          region: "Hà Nội",
          ownerId: CONTENT_STAFF_ACTOR_ID,
        },
      });
    if (!direct.ok) throw new Error(direct.message);
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        sessionId: direct.session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: direct.session.currentVersion,
        expectedContentId: "deferred",
        expectedContentVersion: 1,
        expectedConfigurationSnapshotId: "missing",
        commandId: "blocked-sgdg-review",
      }),
    ).toMatchObject({
      ok: false,
      code: CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION,
    });
    expect(useAuctionContentReviewStore.getState().reviews).toEqual([]);
    expect(useAuctionContentReviewStore.getState().completionRecords).toEqual(
      [],
    );
  });

  it("requires Auction Content and a current non-legacy Configuration Snapshot", () => {
    const session = createLinkedSession();
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: session.currentVersion,
        expectedContentId: "missing",
        expectedContentVersion: 1,
        expectedConfigurationSnapshotId: "missing",
        commandId: "review-without-content",
      }),
    ).toMatchObject({
      ok: false,
      code: "AUCTION_CONTENT_NOT_INITIALIZED",
    });
    const content = initializeContent(session);
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: session.currentVersion,
        expectedContentId: content.contentId,
        expectedContentVersion: content.contentVersion,
        expectedConfigurationSnapshotId: "missing",
        commandId: "review-without-snapshot",
      }),
    ).toMatchObject({
      ok: false,
      code: "CONFIGURATION_NOT_CONFIRMED",
    });
  });

  it("rejects STALE/BLOCKED Content and stale expected versions", () => {
    const prepared = prepareReady();
    useAuctionContentStore.setState({
      contents: [{ ...prepared.content, status: "STALE" }],
    });
    const command = {
      sessionId: prepared.session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedSessionVersion: prepared.session.currentVersion,
      expectedContentId: prepared.content.contentId,
      expectedContentVersion: prepared.content.contentVersion,
      expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
      commandId: "stale-content-start",
    };
    expect(
      useAuctionContentReviewStore.getState().startContentReview(command),
    ).toMatchObject({ ok: false, code: "AUCTION_CONTENT_STALE" });
    useAuctionContentStore.setState({
      contents: [{ ...prepared.content, status: "BLOCKED" }],
    });
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        ...command,
        commandId: "blocked-content-start",
      }),
    ).toMatchObject({ ok: false, code: "AUCTION_CONTENT_BLOCKED" });
  });

  it("is idempotent for the same start command and rejects a different start command", () => {
    const prepared = prepareReady();
    const command = {
      sessionId: prepared.session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedSessionVersion: prepared.session.currentVersion,
      expectedContentId: prepared.content.contentId,
      expectedContentVersion: prepared.content.contentVersion,
      expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
      commandId: "idempotent-review-start",
    };
    expect(
      useAuctionContentReviewStore.getState().startContentReview(command),
    ).toMatchObject({ ok: true, created: true });
    expect(
      useAuctionContentReviewStore.getState().startContentReview(command),
    ).toMatchObject({ ok: true, created: false });
    expect(
      useAuctionContentReviewStore.getState().startContentReview({
        ...command,
        commandId: "different-review-start",
      }),
    ).toMatchObject({
      ok: false,
      code: "CONTENT_REVIEW_ALREADY_STARTED",
    });
    expect(useAuctionContentReviewStore.getState().reviews).toHaveLength(1);
  });

  it("creates deterministic Content Staff findings for incomplete title and summary", () => {
    const prepared = prepareReady();
    const incomplete = useAuctionContentStore
      .getState()
      .saveAuctionContentDraft({
        contentId: prepared.content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: prepared.content.contentVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "make-review-content-incomplete",
        auctionTitle: "",
        auctionSummary: "",
      });
    if (!incomplete.ok) throw new Error(incomplete.message);
    const started = startReview({
      ...prepared,
      content: incomplete.content,
    });
    expect(started.review.status).toBe("CORRECTION_REQUIRED");
    expect(started.review.readiness.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AUCTION_TITLE_REQUIRED",
          owner: "CONTENT_STAFF",
          correctableInContentWorkspace: true,
        }),
        expect.objectContaining({
          code: "AUCTION_SUMMARY_REQUIRED",
          owner: "CONTENT_STAFF",
          correctableInContentWorkspace: true,
        }),
      ]),
    );
  });

  it("adopts a changed contentVersion only through explicit revalidation and preserves history", () => {
    const prepared = prepareReady();
    const incomplete = saveContent(
      prepared.content,
      "",
      "make-summary-incomplete",
    );
    const started = startReview({ ...prepared, content: incomplete });
    const corrected = saveContent(
      incomplete,
      "Corrected complete summary through Auction Content.",
      "correct-summary-in-content",
    );
    expect(started.review.lastEvaluatedContentVersion).toBe(
      incomplete.contentVersion,
    );
    expect(
      useAuctionContentReviewStore.getState().completeContentReview({
        reviewId: started.review.reviewId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: started.review.reviewVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        expectedContentVersion: incomplete.contentVersion,
        expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
        commandId: "stale-content-completion",
      }),
    ).toMatchObject({ ok: false, code: "STALE_CONTENT_VERSION" });
    const revalidated = useAuctionContentReviewStore
      .getState()
      .revalidateSessionPackage({
        reviewId: started.review.reviewId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: started.review.reviewVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        expectedContentVersion: corrected.contentVersion,
        expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
        commandId: "explicit-content-revalidation",
      });
    expect(revalidated).toMatchObject({
      ok: true,
      changed: true,
      review: {
        reviewVersion: 2,
        lastEvaluatedContentVersion: corrected.contentVersion,
        status: "READY_TO_COMPLETE",
      },
    });
    if (!revalidated.ok) return;
    expect(revalidated.review.history).toHaveLength(3);
    expect(revalidated.review.history.at(-1)?.action).toBe(
      "CONTENT_VERSION_CHANGED_DURING_REVIEW",
    );
  });

  it("does not increment reviewVersion or history for unchanged revalidation and duplicate commands", () => {
    const started = startReview();
    const command = {
      reviewId: started.review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedReviewVersion: started.review.reviewVersion,
      expectedSessionVersion: started.session.currentVersion,
      expectedContentVersion: started.content.contentVersion,
      expectedConfigurationSnapshotId: started.snapshot.snapshotId,
      commandId: "unchanged-revalidation",
    };
    expect(
      useAuctionContentReviewStore
        .getState()
        .revalidateSessionPackage(command),
    ).toMatchObject({
      ok: true,
      changed: false,
      review: { reviewVersion: 1 },
    });
    expect(
      useAuctionContentReviewStore
        .getState()
        .revalidateSessionPackage(command),
    ).toMatchObject({
      ok: true,
      changed: false,
      review: { reviewVersion: 1 },
    });
    expect(
      useAuctionContentReviewStore.getState().reviews[0].history,
    ).toHaveLength(2);
  });

  it("blocks stale reviewVersion, Session version, and Snapshot expectations without mutation", () => {
    const started = startReview();
    const base = {
      reviewId: started.review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedReviewVersion: started.review.reviewVersion,
      expectedSessionVersion: started.session.currentVersion,
      expectedContentVersion: started.content.contentVersion,
      expectedConfigurationSnapshotId: started.snapshot.snapshotId,
      commandId: "stale-revalidation",
    };
    expect(
      useAuctionContentReviewStore.getState().revalidateSessionPackage({
        ...base,
        expectedReviewVersion: 99,
      }),
    ).toMatchObject({ ok: false, code: "STALE_REVIEW_VERSION" });
    expect(
      useAuctionContentReviewStore.getState().revalidateSessionPackage({
        ...base,
        expectedSessionVersion: 99,
        commandId: "stale-session-revalidation",
      }),
    ).toMatchObject({ ok: false, code: "STALE_SESSION_VERSION" });
    expect(
      useAuctionContentReviewStore.getState().revalidateSessionPackage({
        ...base,
        expectedConfigurationSnapshotId: "changed-snapshot",
        commandId: "stale-snapshot-revalidation",
      }),
    ).toMatchObject({
      ok: false,
      code: "STALE_CONFIGURATION_SNAPSHOT",
    });
    expect(useAuctionContentReviewStore.getState().reviews[0].reviewVersion).toBe(
      1,
    );
  });

  it("marks explicit Configuration replacement stale and blocks completion", () => {
    const started = startReview();
    const replacement = {
      ...started.snapshot,
      snapshotId: `${started.snapshot.snapshotId}-replacement`,
    };
    useAuctionConfigurationStore.setState({
      snapshots: [replacement],
    });
    const result = useAuctionContentReviewStore
      .getState()
      .revalidateSessionPackage({
        reviewId: started.review.reviewId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: started.review.reviewVersion,
        expectedSessionVersion: started.session.currentVersion,
        expectedContentVersion: started.content.contentVersion,
        expectedConfigurationSnapshotId: replacement.snapshotId,
        commandId: "replacement-snapshot-revalidation",
      });
    expect(result).toMatchObject({
      ok: true,
      review: { status: "STALE", reviewVersion: 2 },
    });
    if (!result.ok) return;
    expect(result.review.readiness.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CONFIGURATION_CHANGED" }),
      ]),
    );
    expect(
      useAuctionContentReviewStore.getState().completeContentReview({
        reviewId: result.review.reviewId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: result.review.reviewVersion,
        expectedSessionVersion: started.session.currentVersion,
        expectedContentVersion: started.content.contentVersion,
        expectedConfigurationSnapshotId: replacement.snapshotId,
        commandId: "blocked-replaced-config-completion",
      }),
    ).toMatchObject({ ok: false, code: "CONTENT_REVIEW_NOT_READY" });
  });

  it("detects stale Membership, changed Member Title, and fee evidence without mutating Configuration", () => {
    const started = startReview();
    const originalSnapshot = structuredClone(started.snapshot);
    const changedSnapshot = {
      ...started.snapshot,
      memberTitleReference: {
        ...started.snapshot.memberTitleReference,
        referenceVersion: "MEMBERSHIP-STALE",
        title: "BAC" as const,
      },
    };
    useAuctionConfigurationStore.setState({ snapshots: [changedSnapshot] });
    const result = useAuctionContentReviewStore
      .getState()
      .revalidateSessionPackage({
        reviewId: started.review.reviewId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: started.review.reviewVersion,
        expectedSessionVersion: started.session.currentVersion,
        expectedContentVersion: started.content.contentVersion,
        expectedConfigurationSnapshotId: changedSnapshot.snapshotId,
        commandId: "membership-change-revalidation",
      });
    expect(result).toMatchObject({
      ok: true,
      review: { status: "BLOCKED" },
    });
    if (!result.ok) return;
    expect(result.review.readiness.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["MEMBER_TITLE_CHANGED", "MEMBER_FEE_EVIDENCE_STALE"]),
    );
    expect(
      useAuctionConfigurationStore.getState().snapshots[0].listingFeeResolution,
    ).toEqual(originalSnapshot.listingFeeResolution);
  });

  it("completes only READY_TO_COMPLETE and creates one deeply frozen exact completion record", () => {
    const { session, content, snapshot, completed, record } = completeReview();
    expect(completed).toMatchObject({
      status: "COMPLETED",
      reviewVersion: 2,
      completedBy: CONTENT_STAFF_ACTOR_ID,
    });
    expect(record).toMatchObject({
      recordVersion: 1,
      reviewVersion: 2,
      sessionId: session.sessionId,
      sessionVersionAtCompletion: session.currentVersion,
      contentId: content.contentId,
      contentVersion: content.contentVersion,
      configurationSnapshotId: snapshot.snapshotId,
      configurationProposalVersion: snapshot.proposalVersion,
      reviewedContentSnapshot: {
        auctionTitle: content.workingContent.auctionTitle,
        auctionSummary: content.workingContent.auctionSummary,
        sourceLineage: content.sourceLineage,
      },
      readinessSnapshot: { ready: true },
    });
    expect(record).not.toHaveProperty("approvalPackageId");
    expect(record).not.toHaveProperty("approvalStatus");
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.reviewedContentSnapshot)).toBe(true);
    expect(Object.isFrozen(record.reviewedContentSnapshot.sourceLineage)).toBe(
      true,
    );
    expect(Object.isFrozen(record.readinessSnapshot)).toBe(true);
    expect(Object.isFrozen(record.readinessSnapshot.findings)).toBe(true);
    expect(useAuctionContentReviewStore.getState().completionRecords).toHaveLength(
      1,
    );
  });

  it("is idempotent for the same completion command and rejects a different command after completion", () => {
    const started = startReview();
    const command = {
      reviewId: started.review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedReviewVersion: started.review.reviewVersion,
      expectedSessionVersion: started.session.currentVersion,
      expectedContentVersion: started.content.contentVersion,
      expectedConfigurationSnapshotId: started.snapshot.snapshotId,
      commandId: "idempotent-completion",
    };
    const first = useAuctionContentReviewStore
      .getState()
      .completeContentReview(command);
    expect(first).toMatchObject({ ok: true, created: true });
    const second = useAuctionContentReviewStore
      .getState()
      .completeContentReview(command);
    expect(second).toMatchObject({
      ok: true,
      created: false,
      completionRecord: first.ok ? first.completionRecord : undefined,
    });
    expect(
      useAuctionContentReviewStore.getState().completeContentReview({
        ...command,
        expectedReviewVersion: 2,
        commandId: "different-completion",
      }),
    ).toMatchObject({
      ok: false,
      code: "CONTENT_REVIEW_ALREADY_COMPLETED",
    });
    expect(useAuctionContentReviewStore.getState().completionRecords).toHaveLength(
      1,
    );
  });

  it("projects package preparation readiness without mutating Session or creating later-phase records", () => {
    const { session } = completeReview();
    expect(getSessionPackageProjection(session.sessionId)).toBe(
      "READY_FOR_APPROVAL_PACKAGE_PREPARATION",
    );
    expect(
      useAuctionSessionStore.getState().sessions[0],
    ).toMatchObject({
      currentVersion: session.currentVersion,
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(useAuctionSessionStore.getState().sessions[0]).not.toHaveProperty(
      "approvalPackageId",
    );
    expect(useAuctionSessionStore.getState().sessions[0]).not.toHaveProperty(
      "schedule",
    );
    expect(useAuctionSessionStore.getState().sessions[0]).not.toHaveProperty(
      "publication",
    );
  });

  it("fails closed for malformed, duplicate, orphan, mismatched, duplicated-content, and later-phase persistence", () => {
    const completed = completeReview();
    const valid = {
      reviews: [structuredClone(completed.completed)],
      completionRecords: [structuredClone(completed.record)],
    };
    const malformedStates = [
      {
        ...valid,
        reviews: [{ ...valid.reviews[0], status: "APPROVED" }],
      },
      {
        ...valid,
        reviews: [valid.reviews[0], structuredClone(valid.reviews[0])],
      },
      { reviews: valid.reviews, completionRecords: [] },
      { reviews: [], completionRecords: valid.completionRecords },
      {
        ...valid,
        completionRecords: [
          { ...valid.completionRecords[0], contentVersion: 99 },
        ],
      },
      {
        ...valid,
        completionRecords: [
          {
            ...valid.completionRecords[0],
            configurationSnapshotId: "wrong-snapshot",
          },
        ],
      },
      {
        ...valid,
        reviews: [
          {
            ...valid.reviews[0],
            auctionTitle: "duplicated editable content",
          },
        ],
      },
      {
        ...valid,
        reviews: [
          { ...valid.reviews[0], approvalPackageId: "APR-UNSAFE" },
        ],
      },
    ];
    for (const state of malformedStates)
      expect(sanitizePersistedAuctionContentReviewState(state)).toEqual({
        reviews: [],
        completionRecords: [],
      });
  });

  it("rehydrates valid state with schema v1 and deterministic reset isolates it", async () => {
    const completed = completeReview();
    const persisted = localStorage.getItem(
      "sgdg-auction-content-reviews-v1",
    );
    expect(persisted).toContain(
      `"version":${AUCTION_CONTENT_REVIEW_SCHEMA_VERSION}`,
    );
    useAuctionContentReviewStore
      .getState()
      .resetDeterministicContentReviewState();
    expect(useAuctionContentReviewStore.getState().reviews).toEqual([]);
    localStorage.setItem("sgdg-auction-content-reviews-v1", persisted!);
    await useAuctionContentReviewStore.persist.rehydrate();
    expect(useAuctionContentReviewStore.getState().reviews).toHaveLength(1);
    expect(
      useAuctionContentReviewStore.getState().completionRecords[0]
        .completionRecordId,
    ).toBe(completed.record.completionRecordId);
    useAuctionContentReviewStore
      .getState()
      .resetDeterministicContentReviewState();
    expect(useAuctionContentReviewStore.getState().completionRecords).toEqual(
      [],
    );
  });
});
