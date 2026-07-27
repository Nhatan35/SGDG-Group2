import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionApprovalReviewDecisionPage } from "./governance/AuctionApprovalReviewDecisionPage";
import { useAuctionApprovalDecisionStore } from "../store/auctionApprovalDecisionStore";
import { useAuctionApprovalReviewStore } from "../store/auctionApprovalReviewStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useDemoStore } from "../store/demoStore";
import {
  resetApprovalPackageTestState,
  submitCurrentApprovalPackage,
} from "../test/approvalPackageTestHarness";

function prepareReview() {
  const prepared = submitCurrentApprovalPackage();
  const result = useAuctionApprovalReviewStore
    .getState()
    .startApprovalReview({
      packageId: prepared.packageValue.packageId,
      actorId: "admin.approval-review@mock.local",
      actorRole: "ADMIN",
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSubmissionRecordId: prepared.submission.submissionRecordId,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "decision-ui-start-review",
    });
  if (!result.ok) throw new Error(result.message);
  return { ...prepared, approvalReview: result.review };
}

function renderReview(reviewId: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/governance/auction-approval-reviews/${reviewId}`,
      ]}
    >
      <Routes>
        <Route
          path="/governance/auction-approval-reviews/:reviewId"
          element={<AuctionApprovalReviewDecisionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Approve-only Approval Decision UI", () => {
  beforeEach(() => {
    resetApprovalPackageTestState();
    useAuctionApprovalReviewStore
      .getState()
      .resetDeterministicApprovalReviewState();
    useAuctionApprovalDecisionStore
      .getState()
      .resetDeterministicApprovalDecisionState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("eligible Review shows Approve and complete boundary Dialog", async () => {
    const user = userEvent.setup();
    const prepared = prepareReview();
    renderReview(prepared.approvalReview.reviewId);
    await user.click(screen.getByRole("button", { name: "Phê duyệt" }));
    const dialog = screen.getByRole("dialog", {
      name: "Phê duyệt Approval Package",
    });
    expect(dialog).toHaveTextContent(prepared.approvalReview.reviewId);
    expect(dialog).toHaveTextContent(prepared.packageValue.packageId);
    expect(dialog).toHaveTextContent(prepared.submission.submissionRecordId);
    expect(dialog).toHaveTextContent(
      "This records an APPROVED decision for the submitted Approval Package.",
    );
    expect(dialog).toHaveTextContent(
      "The submitted Package remains immutable.",
    );
    expect(dialog).toHaveTextContent(
      "The Session remains DRAFT / NOT_READY.",
    );
    expect(dialog).toHaveTextContent(
      "No Schedule or Publication is created.",
    );
    expect(dialog).toHaveTextContent(
      "Return and Reject are not included in this task.",
    );
  });

  it("successful approval shows one read-only APPROVED Decision", async () => {
    const user = userEvent.setup();
    const prepared = prepareReview();
    renderReview(prepared.approvalReview.reviewId);
    await user.click(screen.getByRole("button", { name: "Phê duyệt" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirm Approval",
      }),
    );
    expect(screen.getByText(/recorded as APPROVED/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Approval Decision · read-only",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("APPROVED").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Phê duyệt" }),
    ).not.toBeInTheDocument();
    for (const name of ["Return", "Reject"])
      expect(
        screen.queryByRole("button", { name }),
      ).not.toBeInTheDocument();
    expect(prepared.packageValue.status).toBe("SUBMITTED");
    expect(prepared.session.lifecycleStatus).toBe("DRAFT");
    expect(prepared.session.publicationStatus).toBe("NOT_READY");
  });

  it("stale Review shows blocker and no Approve action", () => {
    const prepared = prepareReview();
    act(() => {
      const changed = useAuctionContentStore
        .getState()
        .saveAuctionContentDraft({
          contentId: prepared.content.contentId,
          actorId: "content.staff@mock.local",
          actorRole: "CONTENT_STAFF",
          expectedContentVersion: prepared.content.contentVersion,
          expectedSessionVersion: prepared.session.currentVersion,
          commandId: "decision-ui-drift",
          auctionTitle: prepared.content.workingContent.auctionTitle,
          auctionSummary: `${prepared.content.workingContent.auctionSummary} drift`,
        });
      if (!changed.ok) throw new Error(changed.message);
      const revalidated = useAuctionApprovalReviewStore
        .getState()
        .revalidateApprovalReviewEvidence({
          reviewId: prepared.approvalReview.reviewId,
          actorId: "admin.approval-review@mock.local",
          actorRole: "ADMIN",
          expectedReviewVersion: prepared.approvalReview.reviewVersion,
          commandId: "decision-ui-stale-review",
        });
      if (!revalidated.ok) throw new Error(revalidated.message);
    });
    renderReview(prepared.approvalReview.reviewId);
    expect(
      screen.getByText(/APPROVAL_REVIEW_NOT_APPROVABLE/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Phê duyệt" }),
    ).not.toBeInTheDocument();
  });

  it("unauthorized roles cannot approve through the command", () => {
    const prepared = prepareReview();
    const result = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: prepared.approvalReview.reviewId,
        actorId: "finance@mock.local",
        actorRole: "FINANCE",
        expectedReviewVersion: prepared.approvalReview.reviewVersion,
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "decision-ui-denied-approve",
      });
    expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    expect(useAuctionApprovalDecisionStore.getState().decisions).toEqual([]);
  });
});
