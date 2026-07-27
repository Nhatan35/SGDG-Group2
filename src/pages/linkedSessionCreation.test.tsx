import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import {
  AuctionSessionListPage,
  AuctionSessionWorkspacePage,
  OpeningRequestWorkspacePage,
} from "./ops/OperationsPages";
import { OpeningRequestFormPage } from "./customer/OpeningRequestPages";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import { useAuctionSessionStore } from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";

const validFields = {
  title: "Đấu giá đồng hồ sưu tầm",
  assetReference: "AST-CUS-WATCH-001",
  purpose: "Đề nghị SGDG tiếp nhận và tổ chức đấu giá",
  proposedStartPrice: 250_000_000,
  customerNotes: "Hồ sơ tham chiếu đã sẵn sàng.",
  declarationAccepted: true,
};

function acceptCurrentRequest() {
  const draft = useOpeningRequestStore
    .getState()
    .records.find(
      (record) =>
        record.ownerId === CURRENT_CUSTOMER_ID && record.status === "DRAFT",
    )!;
  const submitted = useOpeningRequestStore
    .getState()
    .submitOpeningRequest({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "linked-ui-submit",
      fields: validFields,
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const reviewing = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "linked-ui-review",
  });
  if (!reviewing.ok) throw new Error(reviewing.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: reviewing.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.data.version,
      commandId: "linked-ui-accept",
      reason: "Hồ sơ hợp lệ để tiếp nhận cho bước chuẩn bị bản nháp.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  return accepted.data;
}

function renderOpeningWorkspace(requestId: string) {
  return render(
    <MemoryRouter initialEntries={[`/ops/opening-requests/${requestId}`]}>
      <Routes>
        <Route
          path="/ops/opening-requests/:requestId"
          element={<OpeningRequestWorkspacePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderSessionList() {
  return render(
    <MemoryRouter initialEntries={["/ops/auctions"]}>
      <Routes>
        <Route
          element={<Outlet context={{ role: "CONTENT_STAFF" }} />}
        >
          <Route path="/ops/auctions" element={<AuctionSessionListPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderSessionWorkspace(sessionId: string, scenario = "") {
  const suffix = scenario ? `?scenario=${scenario}` : "";
  return render(
    <MemoryRouter initialEntries={[`/ops/auctions/${sessionId}${suffix}`]}>
      <Routes>
        <Route
          path="/ops/auctions/:sessionId"
          element={<AuctionSessionWorkspacePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("linked Auction Session cross-role UI", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useDemoStore.setState({
      authenticated: true,
      adminAuthenticated: true,
      actorRole: "CONTENT_STAFF",
    });
  });

  it("creates through the shared Dialog and replaces the CTA with a Session link", async () => {
    const user = userEvent.setup();
    const accepted = acceptCurrentRequest();
    renderOpeningWorkspace(accepted.requestId);
    await user.click(
      screen.getByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Tạo bản nháp phiên đấu giá",
    });
    expect(dialog).toHaveTextContent(accepted.requestId);
    expect(within(dialog).getByText(String(accepted.version))).toBeInTheDocument();
    expect(dialog).toHaveTextContent(accepted.assetReference);
    expect(dialog).toHaveTextContent("DRAFT · NOT_READY");
    expect(dialog).toHaveTextContent("không tạo Approval Package");
    await user.click(
      screen.getByRole("button", { name: "Xác nhận tạo bản nháp" }),
    );
    const sessions = useAuctionSessionStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(
      screen.queryByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mở workspace phiên" }),
    ).toHaveAttribute("href", `/ops/auctions/${sessions[0].sessionId}`);
    expect(screen.getByText(/Đã tạo bản nháp phiên/)).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("does not show Session creation for a non-accepted request", () => {
    renderOpeningWorkspace("ORQ-ROYAL-OAK-001");
    expect(
      screen.queryByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps a stale error inside the open Dialog and creates nothing", async () => {
    const user = userEvent.setup();
    const accepted = acceptCurrentRequest();
    renderOpeningWorkspace(accepted.requestId);
    await user.click(
      screen.getByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    );
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === accepted.requestId
          ? {
              ...record,
              version: record.version + 1,
              updatedAt: "2026-07-26T06:00:00.000Z",
            }
          : record,
      ),
    }));
    await user.click(
      screen.getByRole("button", { name: "Xác nhận tạo bản nháp" }),
    );
    expect(
      screen.getByRole("dialog", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Phiên bản Opening Request đã thay đổi",
    );
    expect(
      screen.getByRole("button", { name: "Tải lại phiên bản" }),
    ).toBeInTheDocument();
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(0);
  });

  it("handles double confirmation without creating a second Session", async () => {
    const user = userEvent.setup();
    const accepted = acceptCurrentRequest();
    renderOpeningWorkspace(accepted.requestId);
    await user.click(
      screen.getByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    );
    const confirm = screen.getByRole("button", {
      name: "Xác nhận tạo bản nháp",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
  });

  it("lists and loads the stored Session with exact lineage and no Approval Package", () => {
    const accepted = acceptCurrentRequest();
    const created = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        requestId: accepted.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedRequestVersion: accepted.version,
        commandId: "linked-ui-create",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      });
    if (!created.ok) throw new Error(created.message);
    const listRender = renderSessionList();
    expect(screen.getByText(created.session.code)).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${accepted.requestId} · v${accepted.version}`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getAllByText("NOT_READY").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: created.session.code }),
    ).toHaveAttribute("href", `/ops/auctions/${created.session.sessionId}`);
    listRender.unmount();

    renderSessionWorkspace(created.session.sessionId);
    expect(screen.getByRole("heading", { name: created.session.code })).toBeInTheDocument();
    expect(screen.getByText(accepted.requestId)).toBeInTheDocument();
    expect(screen.getByText(String(accepted.version))).toBeInTheDocument();
    expect(screen.getByText(/OPENING_REQUEST/)).toBeInTheDocument();
    expect(screen.getByText("CUSTOMER_REQUESTED")).toBeInTheDocument();
    expect(screen.getByText(/Chưa phê duyệt/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Submit for Approval" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("APR-ROYAL-OAK-001")).not.toBeInTheDocument();
  });

  it("shows Customer-safe preparation copy without an internal link", () => {
    const accepted = acceptCurrentRequest();
    const created = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        requestId: accepted.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedRequestVersion: accepted.version,
        commandId: "linked-customer-projection",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      });
    if (!created.ok) throw new Error(created.message);
    render(
      <MemoryRouter
        initialEntries={[
          `/account/opening-requests/${accepted.requestId}`,
        ]}
      >
        <Routes>
          <Route
            path="/account/opening-requests/:requestId"
            element={<OpeningRequestFormPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        /Yêu cầu đã được tiếp nhận và bản nháp phiên đấu giá đã được tạo/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phiên chưa được phê duyệt, lập lịch hoặc xuất bản/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /workspace phiên/i }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href^="/ops"]'),
    ).not.toBeInTheDocument();
  });

  it("does not expose another Customer's request-to-Session relationship", () => {
    const accepted = acceptCurrentRequest();
    const created = useAuctionSessionStore
      .getState()
      .createLinkedSessionFromAcceptedRequest({
        requestId: accepted.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedRequestVersion: accepted.version,
        commandId: "linked-other-customer-projection",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      });
    if (!created.ok) throw new Error(created.message);
    useOpeningRequestStore.setState((state) => ({
      records: state.records.map((record) =>
        record.requestId === accepted.requestId
          ? { ...record, ownerId: "CUS-OTHER-002" }
          : record,
      ),
    }));
    render(
      <MemoryRouter
        initialEntries={[
          `/account/opening-requests/${accepted.requestId}`,
        ]}
      >
        <Routes>
          <Route
            path="/account/opening-requests/:requestId"
            element={<OpeningRequestFormPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Không tìm thấy trang")).toBeInTheDocument();
    expect(
      screen.queryByText(/bản nháp phiên đấu giá đã được tạo/),
    ).not.toBeInTheDocument();
  });

  it("keeps Royal Oak and Omega compatibility workspaces usable", () => {
    const royal = renderSessionWorkspace(
      "royal-oak-15500st-draft",
      "session-draft",
    );
    expect(
      screen.getByText("Audemars Piguet Royal Oak 15500ST"),
    ).toBeInTheDocument();
    royal.unmount();
    renderSessionWorkspace(
      "sgdg-omega-speedmaster-draft-01",
      "session-draft",
    );
    expect(
      screen.getByText("Omega Speedmaster Moonwatch Professional"),
    ).toBeInTheDocument();
  });
});
