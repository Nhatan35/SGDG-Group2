import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  AuctionApprovalPackageGovernanceDetailPage,
  AuctionApprovalPackageGovernanceQueuePage,
  AuctionApprovalReviewPage,
} from "./governance/AuctionApprovalPackageGovernancePages";
import {
  resetApprovalPackageTestState,
  submitCurrentApprovalPackage,
} from "../test/approvalPackageTestHarness";
import { useAuctionApprovalReviewStore } from "../store/auctionApprovalReviewStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useDemoStore } from "../store/demoStore";

describe("ADMIN Approval Review intake UI", () => {
  beforeEach(() => {
    resetApprovalPackageTestState();
    useAuctionApprovalReviewStore
      .getState()
      .resetDeterministicApprovalReviewState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("shows Start Review and all phase-boundary dialog disclosures", async () => {
    const user = userEvent.setup();
    const prepared = submitCurrentApprovalPackage();
    render(
      <MemoryRouter
        initialEntries={[
          `/governance/auction-approval-packages/${prepared.packageValue.packageId}`,
        ]}
      >
        <Routes>
          <Route
            path="/governance/auction-approval-packages/:packageId"
            element={<AuctionApprovalPackageGovernanceDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("button", { name: "Bắt đầu xem xét" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Bắt đầu Approval Review",
    });
    expect(dialog).toHaveTextContent("chỉ bắt đầu review intake");
    expect(dialog).toHaveTextContent("Không có quyết định phê duyệt");
    expect(dialog).toHaveTextContent("Approval Package vẫn bất biến");
    expect(dialog).toHaveTextContent("DRAFT / NOT_READY");
    expect(dialog).toHaveTextContent("Không tạo Schedule hoặc Publication");
  });

  it("starts once, shows IN_REVIEW, and exposes no decision controls", async () => {
    const user = userEvent.setup();
    const prepared = submitCurrentApprovalPackage();
    render(
      <MemoryRouter
        initialEntries={[
          `/governance/auction-approval-packages/${prepared.packageValue.packageId}`,
        ]}
      >
        <Routes>
          <Route
            path="/governance/auction-approval-packages/:packageId"
            element={<AuctionApprovalPackageGovernanceDetailPage />}
          />
          <Route
            path="/governance/auction-approval-reviews/:reviewId"
            element={<AuctionApprovalReviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("button", { name: "Bắt đầu xem xét" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Bắt đầu xem xét",
      }),
    );
    expect(screen.getAllByText(/IN_REVIEW/).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Bắt đầu xem xét" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Mở Approval Review" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Approval Review" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/chưa có quyết định phê duyệt/)).toBeInTheDocument();
    for (const name of ["Approve", "Return", "Reject"])
      expect(
        screen.queryByRole("button", { name }),
      ).not.toBeInTheDocument();
  });

  it("stale Package shows exact blocker and no Start action", () => {
    const prepared = submitCurrentApprovalPackage();
    act(() => {
      const result = useAuctionContentStore
        .getState()
        .saveAuctionContentDraft({
          contentId: prepared.content.contentId,
          actorId: "content.staff@mock.local",
          actorRole: "CONTENT_STAFF",
          expectedContentVersion: prepared.content.contentVersion,
          expectedSessionVersion: prepared.session.currentVersion,
          commandId: "ui-stale-content",
          auctionTitle: prepared.content.workingContent.auctionTitle,
          auctionSummary: `${prepared.content.workingContent.auctionSummary} drift`,
        });
      if (!result.ok) throw new Error(result.message);
    });
    render(
      <MemoryRouter
        initialEntries={[
          `/governance/auction-approval-packages/${prepared.packageValue.packageId}`,
        ]}
      >
        <Routes>
          <Route
            path="/governance/auction-approval-packages/:packageId"
            element={<AuctionApprovalPackageGovernanceDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        /APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bắt đầu xem xét" }),
    ).not.toBeInTheDocument();
  });

  it("queue derives IN_REVIEW and unauthorized roles cannot mutate", () => {
    const prepared = submitCurrentApprovalPackage();
    const denied = useAuctionApprovalReviewStore.getState().startApprovalReview({
      packageId: prepared.packageValue.packageId,
      actorId: "finance@mock.local",
      actorRole: "FINANCE",
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSubmissionRecordId: prepared.submission.submissionRecordId,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "ui-unauthorized-start",
    });
    expect(denied).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    const started = useAuctionApprovalReviewStore
      .getState()
      .startApprovalReview({
        packageId: prepared.packageValue.packageId,
        actorId: "admin.review@mock.local",
        actorRole: "ADMIN",
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSubmissionRecordId: prepared.submission.submissionRecordId,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "ui-admin-start",
      });
    expect(started.ok).toBe(true);
    render(
      <MemoryRouter>
        <AuctionApprovalPackageGovernanceQueuePage />
      </MemoryRouter>,
    );
    expect(screen.getByText("IN_REVIEW")).toBeInTheDocument();
    expect(prepared.session.lifecycleStatus).toBe("DRAFT");
    expect(prepared.session.publicationStatus).toBe("NOT_READY");
  });
});
