import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { CreateSgdgManagedSessionPage } from "./ops/CreateSgdgManagedSessionPage";
import {
  AuctionSessionListPage,
  AuctionSessionWorkspacePage,
} from "./ops/OperationsPages";
import { useAssetReadinessStore } from "../store/assetReadinessStore";
import {
  useAuctionSessionStore,
  type PersistedSgdgManagedSession,
} from "../store/auctionSessionStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import { useDemoStore } from "../store/demoStore";

const assetId = "AST-OMEGA-SPD-001";

function renderCreatePage(scenario = "") {
  const suffix = scenario ? `?scenario=${scenario}` : "";
  return render(
    <MemoryRouter initialEntries={[`/ops/auctions/new${suffix}`]}>
      <Routes>
        <Route
          element={<Outlet context={{ role: "CONTENT_STAFF" }} />}
        >
          <Route
            path="/ops/auctions/new"
            element={<CreateSgdgManagedSessionPage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

async function selectAndRequest(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Tài sản"), assetId);
  await user.click(
    screen.getByRole("button", {
      name: "Kiểm tra trạng thái tài sản",
    }),
  );
}

function createDirectSession(): PersistedSgdgManagedSession {
  const reference = useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "ui-direct-reference",
    });
  if (!reference.ok) throw new Error(reference.message);
  const result = useAuctionSessionStore
    .getState()
    .createSgdgManagedDraftSession({
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: "ui-direct-create",
      draft: {
        assetId,
        title: "Omega Speedmaster — Phiên SGDG tháng 8",
        purpose: "Đấu giá tài sản đã có Product reference",
        region: "Hà Nội",
        ownerId: CONTENT_STAFF_ACTOR_ID,
      },
      assetReadinessReferenceId: reference.reference.referenceId,
      expectedAssetVersion: reference.reference.assetVersion,
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!result.ok) throw new Error(result.message);
  return result.session;
}

function renderSessionList() {
  return render(
    <MemoryRouter initialEntries={["/ops/auctions"]}>
      <Routes>
        <Route
          element={<Outlet context={{ role: "CONTENT_STAFF" }} />}
        >
          <Route
            path="/ops/auctions"
            element={<AuctionSessionListPage />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderSessionDetail(sessionId: string) {
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

describe("SGDG-managed Session creation UI", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAssetReadinessStore
      .getState()
      .resetDeterministicAssetReadinessState();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useDemoStore.setState({
      authenticated: true,
      adminAuthenticated: true,
      actorRole: "CONTENT_STAFF",
    });
  });

  it("renders one H1 and a read-only Product readiness reference", async () => {
    const user = userEvent.setup();
    renderCreatePage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tạo phiên do SGDG quản lý",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/DIRECT_SGDG/)).toBeInTheDocument();
    expect(screen.getByText(/SGDG_MANAGED/)).toBeInTheDocument();
    await selectAndRequest(user);
    expect(screen.getByText(/ARR-AST-OMEGA-SPD-001-V3/)).toBeInTheDocument();
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("APPROVED"),
    ).not.toBeInTheDocument();
  });

  it("shows a Draft-owned inline correction and preserves valid values", async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await selectAndRequest(user);
    const title = screen.getByLabelText("Tiêu đề phiên");
    const titleValue = (title as HTMLInputElement).value;
    await user.click(
      screen.getByRole("button", {
        name: "Kiểm tra mức sẵn sàng",
      }),
    );
    expect(
      screen.getAllByText("Nhập mục đích đấu giá.").length,
    ).toBeGreaterThan(0);
    expect(title).toHaveValue(titleValue);
    await user.type(
      screen.getByRole("textbox", { name: "Mục đích đấu giá" }),
      "Đấu giá tài sản đã có Product reference",
    );
    expect(
      screen.getByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).toBeInTheDocument();
  });

  it("confirms through the shared Dialog and creates one real Session", async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await selectAndRequest(user);
    await user.type(
      screen.getByRole("textbox", { name: "Mục đích đấu giá" }),
      "Đấu giá tài sản đã có Product reference",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Tạo bản nháp phiên do SGDG quản lý",
    });
    expect(dialog).toHaveTextContent(assetId);
    expect(within(dialog).getByText("Phiên bản tài sản")).toBeInTheDocument();
    expect(within(dialog).getByText("v3")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("SGDG_MANAGED");
    expect(dialog).toHaveTextContent("BẢN NHÁP · CHƯA SẴN SÀNG");
    expect(dialog).toHaveTextContent("phê duyệt");
    const confirm = within(dialog).getByRole("button", {
      name: "Xác nhận tạo bản nháp",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(useAuctionSessionStore.getState().sessions).toHaveLength(1);
    const session = useAuctionSessionStore.getState().sessions[0];
    expect(session.recordKind).toBe("DYNAMIC_SGDG_MANAGED_SESSION");
    expect(
      screen.getByRole("link", { name: "Mở không gian phiên" }),
    ).toHaveAttribute("href", `/ops/auctions/${session.sessionId}`);
    expect(screen.getByText(/Đã tạo sgdg-managed/)).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("keeps a held reference blocked after refresh", async () => {
    const user = userEvent.setup();
    renderCreatePage("asset-held");
    await selectAndRequest(user);
    expect(screen.getByText(/Asset đang hold/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Làm mới tham chiếu tài sản",
      }),
    );
    expect(screen.getByText(/Asset đang hold/)).toBeInTheDocument();
    expect(screen.getByText("HELD")).toBeInTheDocument();
  });

  it("refreshes a stale Asset reference before enabling creation", async () => {
    const user = userEvent.setup();
    renderCreatePage("stale-asset-version");
    await selectAndRequest(user);
    expect(
      screen.getByText(/nguồn hiện tại là v3/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Làm mới tham chiếu tài sản",
      }),
    );
    expect(screen.getByText("v3")).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Mục đích đấu giá" }),
      "Đấu giá tài sản sau khi reconfirm",
    );
    expect(
      screen.getByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).toBeInTheDocument();
  });

  it("shows a safe existing-Session link for an active conflict", async () => {
    const user = userEvent.setup();
    renderCreatePage("duplicate-active-session");
    await selectAndRequest(user);
    expect(
      screen.getByText(/Asset đang thuộc Session/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mở phiên hiện có" }),
    ).toHaveAttribute(
      "href",
      "/ops/auctions/sgdg-omega-speedmaster-draft-01",
    );
    expect(
      screen.queryByRole("button", {
        name: "Tạo bản nháp phiên đấu giá",
      }),
    ).not.toBeInTheDocument();
  });

  it("lists and loads SGDG-managed Asset lineage without Opening Request or Approval Package", () => {
    const session = createDirectSession();
    const list = renderSessionList();
    const sessionLink = screen.getByRole("link", {
      name: session.auctionCode,
    });
    expect(sessionLink).toHaveAttribute(
      "href",
      `/ops/auctions/${session.sessionId}`,
    );
    expect(screen.getByText("SGDG_MANAGED")).toBeInTheDocument();
    expect(
      screen.getByText(`SGDG-managed · Asset v${session.evaluatedAssetVersion}`),
    ).toBeInTheDocument();
    list.unmount();

    renderSessionDetail(session.sessionId);
    expect(
      screen.getByRole("heading", { name: session.auctionCode }),
    ).toBeInTheDocument();
    expect(screen.getByText(/SGDG-managed initiation/)).toBeInTheDocument();
    expect(screen.getByText(session.assetReadinessReferenceId)).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByText("NOT_READY")).toBeInTheDocument();
    expect(screen.queryByText("Opening Request")).not.toBeInTheDocument();
    expect(screen.queryByText(/APR-ROYAL-OAK/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit for Approval" }),
    ).not.toBeInTheDocument();
  });
});
