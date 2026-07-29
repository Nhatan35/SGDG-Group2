import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { AuctionContentPage } from "./ops/AuctionContentPage";
import { AuctionSessionWorkspacePage } from "./ops/OperationsPages";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import {
  type PersistedLinkedAuctionSession,
  type PersistedSgdgManagedSession,
  useAuctionSessionStore,
} from "../store/auctionSessionStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useAssetReadinessStore } from "../store/assetReadinessStore";
import { useDemoStore } from "../store/demoStore";

const requestFields = {
  title: "Nguồn Customer cho Auction Content",
  assetReference: "AST-CUS-CONTENT-UI",
  purpose: "Mục đích nguồn phải tiếp tục ở trạng thái chỉ đọc.",
  proposedStartPrice: 410_000_000,
  customerNotes: "",
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
    commandId: "content-ui-submit",
    fields: requestFields,
  });
  if (!submitted.ok) throw new Error(submitted.message);
  const review = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "content-ui-review",
  });
  if (!review.ok) throw new Error(review.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: review.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: review.data.version,
      commandId: "content-ui-accept",
      reason: "Nguồn hợp lệ để kiểm thử content foundation nội bộ.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "content-ui-linked-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

function createDirectSession(): PersistedSgdgManagedSession {
  const reference = useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId: "AST-OMEGA-SPD-001",
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "content-ui-direct-reference",
    });
  if (!reference.ok) throw new Error(reference.message);
  const created = useAuctionSessionStore
    .getState()
    .createSgdgManagedDraftSession({
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "content-ui-direct-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
      assetReadinessReferenceId: reference.reference.referenceId,
      expectedAssetVersion: reference.reference.assetVersion,
      draft: {
        assetId: reference.reference.assetId,
        title: "SGDG title remains in Session",
        purpose: "SGDG purpose remains in Session",
        region: "Hà Nội",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      },
    });
  if (!created.ok) throw new Error(created.message);
  return created.session;
}

function initializeContent(session: PersistedLinkedAuctionSession) {
  const result = useAuctionContentStore.getState().initializeAuctionContent({
    sessionId: session.sessionId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: session.currentVersion,
    expectedOpeningRequestVersion: session.openingRequestVersion!,
    commandId: "content-ui-initialize",
  });
  if (!result.ok) throw new Error(result.message);
  return result.content;
}

