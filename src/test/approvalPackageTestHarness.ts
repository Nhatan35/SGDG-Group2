import { getAuctionRoomFeePolicy } from "../services/roomValueTierPolicy";
import { useAssetReadinessStore } from "../store/assetReadinessStore";
import { useAuctionApprovalPackageStore } from "../store/auctionApprovalPackageStore";
import {
  type AuctionConfigurationRules,
  useAuctionConfigurationStore,
} from "../store/auctionConfigurationStore";
import { useAuctionContentReviewStore } from "../store/auctionContentReviewStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import {
  type PersistedLinkedAuctionSession,
  useAuctionSessionStore,
} from "../store/auctionSessionStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";

const rules: AuctionConfigurationRules = {
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
};

export function resetApprovalPackageTestState() {
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
}

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
    commandId: "review-intake-request-submit",
    fields: {
      title: "Approval Review intake source",
      assetReference: "AST-CUS-REVIEW-001",
      purpose: "Customer evidence for Approval Review intake.",
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
    commandId: "review-intake-request-review",
  });
  if (!reviewed.ok) throw new Error(reviewed.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewed.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewed.data.version,
      commandId: "review-intake-request-accept",
      reason: "Accepted for governed review-intake evidence.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "review-intake-session-create",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

export function submitCurrentApprovalPackage() {
  const session = createSession();
  const content = useAuctionContentStore.getState().initializeAuctionContent({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedOpeningRequestVersion: session.openingRequestVersion!,
    commandId: "review-intake-content-create",
  });
  if (!content.ok) throw new Error(content.message);
  const configuration = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId: "review-intake-config-create",
    });
  if (!configuration.ok) throw new Error(configuration.message);
  const saved = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: configuration.proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: configuration.proposal.proposalVersion,
    commandId: "review-intake-config-save",
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
      commandId: "review-intake-config-resolve",
    });
  if (!applied.ok) throw new Error(applied.message);
  const proposed = useAuctionConfigurationStore
    .getState()
    .submitConfigurationProposal({
      configurationId: applied.proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: applied.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "review-intake-config-submit",
    });
  if (!proposed.ok) throw new Error(proposed.message);
  const confirmed = useAuctionConfigurationStore
    .getState()
    .confirmConfigurationProposal({
      configurationId: proposed.proposal.configurationId,
      actorId: "admin.review-intake@mock.local",
      actorRole: "ADMIN",
      expectedProposalVersion: proposed.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "review-intake-config-confirm",
    });
  if (!confirmed.ok || !confirmed.snapshot)
    throw new Error(confirmed.ok ? "Missing snapshot" : confirmed.message);
  const started = useAuctionContentReviewStore.getState().startContentReview({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedContentId: content.content.contentId,
    expectedContentVersion: content.content.contentVersion,
    expectedConfigurationSnapshotId: confirmed.snapshot.snapshotId,
    commandId: "review-intake-content-review-start",
  });
  if (!started.ok) throw new Error(started.message);
  const completed =
    useAuctionContentReviewStore.getState().completeContentReview({
      reviewId: started.review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedReviewVersion: started.review.reviewVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.content.contentVersion,
      expectedConfigurationSnapshotId: confirmed.snapshot.snapshotId,
      commandId: "review-intake-content-review-complete",
    });
  if (!completed.ok || !completed.completionRecord)
    throw new Error(completed.ok ? "Missing completion" : completed.message);
  const created =
    useAuctionApprovalPackageStore.getState().createApprovalPackageDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.content.contentVersion,
      expectedConfigurationSnapshotId: confirmed.snapshot.snapshotId,
      expectedReviewVersion: completed.review.reviewVersion,
      expectedCompletionRecordId:
        completed.completionRecord.completionRecordId,
      commandId: "review-intake-package-create",
    });
  if (!created.ok) throw new Error(created.message);
  const submittedPackage =
    useAuctionApprovalPackageStore.getState().submitApprovalPackage({
      packageId: created.package.packageId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedPackageVersion: created.package.packageVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.content.contentVersion,
      expectedConfigurationSnapshotId: confirmed.snapshot.snapshotId,
      expectedReviewVersion: completed.review.reviewVersion,
      expectedCompletionRecordId:
        completed.completionRecord.completionRecordId,
      commandId: "review-intake-package-submit",
    });
  if (!submittedPackage.ok || !submittedPackage.submissionRecord)
    throw new Error(
      submittedPackage.ok ? "Missing submission" : submittedPackage.message,
    );
  return {
    session,
    content: content.content,
    packageValue: submittedPackage.package,
    submission: submittedPackage.submissionRecord,
  };
}
