import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import {
  AuctionConfigurationGovernanceDetailPage,
  AuctionConfigurationGovernanceQueuePage,
} from "./governance/AuctionConfigurationGovernancePages";
import {
  AuctionSessionWorkspacePage,
  RuleConfigurationPage,
} from "./ops/OperationsPages";
import { useAssetReadinessStore } from "../store/assetReadinessStore";
import {
  type PersistedAuctionSession,
  type PersistedLinkedAuctionSession,
  type PersistedSgdgManagedSession,
  useAuctionSessionStore,
} from "../store/auctionSessionStore";
import {
  type AuctionConfigurationProposal,
  useAuctionConfigurationStore,
} from "../store/auctionConfigurationStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import {
  AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  SGDG_MANAGED_FEE_DECISION_MESSAGE,
} from "../services/roomValueTierPolicy";

const assetId = "AST-OMEGA-SPD-001";

function createDirectSession(): PersistedSgdgManagedSession {
  const reference = useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "ui-config-reference",
    });
  if (!reference.ok) throw new Error(reference.message);
  const created = useAuctionSessionStore
    .getState()
    .createSgdgManagedDraftSession({
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "ui-config-session",
      draft: {
        assetId,
        title: "Omega governed configuration UI",
        purpose: "Prepare configuration governance evidence",
        region: "Ho Chi Minh City",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      },
      assetReadinessReferenceId: reference.reference.referenceId,
      expectedAssetVersion: reference.reference.assetVersion,
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!created.ok) throw new Error(created.message);
  return created.session;
}

function createLinkedSession(): PersistedLinkedAuctionSession {
  const draft = useOpeningRequestStore
    .getState()
    .records.find(
      (item) =>
        item.ownerId === CURRENT_CUSTOMER_ID && item.status === "DRAFT",
    )!;
  const submitted = useOpeningRequestStore
    .getState()
    .submitOpeningRequest({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "ui-config-linked-submit",
      fields: {
        title: "Customer requested configuration UI",
        assetReference: "AST-CUS-CONFIG-UI",
        purpose: "Prepare linked Session configuration",
        proposedStartPrice: 1_000_000_000,
        customerNotes: "",
        declarationAccepted: true,
      },
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const review = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "ui-config-linked-review",
  });
  if (!review.ok) throw new Error(review.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: review.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: review.data.version,
      commandId: "ui-config-linked-accept",
      reason: "Eligible for linked Session configuration preparation.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "ui-config-linked-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

const readyRules = {
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
};

function createSavedProposal(
  session: PersistedAuctionSession,
): AuctionConfigurationProposal {
  const created = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId: "ui-create-configuration",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: created.proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: created.proposal.proposalVersion,
    commandId: "ui-save-configuration",
    values: readyRules,
  });
  if (!saved.ok) throw new Error(saved.message);
  return saved.proposal;
}

function submit(
  session: PersistedAuctionSession,
  proposal: AuctionConfigurationProposal,
) {
  const applied = useAuctionConfigurationStore
    .getState()
    .applyAuctionRoomMemberFeeResolution({
      configurationId: proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      expectedPolicyVersion: 2,
      commandId: `ui-policy-${proposal.proposalVersion}`,
    });
  if (!applied.ok) throw new Error(applied.message);
  const result = useAuctionConfigurationStore
    .getState()
    .submitConfigurationProposal({
      configurationId: applied.proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: applied.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: `ui-submit-${applied.proposal.proposalVersion}`,
    });
  if (!result.ok) throw new Error(result.message);
  return result.proposal;
}

