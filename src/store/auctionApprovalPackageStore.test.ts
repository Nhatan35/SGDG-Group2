import { beforeEach, describe, expect, it } from "vitest";
import { getAuctionRoomFeePolicy } from "../services/roomValueTierPolicy";
import { useAssetReadinessStore } from "./assetReadinessStore";
import {
  AUCTION_APPROVAL_PACKAGE_SCHEMA_VERSION,
  APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION,
  collectAuthoritativeApprovalPackageSources,
  evaluateApprovalPackageEligibility,
  getAdminApprovalPackageQueue,
  getApprovalPackageEvidenceValidity,
  sanitizePersistedAuctionApprovalPackageState,
  useAuctionApprovalPackageStore,
} from "./auctionApprovalPackageStore";
import {
  type AuctionConfigurationRules,
  useAuctionConfigurationStore,
} from "./auctionConfigurationStore";
import { useAuctionContentStore } from "./auctionContentStore";
import { useAuctionContentReviewStore } from "./auctionContentReviewStore";
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
const rules: AuctionConfigurationRules = {
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
};

function createSession(): PersistedLinkedAuctionSession {
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
    commandId: "package-request-submit",
    fields: {
      title: "Customer Approval Package source title",
      assetReference: "AST-CUS-PACKAGE-001",
      purpose: "Immutable Customer purpose for package evidence.",
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
    commandId: "package-request-review",
  });
  if (!reviewed.ok) throw new Error(reviewed.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewed.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewed.data.version,
      commandId: "package-request-accept",
      reason: "Accepted for Approval Package evidence.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "package-session-create",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

function confirmConfiguration(session: PersistedLinkedAuctionSession) {
  const created = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId: "package-config-create",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: created.proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: created.proposal.proposalVersion,
    commandId: "package-config-save",
    values: rules,
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
      commandId: "package-config-resolve",
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
      commandId: "package-config-submit",
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
      commandId: "package-config-confirm",
    });
  if (!confirmed.ok || !confirmed.snapshot)
    throw new Error(confirmed.ok ? "Missing snapshot" : confirmed.message);
  return confirmed.snapshot;
}

function prepareCompletedReview() {
  const session = createSession();
  const contentResult =
    useAuctionContentStore.getState().initializeAuctionContent({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      expectedOpeningRequestVersion: session.openingRequestVersion!,
      commandId: "package-content-initialize",
    });
  if (!contentResult.ok) throw new Error(contentResult.message);
  const snapshot = confirmConfiguration(session);
  const started = useAuctionContentReviewStore.getState().startContentReview({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedContentId: contentResult.content.contentId,
    expectedContentVersion: contentResult.content.contentVersion,
    expectedConfigurationSnapshotId: snapshot.snapshotId,
    commandId: "package-review-start",
  });
  if (!started.ok) throw new Error(started.message);
  const completed =
    useAuctionContentReviewStore.getState().completeContentReview({
      reviewId: started.review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedReviewVersion: started.review.reviewVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: contentResult.content.contentVersion,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      commandId: "package-review-complete",
    });
  if (!completed.ok || !completed.completionRecord)
    throw new Error(completed.ok ? "Missing completion" : completed.message);
  return {
    session,
    content: contentResult.content,
    snapshot,
    review: completed.review,
    completion: completed.completionRecord,
  };
}

function createPackage(
  prepared = prepareCompletedReview(),
  commandId = "package-create-command",
) {
  const result =
    useAuctionApprovalPackageStore.getState().createApprovalPackageDraft({
      sessionId: prepared.session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedContentVersion: prepared.content.contentVersion,
      expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
      expectedReviewVersion: prepared.review.reviewVersion,
      expectedCompletionRecordId: prepared.completion.completionRecordId,
      commandId,
    });
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  return { ...prepared, packageValue: result.package };
}

function submitPackage(created = createPackage(), commandId = "package-submit-command") {
  const result =
    useAuctionApprovalPackageStore.getState().submitApprovalPackage({
      packageId: created.packageValue.packageId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedPackageVersion: created.packageValue.packageVersion,
      expectedSessionVersion: created.session.currentVersion,
      expectedContentVersion: created.content.contentVersion,
      expectedConfigurationSnapshotId: created.snapshot.snapshotId,
      expectedReviewVersion: created.review.reviewVersion,
      expectedCompletionRecordId: created.completion.completionRecordId,
      commandId,
    });
  if (!result.ok || !result.submissionRecord)
    throw new Error(result.ok ? "Missing submission" : result.message);
  return {
    ...created,
    submitted: result.package,
    submission: result.submissionRecord,
  };
}

