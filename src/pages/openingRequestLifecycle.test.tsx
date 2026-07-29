import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  OpeningRequestFormPage,
  OpeningRequestListPage,
} from "./customer/OpeningRequestPages";
import {
  OpeningRequestQueuePage,
  OpeningRequestWorkspacePage,
} from "./ops/OperationsPages";
import {
  OpeningRequestGovernanceDetailPage,
  OpeningRequestGovernanceQueuePage,
} from "./governance/OpeningRequestGovernancePages";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "../store/openingRequestStore";
import { useDemoStore } from "../store/demoStore";
import { useAuctionSessionStore } from "../store/auctionSessionStore";

const validFields = {
  title: "Đấu giá đồng hồ sưu tầm",
  assetReference: "AST-CUS-WATCH-001",
  purpose: "Đề nghị SGDG tiếp nhận và tổ chức đấu giá",
  proposedStartPrice: 250_000_000,
  customerNotes: "Hồ sơ tham chiếu đã sẵn sàng.",
  declarationAccepted: true,
};

function reviewingRecord() {
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
      commandId: "ui-submit",
      fields: validFields,
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const started = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "ui-start",
  });
  if (!started.ok) throw new Error(started.message);
  return started.data;
}

describe("Opening Request cross-role UI", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useDemoStore.setState({
      adminAuthenticated: true,
      authenticated: true,
      actorRole: "CONTENT_STAFF",
    });
  });

  it("shows a submitted Customer record in the Staff queue with the same ID", () => {
    const draft = useOpeningRequestStore
      .getState()
      .records.find((record) => record.ownerId === CURRENT_CUSTOMER_ID)!;
    const submitted = useOpeningRequestStore
      .getState()
      .submitOpeningRequest({
        requestId: draft.requestId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedVersion: draft.version,
        commandId: "queue-submit",
        fields: validFields,
      });
    if (!submitted.ok) throw new Error(submitted.message);
    render(
      <MemoryRouter>
        <OpeningRequestQueuePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(submitted.data.requestId)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Mở review" })
        .some(
          (link) =>
            link.getAttribute("href") ===
            `/ops/opening-requests/${submitted.data.requestId}`,
        ),
    ).toBe(true);
  });

  it("executes Accept for Draft from the shared Dialog without Session navigation", async () => {
    const user = userEvent.setup();
    const reviewing = reviewingRecord();
    const staffRender = render(
      <MemoryRouter
        initialEntries={[`/ops/opening-requests/${reviewing.requestId}`]}
      >
        <Routes>
          <Route
            path="/ops/opening-requests/:requestId"
            element={<OpeningRequestWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("button", { name: "Tiếp nhận để chuẩn bị" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Tiếp nhận để chuẩn bị bản nháp",
    });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(reviewing.requestId);
    expect(dialog).toHaveTextContent(String(reviewing.version));
    await user.type(
      screen.getByRole("textbox", { name: "Căn cứ tiếp nhận" }),
      "Hồ sơ hợp lệ để tiếp nhận cho bước chuẩn bị bản nháp.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Tiếp nhận để chuẩn bị" }),
    );
    expect(
      useOpeningRequestStore
        .getState()
        .records.find((record) => record.requestId === reviewing.requestId)
        ?.status,
    ).toBe("ACCEPTED_FOR_DRAFT");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /session/i }),
    ).not.toBeInTheDocument();
    staffRender.unmount();
    render(
      <MemoryRouter
        initialEntries={[
          `/account/opening-requests/${reviewing.requestId}`,
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
      screen.getByRole("heading", {
        name: "Đã tiếp nhận để chuẩn bị phiên đấu giá",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/chưa được tạo hoặc phê duyệt/i)).toBeInTheDocument();
    expect(screen.getByText(/chưa có lịch/i)).toBeInTheDocument();
    expect(screen.getByText(/chưa được xuất bản/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi/ })).not.toBeInTheDocument();
  });

  it("keeps returned and rejected Customer outcomes semantically distinct", () => {
    const reviewing = reviewingRecord();
    const returned = useOpeningRequestStore.getState().returnForCorrection({
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.version,
      commandId: "ui-return",
      reason: "Vui lòng cập nhật mục đích đấu giá rõ ràng hơn.",
      affectedSections: ["Mục đích đấu giá"],
    });
    if (!returned.ok) throw new Error(returned.message);
    const returnedRender = render(
      <MemoryRouter
        initialEntries={[
          `/account/opening-requests/${returned.data.requestId}`,
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
      screen.getByRole("heading", { name: "Yêu cầu cần được chỉnh sửa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gửi lại yêu cầu" }),
    ).toBeInTheDocument();
    returnedRender.unmount();

    useOpeningRequestStore.getState().resetForTests();
    const secondReview = reviewingRecord();
    const rejected = useOpeningRequestStore
      .getState()
      .rejectOpeningRequest({
        requestId: secondReview.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: secondReview.version,
        commandId: "ui-reject",
        reason: "Hồ sơ không đáp ứng điều kiện tiếp nhận hiện hành.",
      });
    if (!rejected.ok) throw new Error(rejected.message);
    render(
      <MemoryRouter
        initialEntries={[
          `/account/opening-requests/${rejected.data.requestId}`,
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
      screen.getByRole("heading", { name: "Yêu cầu đã bị từ chối" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Gửi lại yêu cầu" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tên yêu cầu")).toBeDisabled();
  });

  it("shows only a generic governance message to Customer", () => {
    const reviewing = reviewingRecord();
    const governed = useOpeningRequestStore
      .getState()
      .recordGovernanceConcern({
        requestId: reviewing.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: reviewing.version,
        commandId: "ui-governance",
        concernReason:
          "Cáo buộc nội bộ tuyệt đối không được hiển thị cho Customer.",
        evidenceReferenceIds: ["EVD-CONFIDENTIAL-001"],
      });
    if (!governed.ok) throw new Error(governed.message);
    render(
      <MemoryRouter
        initialEntries={[
          `/account/opening-requests/${governed.data.requestId}`,
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
      screen.getByRole("heading", {
        name: "Đang xem xét theo quy trình quản trị",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Cáo buộc nội bộ tuyệt đối/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("EVD-CONFIDENTIAL-001")).not.toBeInTheDocument();
  });

  it("lets ADMIN locate a governed case and inspect internal evidence read-only", () => {
    const reviewing = reviewingRecord();
    const governed = useOpeningRequestStore
      .getState()
      .recordGovernanceConcern({
        requestId: reviewing.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: reviewing.version,
        commandId: "ui-admin-governance",
        concernReason: "ADMIN cần xem quan ngại quản trị nội bộ của hồ sơ.",
        evidenceReferenceIds: ["EVD-ADMIN-001"],
      });
    if (!governed.ok) throw new Error(governed.message);
    useDemoStore.setState({ actorRole: "ADMIN" });
    const queueRender = render(
      <MemoryRouter>
        <OpeningRequestGovernanceQueuePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(governed.data.requestId)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Xem hồ sơ" }),
    ).toHaveAttribute(
      "href",
      `/governance/opening-requests/${governed.data.requestId}`,
    );
    queueRender.unmount();
    render(
      <MemoryRouter
        initialEntries={[
          `/governance/opening-requests/${governed.data.requestId}`,
        ]}
      >
        <Routes>
          <Route
            path="/governance/opening-requests/:requestId"
            element={<OpeningRequestGovernanceDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getAllByText(
        "ADMIN cần xem quan ngại quản trị nội bộ của hồ sơ.",
      ),
    ).toHaveLength(2);
    expect(screen.getByText("EVD-ADMIN-001")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Governance Hold/i }),
    ).not.toBeInTheDocument();
  });

  it("returns safe not-found UI for another Customer's direct URL", () => {
    const { container } = render(
      <MemoryRouter
        initialEntries={[
          "/account/opening-requests/ORQ-CUS-OTHER-001",
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
    expect(container.querySelector("main.not-found")).toBeInTheDocument();
    expect(screen.queryByText("ORQ-CUS-OTHER-001")).not.toBeInTheDocument();
  });

  it("keeps Account list navigation available after lifecycle changes", () => {
    render(
      <MemoryRouter>
        <OpeningRequestListPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: /Tạo yêu cầu mở phiên/ }),
    ).toHaveAttribute("href", "/account/opening-requests/new");
  });

  it("keeps legacy Opening Request scenario URLs usable as read-only fixtures", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/ops/opening-requests/ORQ-ROYAL-OAK-001?scenario=request-rejected",
        ]}
      >
        <Routes>
          <Route
            path="/ops/opening-requests/:requestId"
            element={<OpeningRequestWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("REJECTED")).toBeInTheDocument();
    expect(
      screen.getByText(/Scenario fixture tương thích chỉ đọc/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tiếp nhận để chuẩn bị" }),
    ).not.toBeInTheDocument();
  });
});
