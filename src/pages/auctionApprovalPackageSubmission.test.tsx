import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { getAuctionRoomFeePolicy } from "../services/roomValueTierPolicy";
import { useAssetReadinessStore } from "../store/assetReadinessStore";
import { useAuctionApprovalPackageStore } from "../store/auctionApprovalPackageStore";
import {
  type AuctionConfigurationRules,
  useAuctionConfigurationStore,
} from "../store/auctionConfigurationStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useAuctionContentReviewStore } from "../store/auctionContentReviewStore";
import {
  useAuctionSessionStore,
} from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import {
  AuctionApprovalPackageGovernanceDetailPage,
  AuctionApprovalPackageGovernanceQueuePage,
} from "./governance/AuctionApprovalPackageGovernancePages";
import { AuctionApprovalPackagePage } from "./ops/AuctionApprovalPackagePage";
import { AuctionSessionWorkspacePage } from "./ops/OperationsPages";

const rules: AuctionConfigurationRules = {
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
};

function prepareCompletedReview() {
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
    commandId: "package-ui-request-submit",
    fields: {
      title: "Customer source title for Package UI",
      assetReference: "AST-CUS-PACKAGE-UI",
      purpose: "Customer source purpose remains read-only in Package UI.",
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
    commandId: "package-ui-request-review",
  });
  if (!reviewed.ok) throw new Error(reviewed.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewed.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewed.data.version,
      commandId: "package-ui-request-accept",
      reason: "Accepted for Package UI evidence.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "package-ui-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  const session = linked.session;
  const contentResult =
    useAuctionContentStore.getState().initializeAuctionContent({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      expectedOpeningRequestVersion: session.openingRequestVersion!,
      commandId: "package-ui-content",
    });
  if (!contentResult.ok) throw new Error(contentResult.message);
  const created = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId: "package-ui-config-create",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: created.proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: created.proposal.proposalVersion,
    commandId: "package-ui-config-save",
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
      commandId: "package-ui-config-resolve",
    });
  if (!applied.ok) throw new Error(applied.message);
  const configurationSubmitted =
    useAuctionConfigurationStore.getState().submitConfigurationProposal({
      configurationId: applied.proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: applied.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "package-ui-config-submit",
    });
  if (!configurationSubmitted.ok)
    throw new Error(configurationSubmitted.message);
  const confirmed =
    useAuctionConfigurationStore.getState().confirmConfigurationProposal({
      configurationId: configurationSubmitted.proposal.configurationId,
      actorId: "admin.configuration@mock.local",
      actorRole: "ADMIN",
      expectedProposalVersion:
        configurationSubmitted.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "package-ui-config-confirm",
    });
  if (!confirmed.ok || !confirmed.snapshot)
    throw new Error(confirmed.ok ? "Missing snapshot" : confirmed.message);
  const started = useAuctionContentReviewStore.getState().startContentReview({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedContentId: contentResult.content.contentId,
    expectedContentVersion: contentResult.content.contentVersion,
    expectedConfigurationSnapshotId: confirmed.snapshot.snapshotId,
    commandId: "package-ui-review-start",
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
      expectedConfigurationSnapshotId: confirmed.snapshot.snapshotId,
      commandId: "package-ui-review-complete",
    });
  if (!completed.ok || !completed.completionRecord)
    throw new Error(completed.ok ? "Missing record" : completed.message);
  return {
    session,
    content: contentResult.content,
    snapshot: confirmed.snapshot,
    review: completed.review,
    completion: completed.completionRecord,
  };
}

function createPackage(prepared: ReturnType<typeof prepareCompletedReview>) {
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
      commandId: "package-ui-create-command",
    });
  if (!result.ok) throw new Error(result.message);
  return result.package;
}

function submitPackage(
  prepared: ReturnType<typeof prepareCompletedReview>,
  packageValue = createPackage(prepared),
) {
  const result =
    useAuctionApprovalPackageStore.getState().submitApprovalPackage({
      packageId: packageValue.packageId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedPackageVersion: packageValue.packageVersion,
      expectedSessionVersion: prepared.session.currentVersion,
      expectedContentVersion: prepared.content.contentVersion,
      expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
      expectedReviewVersion: prepared.review.reviewVersion,
      expectedCompletionRecordId: prepared.completion.completionRecordId,
      commandId: "package-ui-submit-command",
    });
  if (!result.ok) throw new Error(result.message);
  return result.package;
}