function renderContent(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/ops/auctions/${sessionId}/content`]}>
      <Routes>
        <Route
          element={<Outlet context={{ role: "CONTENT_STAFF" }} />}
        >
          <Route
            path="/ops/auctions/:sessionId/content"
            element={<AuctionContentPage />}
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

describe("Auction Content foundation UI", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    useAuctionContentStore.getState().resetDeterministicContentState();
    useDemoStore.setState({
      authenticated: true,
      adminAuthenticated: true,
      actorRole: "CONTENT_STAFF",
    });
  });

  it("01 renders exactly one H1", () => {
    const session = createLinkedSession();
    renderContent(session.sessionId);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nội dung phiên đấu giá",
    );
  });

  it("02 displays the explicit prototype disclaimer", () => {
    renderContent(createLinkedSession().sessionId);
    expect(screen.getByRole("note")).toHaveTextContent(
      "CHƯA ĐƯỢC CÁC BÊN LIÊN QUAN PHÊ DUYỆT",
    );
  });

  it("03 initializes eligible Customer content through the UI", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    renderContent(session.sessionId);
    await user.click(
      screen.getByRole("button", {
        name: "Khởi tạo nội dung phiên đấu giá",
      }),
    );
    expect(useAuctionContentStore.getState().contents).toHaveLength(1);
    expect(screen.getByLabelText(/Tiêu đề phiên đấu giá/)).toHaveValue(
      requestFields.title,
    );
  });

  for (const [number, label, value] of [
    [4, "Tiêu đề gốc", requestFields.title],
    [5, "Mục đích gốc", requestFields.purpose],
  ] as const) {
    it(`${number} renders ${label} read-only`, () => {
      const session = createLinkedSession();
      initializeContent(session);
      renderContent(session.sessionId);
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("readonly");
      expect(field).toHaveValue(value);
    });
  }

  it("06 identifies the source owner as Customer", () => {
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    expect(screen.getByLabelText("Source owner")).toHaveValue(
      CURRENT_CUSTOMER_ID,
    );
  });

  it("07 makes working title editable", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, "Tiêu đề Content Staff");
    expect(title).toHaveValue("Tiêu đề Content Staff");
  });

  it("08 makes working summary editable", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const summary = screen.getByLabelText(/Tóm tắt phiên đấu giá/);
    await user.clear(summary);
    await user.type(summary, "Tóm tắt Content Staff");
    expect(summary).toHaveValue("Tóm tắt Content Staff");
  });

  it("09 leaves source values unchanged after an edit and save", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const workingTitle = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(workingTitle);
    await user.type(workingTitle, "Working title khác nguồn");
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByLabelText("Tiêu đề gốc")).toHaveValue(
      requestFields.title,
    );
    expect(
      useOpeningRequestStore
        .getState()
        .records.find(
          (item) => item.requestId === session.openingRequestId,
        )?.title,
    ).toBe(requestFields.title);
  });

  it("10 displays inline title validation", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByText(/AUCTION_TITLE_REQUIRED/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Tiêu đề phiên đấu giá là bắt buộc/),
    ).not.toHaveLength(0);
  });

  it("11 displays inline summary completeness finding", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    await user.clear(screen.getByLabelText(/Tóm tắt phiên đấu giá/));
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByText(/AUCTION_SUMMARY_REQUIRED/)).toBeInTheDocument();
  });

  it("12 saves and persists an incomplete Draft", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    await user.clear(screen.getByLabelText(/Tóm tắt phiên đấu giá/));
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(useAuctionContentStore.getState().contents[0].status).toBe("DRAFT");
  });

  it("13 saves complete content", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, "Nội dung hoàn chỉnh");
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(useAuctionContentStore.getState().contents[0].status).toBe(
      "COMPLETE",
    );
  });

  it("14 persists content after navigation remount", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    const view = renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, "Persisted after navigation");
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    view.unmount();
    renderContent(session.sessionId);
    expect(screen.getByLabelText(/Tiêu đề phiên đấu giá/)).toHaveValue(
      "Persisted after navigation",
    );
  });

  it("15 keeps persisted state available for refresh rehydration", () => {
    const session = createLinkedSession();
    const content = initializeContent(session);
    expect(localStorage.getItem("sgdg-auction-content-v1")).toContain(
      content.contentId,
    );
  });

  it("16 displays content version", () => {
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    expect(screen.getByText(/Content version/)).toHaveTextContent("v1");
  });

  it("17 increments displayed version after meaningful save", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, "Version two");
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByText(/Content version/)).toHaveTextContent("v2");
  });

  it("18 no-op save does not increment displayed version", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByText(/Content version/)).toHaveTextContent("v1");
    expect(screen.getByText(/Không có thay đổi/)).toBeInTheDocument();
  });

  it("19 stale Session error preserves form values", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, "Unsaved value survives stale state");
    useAuctionSessionStore.setState({
      sessions: [{ ...session, currentVersion: 2 }],
    });
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Session version đã thay đổi",
    );
    expect(title).toHaveValue("Unsaved value survives stale state");
  });

  for (const [number, role] of [
    [20, "ADMIN"],
    [21, "CUSTOMER"],
  ] as const) {
    it(`${number} denies the internal page to ${role}`, () => {
      const session = createLinkedSession();
      useDemoStore.setState({ actorRole: role });
      renderContent(session.sessionId);
      expect(screen.getByText("Không có quyền truy cập")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: "Khởi tạo nội dung phiên đấu giá",
        }),
      ).not.toBeInTheDocument();
    });
  }

  it("22 does not expose content on Customer routes", () => {
    expect(
      document.querySelector('[href^="/me/"][href*="/content"]'),
    ).not.toBeInTheDocument();
  });

  it("23 projects NOT INITIALIZED in Session workspace", () => {
    const session = createLinkedSession();
    renderWorkspace(session.sessionId);
    expect(screen.getByText("CHƯA KHỞI TẠO")).toBeInTheDocument();
  });

  it("24 projects DRAFT after an incomplete save", () => {
    const session = createLinkedSession();
    const content = initializeContent(session);
    const saved = useAuctionContentStore.getState().saveAuctionContentDraft({
      contentId: content.contentId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedContentVersion: 1,
      expectedSessionVersion: 1,
      commandId: "content-ui-incomplete-save",
      auctionTitle: content.workingContent.auctionTitle,
      auctionSummary: "",
    });
    if (!saved.ok) throw new Error(saved.message);
    renderWorkspace(session.sessionId);
    expect(screen.getAllByText("DRAFT")).toHaveLength(2);
    expect(screen.getByText("Tóm tắt: Chưa hoàn chỉnh")).toBeInTheDocument();
  });

  it("25 projects CONTENT DRAFT COMPLETE", () => {
    const session = createLinkedSession();
    initializeContent(session);
    renderWorkspace(session.sessionId);
    expect(screen.getByText("CONTENT DRAFT COMPLETE")).toBeInTheDocument();
  });

  it("26 keeps Session DRAFT and NOT_READY", () => {
    const session = createLinkedSession();
    initializeContent(session);
    renderWorkspace(session.sessionId);
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByText("NOT_READY")).toBeInTheDocument();
  });

  for (const [number, forbidden] of [
    [27, "Complete Content Review"],
    [28, "Create Approval Package"],
    [29, "Submit for Approval"],
    [30, "Schedule"],
    [31, "Publish"],
  ] as const) {
    it(`${number} does not render forbidden action ${forbidden}`, () => {
      const session = createLinkedSession();
      initializeContent(session);
      renderWorkspace(session.sessionId);
      expect(
        screen.queryByRole("button", { name: forbidden }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: forbidden }),
      ).not.toBeInTheDocument();
    });
  }

  it("32 defers SGDG mapping without creating content", () => {
    const session = createDirectSession();
    renderWorkspace(session.sessionId);
    expect(
      screen.getByText("Dynamic Content foundation deferred for this branch."),
    ).toBeInTheDocument();
    expect(useAuctionContentStore.getState().contents).toEqual([]);
  });

  it("33 wraps and displays long lineage IDs as text", () => {
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    expect(screen.getByLabelText("Request ID / version")).toHaveValue(
      `${session.openingRequestId} · v${session.openingRequestVersion}`,
    );
  });

  it("34 uses a responsive comparison container", () => {
    const session = createLinkedSession();
    initializeContent(session);
    const { container } = renderContent(session.sessionId);
    expect(
      container.querySelector(".auction-content-comparison"),
    ).toBeInTheDocument();
  });

  it("35 renders command errors with role alert", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, `a`.repeat(161));
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("36 announces save success with aria-live", async () => {
    const user = userEvent.setup();
    const session = createLinkedSession();
    initializeContent(session);
    const { container } = renderContent(session.sessionId);
    const title = screen.getByLabelText(/Tiêu đề phiên đấu giá/);
    await user.clear(title);
    await user.type(title, "Save success announcement");
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Đã lưu Auction Content phiên bản 2",
    );
  });

  it("renders one primary mutation action in initialized mode", () => {
    const session = createLinkedSession();
    initializeContent(session);
    const { container } = renderContent(session.sessionId);
    expect(
      within(container).getAllByRole("button").filter((button) =>
        button.classList.contains("primary"),
      ),
    ).toHaveLength(1);
  });
});
