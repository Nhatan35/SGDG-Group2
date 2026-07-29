import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { getAuctionRoomFeePolicy } from "../services/roomValueTierPolicy";
import { useAssetReadinessStore } from "../store/assetReadinessStore";
import {
  type AuctionConfigurationRules,
  useAuctionConfigurationStore,
} from "../store/auctionConfigurationStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useAuctionContentReviewStore } from "../store/auctionContentReviewStore";
import {
  type PersistedLinkedAuctionSession,
  type PersistedSgdgManagedSession,
  useAuctionSessionStore,
} from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import { AuctionContentPage } from "./ops/AuctionContentPage";
import { AuctionContentReviewPage } from "./ops/AuctionContentReviewPage";
import { AuctionSessionWorkspacePage } from "./ops/OperationsPages";

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
    commandId: "review-ui-request-submit",
    fields: {
      title: "Customer source title for Content Review",
      assetReference: "AST-CUS-REVIEW-UI",
      purpose: "Customer source purpose remains immutable and read-only.",
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
    commandId: "review-ui-request-review",
  });
  if (!reviewed.ok) throw new Error(reviewed.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewed.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewed.data.version,
      commandId: "review-ui-request-accept",
      reason: "Accepted for Content Review UI evidence.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "review-ui-linked-session",
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
    commandId: "review-ui-content-initialize",
  });
  if (!result.ok) throw new Error(result.message);
  return result.content;
}

function confirmConfiguration(session: PersistedLinkedAuctionSession) {
  const created = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId: "review-ui-config-create",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: created.proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: created.proposal.proposalVersion,
    commandId: "review-ui-config-save",
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
      commandId: "review-ui-config-apply",
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
      commandId: "review-ui-config-submit",
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const confirmed = useAuctionConfigurationStore
    .getState()
    .confirmConfigurationProposal({
      configurationId: submitted.proposal.configurationId,
      actorId: "admin.configuration@mock.local",
      actorRole: "ADMIN",
      expectedProposalVersion: submitted.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "review-ui-config-confirm",
    });
  if (!confirmed.ok || !confirmed.snapshot)
    throw new Error(confirmed.ok ? "Missing snapshot" : confirmed.message);
  return confirmed.snapshot;
}

function prepareCustomer({ incomplete = false } = {}) {
  const session = createLinkedSession();
  let content = initializeContent(session);
  if (incomplete) {
    const saved = useAuctionContentStore.getState().saveAuctionContentDraft({
      contentId: content.contentId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedContentVersion: content.contentVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "review-ui-make-incomplete",
      auctionTitle: content.workingContent.auctionTitle,
      auctionSummary: "",
    });
    if (!saved.ok) throw new Error(saved.message);
    content = saved.content;
  }
  const snapshot = confirmConfiguration(session);
  return { session, content, snapshot };
}

function createDirectSession(): PersistedSgdgManagedSession {
  const reference = useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId: "AST-OMEGA-SPD-001",
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "review-ui-sgdg-reference",
    });
  if (!reference.ok) throw new Error(reference.message);
  const created = useAuctionSessionStore
    .getState()
    .createSgdgManagedDraftSession({
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "review-ui-sgdg-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
      assetReadinessReferenceId: reference.reference.referenceId,
      expectedAssetVersion: reference.reference.assetVersion,
      draft: {
        assetId: reference.reference.assetId,
        title: "SGDG blocker session",
        purpose: "Keep Listing Fee unresolved.",
        region: "Hà Nội",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      },
    });
  if (!created.ok) throw new Error(created.message);
  return created.session;
}

function startReview(prepared: ReturnType<typeof prepareCustomer>) {
  const result = useAuctionContentReviewStore.getState().startContentReview({
    sessionId: prepared.session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: prepared.session.currentVersion,
    expectedContentId: prepared.content.contentId,
    expectedContentVersion: prepared.content.contentVersion,
    expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
    commandId: "review-ui-start-command",
  });
  if (!result.ok) throw new Error(result.message);
  return result.review;
}