function renderPackage(sessionId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/ops/auctions/${sessionId}/approval-package`]}
    >
      <Routes>
        <Route element={<Outlet context={{ role: "CONTENT_STAFF" }} />}>
          <Route
            path="/ops/auctions/:sessionId/approval-package"
            element={<AuctionApprovalPackagePage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderQueue(path = "/governance/auction-approval-packages") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/governance/auction-approval-packages"
          element={<AuctionApprovalPackageGovernanceQueuePage />}
        />
        <Route
          path="/governance/auction-approval-packages/:packageId"
          element={<AuctionApprovalPackageGovernanceDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Approval Package workspace and read-only ADMIN queue", () => {
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
    useDemoStore.setState({
      actorRole: "CONTENT_STAFF",
      adminAuthenticated: true,
    });
  });

  it("shows one H1, prototype boundary and creates an exact Package Draft", async () => {
    const prepared = prepareCompletedReview();
    const user = userEvent.setup();
    renderPackage(prepared.session.sessionId);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText(/MÔ HÌNH NỘI DUNG THỬ NGHIỆM/),
    ).toBeVisible();
    expect(
      screen.getByText(prepared.completion.completionRecordId),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: "Chuẩn bị hồ sơ phê duyệt",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Gửi hồ sơ phê duyệt" }),
    ).toBeVisible();
    expect(screen.getByText(/READY TO SUBMIT/)).toBeVisible();
    expect(
      useAuctionApprovalPackageStore.getState().packages,
    ).toHaveLength(1);
  });

  it("shows exact submission disclosures and submits to the ADMIN queue only", async () => {
    const prepared = prepareCompletedReview();
    createPackage(prepared);
    const user = userEvent.setup();
    renderPackage(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Gửi hồ sơ phê duyệt" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Gửi hồ sơ phê duyệt",
    });
    expect(dialog).toHaveTextContent(
      "Thao tác này chỉ gửi hồ sơ để Admin xem xét.",
    );
    expect(dialog).toHaveTextContent(
      "Thao tác này chưa tạo ra quyết định phê duyệt.",
    );
    expect(dialog).toHaveTextContent(
      "Phiên vẫn ở trạng thái BẢN NHÁP / CHƯA SẴN SÀNG.",
    );
    expect(dialog).toHaveTextContent(
      "Chưa tạo lịch hoặc xuất bản.",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Gửi hồ sơ phê duyệt",
      }),
    );
    expect(
      screen.getByText("Đã gửi để ADMIN xem xét"),
    ).toBeVisible();
    expect(screen.getByText("AWAITING_ADMIN_REVIEW")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Gửi hồ sơ phê duyệt" }),
    ).not.toBeInTheDocument();
    expect(useAuctionSessionStore.getState().sessions[0]).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
  });

  it("keeps stale Content from submitting and exposes explicit refresh", async () => {
    const prepared = prepareCompletedReview();
    createPackage(prepared);
    const saved = useAuctionContentStore.getState().saveAuctionContentDraft({
      contentId: prepared.content.contentId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedContentVersion: prepared.content.contentVersion,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "package-ui-content-drift",
      auctionTitle: prepared.content.workingContent.auctionTitle,
      auctionSummary: "Changed after package preparation.",
    });
    if (!saved.ok) throw new Error(saved.message);
    const user = userEvent.setup();
    renderPackage(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Gửi hồ sơ phê duyệt" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Gửi hồ sơ phê duyệt",
      }),
    );
    expect(
      screen
        .getAllByRole("alert")
        .some((alert) =>
          alert.textContent?.includes("CONTENT_REVIEW_COMPLETION_STALE"),
        ),
    ).toBe(true);
    expect(
      useAuctionApprovalPackageStore.getState().submissionRecords,
    ).toHaveLength(0);
    expect(
      screen.getByRole("button", {
        name: "Kiểm tra và làm mới hồ sơ",
      }),
    ).toBeVisible();
  });

  it("shows the required SGDG Configuration blocker with no package action", () => {
    const reference = useAssetReadinessStore
      .getState()
      .requestAssetReadinessReference({
        assetId: "AST-OMEGA-SPD-001",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "package-ui-sgdg-reference",
      });
    if (!reference.ok) throw new Error(reference.message);
    const created = useAuctionSessionStore
      .getState()
      .createSgdgManagedDraftSession({
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        commandId: "package-ui-sgdg-session",
        ownerId: CONTENT_STAFF_ACTOR_ID,
        assetReadinessReferenceId: reference.reference.referenceId,
        expectedAssetVersion: reference.reference.assetVersion,
        draft: {
          assetId: reference.reference.assetId,
          title: "SGDG Package blocker",
          purpose: "Listing Fee unresolved.",
          region: "Hà Nội",
          ownerId: CONTENT_STAFF_ACTOR_ID,
        },
      });
    if (!created.ok) throw new Error(created.message);
    renderPackage(created.session.sessionId);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION",
    );
    expect(
      screen.queryByRole("button", {
        name: "Chuẩn bị hồ sơ phê duyệt",
      }),
    ).not.toBeInTheDocument();
  });

  it("derives one read-only ADMIN queue item and detail with no decision controls", () => {
    const prepared = prepareCompletedReview();
    const submitted = submitPackage(prepared);
    act(() => {
      useDemoStore.setState({ actorRole: "ADMIN" });
    });
    const view = renderQueue();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(submitted.packageId)).toBeVisible();
    expect(
      screen.getAllByText("AWAITING_ADMIN_REVIEW").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Approve/i }),
    ).not.toBeInTheDocument();
    view.unmount();
    renderQueue(
      `/governance/auction-approval-packages/${submitted.packageId}`,
    );
    expect(screen.getByText("No approval decision has been made.")).toBeVisible();
    expect(
      screen.getAllByText(prepared.content.workingContent.auctionTitle)
        .length,
    ).toBeGreaterThan(0);
    for (const name of [/Approve/i, /Return/i, /Reject/i, /Schedule/i, /Publish/i])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("shows post-submission drift as warning without changing submitted evidence", () => {
    const prepared = prepareCompletedReview();
    const submitted = submitPackage(prepared);
    const before = structuredClone(submitted);
    useAuctionConfigurationStore.setState({ snapshots: [] });
    act(() => {
      useDemoStore.setState({ actorRole: "ADMIN" });
    });
    renderQueue(
      `/governance/auction-approval-packages/${submitted.packageId}`,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "SUBMITTED_PACKAGE_EVIDENCE_STALE",
    );
    expect(
      useAuctionApprovalPackageStore.getState().packages[0],
    ).toEqual(before);
  });

  it("projects Package state in the dynamic Session workspace", () => {
    const prepared = prepareCompletedReview();
    submitPackage(prepared);
    render(
      <MemoryRouter
        initialEntries={[`/ops/auctions/${prepared.session.sessionId}`]}
      >
        <Routes>
          <Route
            path="/ops/auctions/:sessionId"
            element={<AuctionSessionWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getAllByText(/Hồ sơ phê duyệt: SUBMITTED/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Hàng đợi Admin: AWAITING_ADMIN_REVIEW/)).toBeVisible();
    expect(screen.getByText("Phê duyệt phiên: NOT STARTED.")).toBeVisible();
    expect(screen.getAllByText(/DRAFT/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/NOT_READY/).length).toBeGreaterThan(0);
  });

  it("renders a controlled unauthorized state when invoked outside the route guard", () => {
    const prepared = prepareCompletedReview();
    act(() => {
      useDemoStore.setState({ actorRole: "ADMIN" });
    });
    renderPackage(prepared.session.sessionId);
    expect(screen.getByText("Không có quyền truy cập")).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Chuẩn bị hồ sơ phê duyệt",
      }),
    ).not.toBeInTheDocument();
  });
});