describe("governed dynamic Approval Package", () => {
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
    useAuctionApprovalPackageStore
      .getState()
      .resetDeterministicApprovalPackageState();
  });

  it("creates one READY_TO_SUBMIT packageVersion 1 with exact immutable evidence", () => {
    const prepared = createPackage();
    const value = prepared.packageValue;
    expect(value).toMatchObject({
      packageId: `approval-package-${prepared.session.sessionId}`,
      packageVersion: 1,
      status: "READY_TO_SUBMIT",
      sessionVersionAtPreparation: prepared.session.currentVersion,
    });
    expect(value.evidence).toMatchObject({
      packageEvidenceVersion: 1,
      session: {
        sessionId: prepared.session.sessionId,
        lifecycleStatus: "DRAFT",
        publicationStatus: "NOT_READY",
      },
      openingRequest: {
        openingRequestId: prepared.session.openingRequestId,
      },
      auctionContent: {
        contentId: prepared.content.contentId,
        contentVersion: prepared.content.contentVersion,
        auctionTitle: prepared.content.workingContent.auctionTitle,
        auctionSummary: prepared.content.workingContent.auctionSummary,
        completenessStatus: "COMPLETE",
      },
      configuration: {
        snapshotId: prepared.snapshot.snapshotId,
        proposalVersion: prepared.snapshot.proposalVersion,
      },
      contentReview: {
        reviewId: prepared.review.reviewId,
        reviewVersion: prepared.review.reviewVersion,
        completionRecordId: prepared.completion.completionRecordId,
        readiness: "READY_FOR_APPROVAL_PACKAGE_PREPARATION",
      },
    });
    expect(value.history.map((entry) => entry.action)).toEqual([
      "APPROVAL_PACKAGE_DRAFT_CREATED",
      "APPROVAL_PACKAGE_EVIDENCE_SNAPSHOTTED",
      "APPROVAL_PACKAGE_READY_TO_SUBMIT",
    ]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.evidence.configuration.memberListingFee)).toBe(
      true,
    );
    expect(value).not.toHaveProperty("approvalDecision");
    expect(value).not.toHaveProperty("scheduleId");
    expect(value).not.toHaveProperty("publicationId");
  });

  it.each(["ADMIN", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects %s at command layer",
    (actorRole) => {
      const prepared = prepareCompletedReview();
      const result =
        useAuctionApprovalPackageStore.getState().createApprovalPackageDraft({
          sessionId: prepared.session.sessionId,
          actorId: `${actorRole.toLowerCase()}@mock.local`,
          actorRole,
          expectedSessionVersion: prepared.session.currentVersion,
          expectedContentVersion: prepared.content.contentVersion,
          expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
          expectedReviewVersion: prepared.review.reviewVersion,
          expectedCompletionRecordId:
            prepared.completion.completionRecordId,
          commandId: `package-role-${actorRole.toLowerCase()}`,
        });
      expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
      expect(useAuctionApprovalPackageStore.getState().packages).toEqual([]);
    },
  );

  it("rejects fixture and SGDG-managed Sessions with bounded codes", () => {
    const fixtureSources = collectAuthoritativeApprovalPackageSources(
      "royal-oak-15500st-draft",
    );
    expect(
      evaluateApprovalPackageEligibility({
        sources: fixtureSources,
        actorRole: "CONTENT_STAFF",
        commandId: "package-fixture-check",
        expectedSessionVersion: 1,
        expectedContentVersion: 1,
        expectedConfigurationSnapshotId: "fixture",
        expectedReviewVersion: 1,
        expectedCompletionRecordId: "fixture",
        approvalPackageExists: false,
      }),
    ).toMatchObject({ eligible: false, code: "SESSION_NOT_DYNAMIC" });

    const reference = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId: "AST-OMEGA-SPD-001",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "package-sgdg-reference",
      });
    if (!reference.ok) throw new Error(reference.message);
    const direct = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession({
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "package-sgdg-session",
        ownerId: CONTENT_STAFF_ACTOR_ID,
        assetReadinessReferenceId: reference.reference.referenceId,
        expectedAssetVersion: reference.reference.assetVersion,
        draft: {
          assetId: reference.reference.assetId,
          title: "SGDG package blocker",
          purpose: "Listing Fee remains unresolved.",
          region: "Hà Nội",
          ownerId: CONTENT_STAFF_ACTOR_ID,
        },
      });
    if (!direct.ok) throw new Error(direct.message);
    const result =
      useAuctionApprovalPackageStore.getState().createApprovalPackageDraft({
        sessionId: direct.session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: direct.session.currentVersion,
        expectedContentVersion: 1,
        expectedConfigurationSnapshotId: "missing",
        expectedReviewVersion: 1,
        expectedCompletionRecordId: "missing",
        commandId: "package-sgdg-create",
      });
    expect(result).toMatchObject({
      ok: false,
      code: APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION,
    });
  });

  it("requires completed current review and exact expected evidence", () => {
    const prepared = prepareCompletedReview();
    const base = {
      sessionId: prepared.session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedSessionVersion: prepared.session.currentVersion,
      expectedContentVersion: prepared.content.contentVersion,
      expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
      expectedReviewVersion: prepared.review.reviewVersion,
      expectedCompletionRecordId: prepared.completion.completionRecordId,
    };
    expect(
      useAuctionApprovalPackageStore
        .getState()
        .createApprovalPackageDraft({
          ...base,
          expectedContentVersion: 99,
          commandId: "package-stale-content",
        }),
    ).toMatchObject({ ok: false, code: "STALE_CONTENT_VERSION" });
    expect(
      useAuctionApprovalPackageStore
        .getState()
        .createApprovalPackageDraft({
          ...base,
          expectedConfigurationSnapshotId: "wrong-snapshot",
          commandId: "package-stale-snapshot",
        }),
    ).toMatchObject({ ok: false, code: "CONFIGURATION_CHANGED" });
    expect(
      useAuctionApprovalPackageStore
        .getState()
        .createApprovalPackageDraft({
          ...base,
          expectedReviewVersion: 99,
          commandId: "package-stale-review",
        }),
    ).toMatchObject({ ok: false, code: "STALE_REVIEW_VERSION" });
    expect(
      useAuctionApprovalPackageStore
        .getState()
        .createApprovalPackageDraft({
          ...base,
          expectedCompletionRecordId: "wrong-record",
          commandId: "package-stale-completion",
        }),
    ).toMatchObject({ ok: false, code: "COMPLETION_RECORD_INVALID" });
  });

  it("keeps create idempotent and blocks a different create command", () => {
    const prepared = prepareCompletedReview();
    const command = {
      sessionId: prepared.session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedSessionVersion: prepared.session.currentVersion,
      expectedContentVersion: prepared.content.contentVersion,
      expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
      expectedReviewVersion: prepared.review.reviewVersion,
      expectedCompletionRecordId: prepared.completion.completionRecordId,
      commandId: "package-idempotent-create",
    };
    const first = useAuctionApprovalPackageStore
      .getState()
      .createApprovalPackageDraft(command);
    const same = useAuctionApprovalPackageStore
      .getState()
      .createApprovalPackageDraft(command);
    const other = useAuctionApprovalPackageStore
      .getState()
      .createApprovalPackageDraft({
        ...command,
        commandId: "package-other-create",
      });
    expect(first).toMatchObject({ ok: true, created: true });
    expect(same).toMatchObject({ ok: true, created: false, changed: false });
    expect(other).toMatchObject({
      ok: false,
      code: "APPROVAL_PACKAGE_ALREADY_EXISTS",
    });
    expect(useAuctionApprovalPackageStore.getState().packages).toHaveLength(1);
    expect(
      useAuctionApprovalPackageStore.getState().packages[0].history,
    ).toHaveLength(3);
  });

  it("marks a Draft stale after canonical Content change and creates no queue record", () => {
    const created = createPackage();
    const saved = useAuctionContentStore.getState().saveAuctionContentDraft({
      contentId: created.content.contentId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedContentVersion: created.content.contentVersion,
      expectedSessionVersion: created.session.currentVersion,
      commandId: "package-content-after-draft",
      auctionTitle: created.content.workingContent.auctionTitle,
      auctionSummary: "Content changed after package preparation.",
    });
    if (!saved.ok) throw new Error(saved.message);
    const result =
      useAuctionApprovalPackageStore.getState().submitApprovalPackage({
        packageId: created.packageValue.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: created.packageValue.packageVersion,
        expectedSessionVersion: created.session.currentVersion,
        expectedContentVersion: created.content.contentVersion,
        expectedConfigurationSnapshotId: created.snapshot.snapshotId,
        expectedReviewVersion: created.review.reviewVersion,
        expectedCompletionRecordId: created.completion.completionRecordId,
        commandId: "package-submit-stale-content",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "STALE_CONTENT_VERSION",
      package: { status: "STALE", packageVersion: 2 },
    });
    expect(
      useAuctionApprovalPackageStore.getState().submissionRecords,
    ).toEqual([]);
    expect(getAdminApprovalPackageQueue()).toEqual([]);
  });

  it("marks missing Configuration blocked, then explicit refresh restores READY_TO_SUBMIT", () => {
    const created = createPackage();
    const snapshots =
      useAuctionConfigurationStore.getState().snapshots;
    useAuctionConfigurationStore.setState({ snapshots: [] });
    const blocked =
      useAuctionApprovalPackageStore.getState().refreshApprovalPackageDraft({
        packageId: created.packageValue.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: 1,
        expectedSessionVersion: created.session.currentVersion,
        expectedContentVersion: created.content.contentVersion,
        expectedConfigurationSnapshotId: created.snapshot.snapshotId,
        expectedReviewVersion: created.review.reviewVersion,
        expectedCompletionRecordId: created.completion.completionRecordId,
        commandId: "package-refresh-blocked",
      });
    expect(blocked).toMatchObject({
      ok: true,
      changed: true,
      package: { status: "BLOCKED", packageVersion: 2 },
    });
    useAuctionConfigurationStore.setState({ snapshots });
    const restored =
      useAuctionApprovalPackageStore.getState().refreshApprovalPackageDraft({
        packageId: created.packageValue.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: 2,
        expectedSessionVersion: created.session.currentVersion,
        expectedContentVersion: created.content.contentVersion,
        expectedConfigurationSnapshotId: created.snapshot.snapshotId,
        expectedReviewVersion: created.review.reviewVersion,
        expectedCompletionRecordId: created.completion.completionRecordId,
        commandId: "package-refresh-restored",
      });
    expect(restored).toMatchObject({
      ok: true,
      changed: true,
      package: { status: "READY_TO_SUBMIT", packageVersion: 3 },
    });
  });

  it("keeps no-op refresh version/history unchanged and rejects submitted refresh", () => {
    const created = createPackage();
    const refreshed =
      useAuctionApprovalPackageStore.getState().refreshApprovalPackageDraft({
        packageId: created.packageValue.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: 1,
        expectedSessionVersion: created.session.currentVersion,
        expectedContentVersion: created.content.contentVersion,
        expectedConfigurationSnapshotId: created.snapshot.snapshotId,
        expectedReviewVersion: created.review.reviewVersion,
        expectedCompletionRecordId: created.completion.completionRecordId,
        commandId: "package-refresh-noop",
      });
    expect(refreshed).toMatchObject({
      ok: true,
      changed: false,
      package: { packageVersion: 1 },
    });
    const submitted = submitPackage(created);
    const rejected =
      useAuctionApprovalPackageStore.getState().refreshApprovalPackageDraft({
        packageId: submitted.submitted.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: submitted.submitted.packageVersion,
        expectedSessionVersion: submitted.session.currentVersion,
        expectedContentVersion: submitted.content.contentVersion,
        expectedConfigurationSnapshotId: submitted.snapshot.snapshotId,
        expectedReviewVersion: submitted.review.reviewVersion,
        expectedCompletionRecordId: submitted.completion.completionRecordId,
        commandId: "package-refresh-submitted",
      });
    expect(rejected).toMatchObject({
      ok: false,
      code: "APPROVAL_PACKAGE_ALREADY_SUBMITTED",
    });
  });

  it("submits once, increments packageVersion, freezes evidence and derives one ADMIN item", () => {
    const submitted = submitPackage();
    expect(submitted.submitted).toMatchObject({
      status: "SUBMITTED",
      packageVersion: 2,
      submissionRecordId: submitted.submission.submissionRecordId,
    });
    expect(submitted.submission).toMatchObject({
      recordVersion: 1,
      submittedPackageVersion: 2,
      sessionId: submitted.session.sessionId,
      contentVersion: submitted.content.contentVersion,
      configurationSnapshotId: submitted.snapshot.snapshotId,
      reviewVersion: submitted.review.reviewVersion,
      completionRecordId: submitted.completion.completionRecordId,
      queueState: "AWAITING_ADMIN_REVIEW",
    });
    expect(Object.isFrozen(submitted.submitted)).toBe(true);
    expect(Object.isFrozen(submitted.submission)).toBe(true);
    expect(useAuctionSessionStore.getState().sessions[0]).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(useAuctionSessionStore.getState().sessions[0]).not.toHaveProperty(
      "approvalPackageId",
    );
    expect(getAdminApprovalPackageQueue()).toEqual([
      expect.objectContaining({
        packageId: submitted.submitted.packageId,
        queueState: "AWAITING_ADMIN_REVIEW",
        evidenceValidity: "CURRENT",
      }),
    ]);
  });

  it("makes duplicate submit idempotent and rejects a different submit command", () => {
    const created = createPackage();
    const command = {
      packageId: created.packageValue.packageId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedPackageVersion: created.packageValue.packageVersion,
      expectedSessionVersion: created.session.currentVersion,
      expectedContentVersion: created.content.contentVersion,
      expectedConfigurationSnapshotId: created.snapshot.snapshotId,
      expectedReviewVersion: created.review.reviewVersion,
      expectedCompletionRecordId: created.completion.completionRecordId,
      commandId: "package-submit-idempotent",
    };
    const first = useAuctionApprovalPackageStore
      .getState()
      .submitApprovalPackage(command);
    const same = useAuctionApprovalPackageStore
      .getState()
      .submitApprovalPackage(command);
    const other = useAuctionApprovalPackageStore
      .getState()
      .submitApprovalPackage({
        ...command,
        commandId: "package-submit-different",
        expectedPackageVersion: 2,
      });
    expect(first).toMatchObject({ ok: true, created: true });
    expect(same).toMatchObject({ ok: true, created: false, changed: false });
    expect(other).toMatchObject({
      ok: false,
      code: "APPROVAL_PACKAGE_ALREADY_SUBMITTED",
    });
    expect(
      useAuctionApprovalPackageStore.getState().submissionRecords,
    ).toHaveLength(1);
    expect(getAdminApprovalPackageQueue()).toHaveLength(1);
  });

  it("shows post-submission drift as derived stale without mutating submitted evidence", () => {
    const submitted = submitPackage();
    const before = structuredClone(submitted.submitted);
    useAuctionConfigurationStore.setState({ snapshots: [] });
    expect(
      getApprovalPackageEvidenceValidity(submitted.submitted),
    ).toBe("STALE_AFTER_SUBMISSION");
    expect(getAdminApprovalPackageQueue()[0]).toMatchObject({
      evidenceValidity: "STALE_AFTER_SUBMISSION",
    });
    expect(
      useAuctionApprovalPackageStore.getState().packages[0],
    ).toEqual(before);
    expect(useAuctionApprovalPackageStore.getState().packages).toHaveLength(1);
  });

  it("detects Membership drift before submission", () => {
    const membershipCase = createPackage();
    const changedSnapshot = {
      ...membershipCase.snapshot,
      memberTitleReference: {
        ...membershipCase.snapshot.memberTitleReference,
        referenceVersion: "MEMBERSHIP-MOCK-V2",
      },
    };
    useAuctionConfigurationStore.setState({ snapshots: [changedSnapshot] });
    const membershipRefresh =
      useAuctionApprovalPackageStore.getState().refreshApprovalPackageDraft({
        packageId: membershipCase.packageValue.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: 1,
        expectedSessionVersion: membershipCase.session.currentVersion,
        expectedContentVersion: membershipCase.content.contentVersion,
        expectedConfigurationSnapshotId: membershipCase.snapshot.snapshotId,
        expectedReviewVersion: membershipCase.review.reviewVersion,
        expectedCompletionRecordId:
          membershipCase.completion.completionRecordId,
        commandId: "package-refresh-membership-drift",
      });
    expect(membershipRefresh).toMatchObject({
      ok: true,
      package: { status: "STALE" },
    });
    expect(
      membershipRefresh.ok
        ? membershipRefresh.package.preparationValidation.findings.map(
            (finding) => finding.code,
          )
        : [],
    ).toContain("MEMBERSHIP_EVIDENCE_STALE");
  });

  it("detects completed Review drift before submission", () => {
    const created = createPackage();
    useAuctionContentReviewStore.setState({
      reviews: [
        {
          ...created.review,
          reviewVersion: created.review.reviewVersion + 1,
        },
      ],
    });
    const refreshed =
      useAuctionApprovalPackageStore.getState().refreshApprovalPackageDraft({
        packageId: created.packageValue.packageId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedPackageVersion: 1,
        expectedSessionVersion: created.session.currentVersion,
        expectedContentVersion: created.content.contentVersion,
        expectedConfigurationSnapshotId: created.snapshot.snapshotId,
        expectedReviewVersion: created.review.reviewVersion,
        expectedCompletionRecordId: created.completion.completionRecordId,
        commandId: "package-refresh-review-drift",
      });
    expect(refreshed).toMatchObject({
      ok: true,
      package: { status: "STALE" },
    });
    expect(
      refreshed.ok
        ? refreshed.package.preparationValidation.findings.map(
            (finding) => finding.code,
          )
        : [],
    ).toContain("CONTENT_REVIEW_COMPLETION_STALE");
  });

  it("fails closed for malformed, duplicate, orphan and later-phase persistence", () => {
    const submitted = submitPackage();
    const valid = {
      packages: [structuredClone(submitted.submitted)],
      submissionRecords: [structuredClone(submitted.submission)],
    };
    expect(
      sanitizePersistedAuctionApprovalPackageState(valid).packages,
    ).toHaveLength(1);
    const malformedStates = [
      { ...valid, packages: [{ ...valid.packages[0], packageVersion: 0 }] },
      {
        ...valid,
        packages: [valid.packages[0], structuredClone(valid.packages[0])],
      },
      { packages: valid.packages, submissionRecords: [] },
      { packages: [], submissionRecords: valid.submissionRecords },
      {
        packages: valid.packages,
        submissionRecords: [
          {
            ...valid.submissionRecords[0],
            submittedPackageVersion: 99,
          },
        ],
      },
      {
        packages: [
          {
            ...valid.packages[0],
            evidence: {
              ...valid.packages[0].evidence,
              auctionContent: {
                ...valid.packages[0].evidence.auctionContent,
                contentVersion: 99,
              },
            },
          },
        ],
        submissionRecords: valid.submissionRecords,
      },
      {
        packages: [{ ...valid.packages[0], approvedAt: "2026-07-26" }],
        submissionRecords: valid.submissionRecords,
      },
      {
        packages: [{ ...valid.packages[0], scheduleId: "SCH-UNSAFE" }],
        submissionRecords: valid.submissionRecords,
      },
      {
        packages: [{ ...valid.packages[0], approvalId: "APR-ROYAL-OAK-001" }],
        submissionRecords: valid.submissionRecords,
      },
    ];
    for (const state of malformedStates)
      expect(sanitizePersistedAuctionApprovalPackageState(state)).toEqual({
        packages: [],
        submissionRecords: [],
      });
  });

  it("rejects unknown schema through the persist contract and supports deterministic reset", () => {
    expect(AUCTION_APPROVAL_PACKAGE_SCHEMA_VERSION).toBe(1);
    submitPackage();
    expect(useAuctionApprovalPackageStore.getState().packages).toHaveLength(1);
    useAuctionApprovalPackageStore
      .getState()
      .resetDeterministicApprovalPackageState();
    expect(useAuctionApprovalPackageStore.getState().packages).toEqual([]);
    expect(
      useAuctionApprovalPackageStore.getState().submissionRecords,
    ).toEqual([]);
  });
});