function renderReview(sessionId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/ops/auctions/${sessionId}/content-review`]}
    >
      <Routes>
        <Route element={<Outlet context={{ role: "CONTENT_STAFF" }} />}>
          <Route
            path="/ops/auctions/:sessionId/content-review"
            element={<AuctionContentReviewPage />}
          />
          <Route
            path="/ops/auctions/:sessionId/content"
            element={<AuctionContentPage />}
          />
          <Route
            path="/ops/auctions/:sessionId"
            element={<AuctionSessionWorkspacePage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderWorkspace(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/ops/auctions/${sessionId}`]}>
      <Routes>
        <Route
          path="/ops/auctions/:sessionId"
          element={<AuctionSessionWorkspacePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Content Review page and Session readiness projection", () => {
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
    useDemoStore.setState({
      authenticated: true,
      adminAuthenticated: true,
      actorRole: "CONTENT_STAFF",
    });
  });

  it("renders exactly one H1 and the prototype classification", () => {
    renderReview(prepareCustomer().session.sessionId);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Thẩm định nội dung",
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "CHƯA ĐƯỢC CÁC BÊN LIÊN QUAN PHÊ DUYỆT",
    );
  });

  it("starts an eligible Customer review through one real primary command", async () => {
    const user = userEvent.setup();
    const prepared = prepareCustomer();
    renderReview(prepared.session.sessionId);
    const start = screen.getByRole("button", {
      name: "Bắt đầu thẩm định nội dung",
    });
    expect(start).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: /Bắt đầu thẩm định nội dung|Kiểm tra lại hồ sơ phiên|Hoàn tất thẩm định nội dung/,
      }),
    ).toHaveLength(1);
    await user.click(start);
    expect(useAuctionContentReviewStore.getState().reviews).toHaveLength(1);
    expect(
      screen.getByText("CONTENT_REVIEW_READY_TO_COMPLETE"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hoàn tất thẩm định nội dung" }),
    ).toBeInTheDocument();
  });

  it("shows the exact SGDG Configuration blocker with no start action", () => {
    const session = createDirectSession();
    renderReview(session.sessionId);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION",
    );
    expect(alert).toHaveTextContent(
      "Phiên SGDG-managed chưa có cấu hình hiện hành",
    );
    expect(
      screen.queryByRole("button", { name: "Bắt đầu thẩm định nội dung" }),
    ).not.toBeInTheDocument();
    expect(useAuctionContentReviewStore.getState().reviews).toEqual([]);
  });

  it("renders Opening Request, Content, Configuration, and Membership evidence read-only", () => {
    const prepared = prepareCustomer();
    renderReview(prepared.session.sessionId);
    const source = screen.getByRole("heading", {
      name: "Thông tin yêu cầu mở phiên",
    }).closest("section")!;
    expect(source).toHaveTextContent(prepared.session.openingRequestId!);
    expect(source).toHaveTextContent("Customer source");
    const contentCard = screen.getByRole("heading", {
      name: "Nội dung đấu giá hiện tại",
    }).closest("section")!;
    expect(contentCard).toHaveTextContent(prepared.content.contentId);
    expect(contentCard.querySelector("input, textarea")).toBeNull();
    const configCard = screen.getByRole("heading", {
      name: "Bằng chứng cấu hình",
    }).closest("section")!;
    expect(within(configCard).getByText(/snapshot/)).toBeInTheDocument();
    const membershipCard = screen.getByRole("heading", {
      name: "Thông tin thành viên",
    }).closest("section")!;
    expect(within(membershipCard).getByText("MEMBERSHIP-MOCK-V1")).toBeInTheDocument();
  });

  it("shows Content-owned summary finding, explicit owner, and correction link without an editor", async () => {
    const user = userEvent.setup();
    const prepared = prepareCustomer({ incomplete: true });
    renderReview(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Bắt đầu thẩm định nội dung" }),
    );
    expect(screen.getByText("AUCTION_SUMMARY_REQUIRED")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Phụ trách: Nhân viên nội dung \(CONTENT_STAFF\)/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Mở nội dung đấu giá để chỉnh sửa auctionSummary",
      }),
    ).toHaveAttribute(
      "href",
      `/ops/auctions/${prepared.session.sessionId}/content`,
    );
    expect(screen.queryByLabelText(/Tóm tắt phiên đấu giá/)).not.toBeInTheDocument();
  });

  it("shows changed Content version and adopts it only after explicit UI revalidation", async () => {
    const user = userEvent.setup();
    const prepared = prepareCustomer({ incomplete: true });
    const review = startReview(prepared);
    renderReview(prepared.session.sessionId);
    let corrected: ReturnType<
      ReturnType<
        typeof useAuctionContentStore.getState
      >["saveAuctionContentDraft"]
    >;
    act(() => {
      corrected = useAuctionContentStore.getState().saveAuctionContentDraft({
        contentId: prepared.content.contentId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: prepared.content.contentVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "review-ui-correct-content",
        auctionTitle: prepared.content.workingContent.auctionTitle,
        auctionSummary:
          "Corrected summary in canonical Auction Content workspace.",
      });
    });
    // Assigned synchronously by the canonical Zustand command.
    const correctedResult = corrected!;
    if (!correctedResult.ok) throw new Error(correctedResult.message);
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Hồ sơ thẩm định đang giữ nội dung v${review.lastEvaluatedContentVersion}`,
    );
    expect(
      screen.getAllByText(
        new RegExp(`v${correctedResult.content.contentVersion}`),
      ).length,
    ).toBeGreaterThan(0);
    await user.click(
      screen.getByRole("button", { name: "Kiểm tra lại hồ sơ phiên" }),
    );
    expect(
      useAuctionContentReviewStore.getState().reviews[0],
    ).toMatchObject({
      reviewVersion: 2,
      lastEvaluatedContentVersion: correctedResult.content.contentVersion,
      status: "READY_TO_COMPLETE",
    });
    expect(screen.queryByText("AUCTION_SUMMARY_REQUIRED")).not.toBeInTheDocument();
  });

  it("keeps page context and reports stale Content as an alert", () => {
    const prepared = prepareCustomer();
    startReview(prepared);
    renderReview(prepared.session.sessionId);
    act(() => {
      useAuctionContentStore.setState({
        contents: [
          {
            ...prepared.content,
            contentVersion: prepared.content.contentVersion + 1,
          },
        ],
      });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dữ liệu chính thức đã thay đổi",
    );
    expect(
      screen.getByRole("heading", { name: "Mức độ sẵn sàng của hồ sơ" }),
    ).toBeInTheDocument();
    expect(useAuctionContentReviewStore.getState().completionRecords).toEqual(
      [],
    );
  });

  it("completion Dialog contains exact evidence and the no-package boundary", async () => {
    const user = userEvent.setup();
    const prepared = prepareCustomer();
    startReview(prepared);
    renderReview(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Hoàn tất thẩm định nội dung" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Hoàn tất thẩm định nội dung",
    });
    expect(dialog).toHaveTextContent(
      `${prepared.session.sessionId} · v${prepared.session.currentVersion}`,
    );
    expect(dialog).toHaveTextContent(
      `${prepared.content.contentId} · v${prepared.content.contentVersion}`,
    );
    expect(dialog).toHaveTextContent(prepared.snapshot.snapshotId);
    expect(dialog).toHaveTextContent("Thao tác này chỉ hoàn tất bước thẩm định nội dung.");
    expect(dialog).toHaveTextContent(
      "Chưa tạo hoặc gửi hồ sơ phê duyệt.",
    );
    expect(dialog).toHaveTextContent("Phiên vẫn ở trạng thái BẢN NHÁP / CHƯA SẴN SÀNG.");
  });

  it("executes completion once, announces success, and renders immutable evidence read-only", async () => {
    const user = userEvent.setup();
    const prepared = prepareCustomer();
    startReview(prepared);
    renderReview(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Hoàn tất thẩm định nội dung" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Hoàn tất thẩm định" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/Biên bản hoàn tất:/)).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(
      screen.getByRole("heading", {
        name: "Sẵn sàng chuẩn bị hồ sơ phê duyệt",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Sẵn sàng chuẩn bị hồ sơ phê duyệt").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole("button", { name: "Hoàn tất thẩm định nội dung" }),
    ).not.toBeInTheDocument();
    expect(useAuctionContentReviewStore.getState().completionRecords).toHaveLength(
      1,
    );
  });

  it("Session workspace projects completion, readiness wording, and unchanged lifecycle", () => {
    const prepared = prepareCustomer();
    const review = startReview(prepared);
    const completed = useAuctionContentReviewStore
      .getState()
      .completeContentReview({
        reviewId: review.reviewId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: review.reviewVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        expectedContentVersion: prepared.content.contentVersion,
        expectedConfigurationSnapshotId: prepared.snapshot.snapshotId,
        commandId: "review-ui-complete-for-workspace",
      });
    if (!completed.ok) throw new Error(completed.message);
    renderWorkspace(prepared.session.sessionId);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(
      screen.getByText(/Sẵn sàng chuẩn bị hồ sơ phê duyệt/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Phiên: DRAFT · Công bố: NOT_READY/)).toBeInTheDocument();
    expect(screen.getAllByText(/Hồ sơ phê duyệt: NOT CREATED/).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Submit for Approval" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Schedule action/)).not.toBeInTheDocument();
  });

  for (const actorRole of ["CUSTOMER", "ADMIN"] as const) {
    it(`${actorRole} cannot mutate through the Content Review page`, () => {
      const prepared = prepareCustomer();
      useDemoStore.setState({
        adminAuthenticated: actorRole === "ADMIN",
        actorRole,
      });
      renderReview(prepared.session.sessionId);
      expect(
        screen.getByRole("heading", { name: "Không có quyền truy cập" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Bắt đầu thẩm định nội dung" }),
      ).not.toBeInTheDocument();
      expect(useAuctionContentReviewStore.getState().reviews).toEqual([]);
    });
  }

  it("renders long internal IDs inside wrapping evidence containers", () => {
    const prepared = prepareCustomer();
    startReview(prepared);
    renderReview(prepared.session.sessionId);
    expect(
      screen.getByText(/content-review-linked-orq-cus-2026-001-v4/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mức độ sẵn sàng của hồ sơ" }).closest(
        ".content-review-card",
      ),
    ).toHaveClass("content-review-card");
  });
});
