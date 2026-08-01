import { useAuctionApprovalDecisionStore } from "../store/auctionApprovalDecisionStore";
import { useAuctionApprovalReviewStore } from "../store/auctionApprovalReviewStore";
import { useAuctionScheduleDraftStore } from "../store/auctionScheduleDraftStore";
import {
  resetApprovalPackageTestState,
  submitCurrentApprovalPackage,
} from "./approvalPackageTestHarness";

export function resetScheduleDraftTestState() {
  resetApprovalPackageTestState();
  useAuctionApprovalReviewStore
    .getState()
    .resetDeterministicApprovalReviewState();
  useAuctionApprovalDecisionStore
    .getState()
    .resetDeterministicApprovalDecisionState();
  useAuctionScheduleDraftStore
    .getState()
    .resetDeterministicScheduleDraftState();
}

export function prepareApprovedScheduleAuthority() {
  const prepared = submitCurrentApprovalPackage();
  const review = useAuctionApprovalReviewStore
    .getState()
    .startApprovalReview({
      packageId: prepared.packageValue.packageId,
      actorId: "admin.schedule@mock.local",
      actorRole: "ADMIN",
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSubmissionRecordId: prepared.submission.submissionRecordId,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "schedule-authority-start-review",
    });
  if (!review.ok) throw new Error(review.message);
  const approved = useAuctionApprovalDecisionStore
    .getState()
    .approveApprovalPackage({
      approvalReviewId: review.review.reviewId,
      actorId: "admin.schedule@mock.local",
      actorRole: "ADMIN",
      expectedReviewVersion: review.review.reviewVersion,
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "schedule-authority-approve",
    });
  if (!approved.ok) throw new Error(approved.message);
  return { ...prepared, review: review.review, decision: approved.decision };
}