function renderStaffRules(
  sessionId: string,
  role: "CONTENT_STAFF" | "ADMIN" = "CONTENT_STAFF",
) {
  return render(
    <MemoryRouter initialEntries={[`/ops/auctions/${sessionId}/rules`]}>
      <Routes>
        <Route element={<Outlet context={{ role }} />}>
          <Route
            path="/ops/auctions/:sessionId/rules"
            element={<RuleConfigurationPage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderAdminQueue() {
  return render(
    <MemoryRouter
      initialEntries={["/governance/auction-configurations"]}
    >
      <Routes>
        <Route element={<Outlet context={{ role: "ADMIN" }} />}>
          <Route
            path="/governance/auction-configurations"
            element={<AuctionConfigurationGovernanceQueuePage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderAdminDetail(configurationId: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/governance/auction-configurations/${configurationId}`,
      ]}
    >
      <Routes>
        <Route element={<Outlet context={{ role: "ADMIN" }} />}>
          <Route
            path="/governance/auction-configurations/:configurationId"
            element={<AuctionConfigurationGovernanceDetailPage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderSessionWorkspace(sessionId: string) {
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

describe("Auction Configuration preparation and governance UI", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAssetReadinessStore.getState().resetDeterministicAssetReadinessState();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useAuctionConfigurationStore
      .getState()
      .resetDeterministicConfigurationState();
  });

  it("renders one H1 and creates a persisted direct Configuration Draft", async () => {
    const session = createDirectSession();
    const user = userEvent.setup();
    renderStaffRules(session.sessionId);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("SGDG_MANAGED · governed read-only")).toBeVisible();
    expect(screen.getByText("DIRECT_SGDG")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Tạo đề xuất cấu hình" }),
    );
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalBySessionId(session.sessionId),
    ).toMatchObject({ status: "DRAFT", proposalVersion: 1 });
    expect(
      screen.getAllByText(AUCTION_ROOM_FEE_POLICY_DISCLAIMER)[0],
    ).toBeVisible();
  });

  it("loads a Customer-requested dynamic Session with read-only source mode", async () => {
    const session = createLinkedSession();
    const user = userEvent.setup();
    renderStaffRules(session.sessionId);
    expect(
      screen.getByText("CUSTOMER_REQUESTED · governed read-only"),
    ).toBeVisible();
    expect(screen.getByText("OPENING_REQUEST")).toBeVisible();
    expect(
      screen.getByText(
        new RegExp(`Opening Request lineage: ${session.openingRequestId}`),
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Tạo đề xuất cấu hình" }),
    );
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalBySessionId(session.sessionId),
    ).toMatchObject({
      creationSource: "OPENING_REQUEST",
      managementMode: "CUSTOMER_REQUESTED",
    });
  });

  it("shows a customer member title and raw MP fee as read-only source evidence", () => {
    const session = createLinkedSession();
    const created = useAuctionConfigurationStore
      .getState()
      .createConfigurationDraft({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: session.currentVersion,
        commandId: "ui-member-fee-create",
      });
    if (!created.ok) throw new Error(created.message);
    const saved = useAuctionConfigurationStore
      .getState()
      .saveConfigurationDraft({
        configurationId: created.proposal.configurationId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedProposalVersion: created.proposal.proposalVersion,
        commandId: "ui-member-fee-save",
        values: {
          ...readyRules,
          startingPrice: 4_000_000,
          minimumIncrement: 1_000_000,
        },
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
        expectedPolicyVersion: 2,
        commandId: "ui-member-fee-apply",
      });
    if (!applied.ok) throw new Error(applied.message);

    renderStaffRules(session.sessionId);
    expect(screen.getAllByText(/PRICE-BAND-ROOM-1/)[0]).toBeVisible();
    expect(screen.getByText(/ROOM-1 · Phòng 1/)).toBeVisible();
    expect(screen.getByText("VANG")).toBeVisible();
    expect(screen.getByText("MEMBERSHIP-MOCK-V1")).toBeVisible();
    expect(screen.getByText(/MP theo bảng nguồn · MP\/1SP/)).toBeVisible();
    expect(
      screen.getByText(
        /PROTOTYPE INTERPRETATION — MP ASSUMED TO MEAN MIỄN PHÍ/,
      ),
    ).toBeVisible();
    expect(screen.queryByRole("combobox", { name: /Room/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Member/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /VIP|Event/i })).toBeNull();
  });

  it("saves supported values, displays inline validation, and resumes after remount", async () => {
    const session = createDirectSession();
    const user = userEvent.setup();
    const view = renderStaffRules(session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Tạo đề xuất cấu hình" }),
    );
    await user.type(screen.getByLabelText("Giá khởi điểm"), "2900000000");
    await user.type(screen.getByLabelText("Bước giá tối thiểu"), "25000000");
    await user.selectOptions(
      screen.getByLabelText(/deposit policy reference/i),
      "DEP-STD-01",
    );
    await user.selectOptions(
      screen.getByLabelText(/eligibility policy reference/i),
      "ELG-STD-01",
    );
    await user.selectOptions(
      screen.getByLabelText(/extension policy reference/i),
      "EXT-02",
    );
    await user.selectOptions(
      screen.getByLabelText(/fallback policy reference/i),
      "FB-READONLY",
    );
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    expect(screen.getByText(/Đã lưu Configuration Draft/)).toBeVisible();
    view.unmount();
    renderStaffRules(session.sessionId);
    expect(screen.getByLabelText("Giá khởi điểm")).toHaveValue("2900000000");
    expect(screen.getAllByText(/proposal v2/i).length).toBeGreaterThan(0);

    const price = screen.getByLabelText("Giá khởi điểm");
    await user.clear(price);
    await user.type(price, "Infinity");
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    expect(
      screen.getAllByRole("alert").some((item) =>
        item.textContent?.includes("VALIDATION_ERROR"),
      ),
    ).toBe(true);
    expect(price).toHaveValue("Infinity");
  });

  it("shows read-only prototype derivation and lets only Content Staff apply it", async () => {
    const session = createDirectSession();
    const saved = createSavedProposal(session);
    const user = userEvent.setup();
    const staffView = renderStaffRules(session.sessionId);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByText(AUCTION_ROOM_FEE_POLICY_DISCLAIMER).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/SGDG-ROOM-FEE-2017-PROTOTYPE · v2/),
    ).toBeVisible();
    expect(
      screen.getByText(/PRICE-BAND-ROOM-3 · Dải giá Phòng 3/),
    ).toBeVisible();
    expect(
      screen.getByText(/ROOM-3 · Phòng 3/),
    ).toBeVisible();
    expect(screen.queryByLabelText(/Room/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Value Tier/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Resolve Auction Room and Member Listing Fee",
      }),
    );
    expect(
      screen.getByText(/Ordinary Auction Room resolved/),
    ).toBeVisible();
    expect(screen.getAllByText(SGDG_MANAGED_FEE_DECISION_MESSAGE)[0]).toBeVisible();
    expect(
      useAuctionConfigurationStore.getState().getProposalById(
        saved.configurationId,
      ),
    ).toMatchObject({
      proposalVersion: 3,
      roomResolutionState: "APPLIED",
      listingFeeResolutionState: "BUSINESS_DECISION_REQUIRED",
      overallConfigurationResolutionState: "BUSINESS_DECISION_REQUIRED",
      priceBandResolution: { reference: "PRICE-BAND-ROOM-3" },
      roomResolution: { roomReference: "ROOM-3" },
      listingFeeResolution: {
        applicability: "BUSINESS_DECISION_REQUIRED",
      },
    });
    expect(
      screen.getByRole("button", { name: "Gửi xác nhận" }),
    ).toBeDisabled();
    staffView.unmount();
    renderStaffRules(session.sessionId, "ADMIN");
    expect(
      screen.queryByRole("button", {
        name: "Resolve Auction Room and Member Listing Fee",
      }),
    ).not.toBeInTheDocument();
  });

  it("submits saved rules and renders the proposal read-only", async () => {
    const session = createLinkedSession();
    const submitted = submit(session, createSavedProposal(session));
    renderStaffRules(session.sessionId);
    expect(screen.getByText("SUBMITTED")).toBeVisible();
    expect(screen.getByText(/Đang chờ ADMIN xác nhận/)).toBeVisible();
    expect(screen.getByLabelText("Giá khởi điểm")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Gửi xác nhận" }),
    ).not.toBeInTheDocument();
    expect(submitted.proposalVersion).toBe(4);
  });

  it("lists submitted proposals in the narrow ADMIN queue", () => {
    const session = createLinkedSession();
    const submitted = submit(session, createSavedProposal(session));
    renderAdminQueue();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Phê duyệt cấu hình phiên",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: submitted.configurationId }),
    ).toHaveAttribute(
      "href",
      `/governance/auction-configurations/${submitted.configurationId}`,
    );
    expect(
      screen.getByText("OPENING_REQUEST · CUSTOMER_REQUESTED"),
    ).toBeVisible();
  });

  it("requires correction reason/section and exposes correction context to Staff", async () => {
    const session = createLinkedSession();
    const submitted = submit(session, createSavedProposal(session));
    const user = userEvent.setup();
    const detail = renderAdminDetail(submitted.configurationId);
    await user.click(
      screen.getByRole("button", { name: "Yêu cầu chỉnh sửa" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Yêu cầu chỉnh sửa cấu hình",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Xác nhận trả lại",
    });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText("Lý do yêu cầu chỉnh sửa"),
      "Minimum increment requires a documented correction.",
    );
    await user.click(within(dialog).getByLabelText("ROOM"));
    await user.click(within(dialog).getByLabelText("MEMBER_FEE"));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(screen.getByText(/Đã trả/)).toBeVisible();
    detail.unmount();
    renderStaffRules(session.sessionId);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "ADMIN yêu cầu chỉnh sửa",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Minimum increment requires a documented correction.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Gửi lại xác nhận" }),
    ).toBeVisible();
  });

  it("shows exact prototype evidence and confirms Configuration only", async () => {
    const session = createLinkedSession();
    const submitted = submit(session, createSavedProposal(session));
    const user = userEvent.setup();
    const detail = renderAdminDetail(submitted.configurationId);
    await user.click(
      screen.getByRole("button", { name: "Xác nhận cấu hình" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Xác nhận cấu hình",
    });
    expect(
      within(dialog).getByText(/Phiên vẫn ở trạng thái bản nháp\/chưa sẵn sàng/),
    ).toBeVisible();
    expect(
      within(dialog).getByText(/PRICE-BAND-ROOM-3/),
    ).toBeVisible();
    expect(
      within(dialog).getByText(/ROOM-3 · Phòng 3/),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", {
        name: "Xác nhận cấu hình",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/immutable snapshot/)).toBeVisible();
    expect(useAuctionConfigurationStore.getState().snapshots).toHaveLength(1);
    detail.unmount();
    renderSessionWorkspace(session.sessionId);
    expect(screen.getByText(/Configuration đã xác nhận/)).toBeVisible();
    expect(screen.getAllByText(/PRICE-BAND-ROOM-3/)[0]).toBeVisible();
    expect(screen.getAllByText(/ROOM-3/)[0]).toBeVisible();
    expect(screen.getByText("DRAFT")).toBeVisible();
    expect(screen.getByText("NOT_READY")).toBeVisible();
  });

  it("projects submitted configuration into the dynamic Session without later-phase actions", () => {
    const session = createLinkedSession();
    submit(session, createSavedProposal(session));
    renderSessionWorkspace(session.sessionId);
    expect(
      screen.getByText("Configuration đang chờ governed confirmation."),
    ).toBeVisible();
    expect(screen.getByText("DRAFT")).toBeVisible();
    expect(screen.getByText("NOT_READY")).toBeVisible();
    expect(screen.getByText("Approval Package chưa được tạo.")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Schedule|Publish/i }),
    ).not.toBeInTheDocument();
  });

  it("labels compatibility fixture terminology as legacy and outside the current dynamic policy", () => {
    renderStaffRules("royal-oak-15500st-draft");
    expect(screen.getByText("Legacy fixture Configuration.")).toBeVisible();
    expect(
      screen.getByText(
        /This fixture is not governed by the current dynamic Auction Room and Member Listing Fee policy/,
      ),
    ).toBeVisible();
    expect(screen.queryByText(/Room \/ value tier/i)).not.toBeInTheDocument();
  });

  it("closes Dialog with Escape and returns focus to the initiating action", async () => {
    const session = createLinkedSession();
    const submitted = submit(session, createSavedProposal(session));
    const user = userEvent.setup();
    renderAdminDetail(submitted.configurationId);
    const opener = screen.getByRole("button", {
      name: "Yêu cầu chỉnh sửa",
    });
    opener.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
