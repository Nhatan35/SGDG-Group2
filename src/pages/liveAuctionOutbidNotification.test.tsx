import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LiveAuctionRoomPage } from "./auction/LiveAuctionRoomPage";
import { useEligibilityWorkflowStore } from "../store/eligibilityWorkflowStore";
import { useDemoStore } from "../store/demoStore";

function renderLiveRoom() {
  return render(
    <MemoryRouter initialEntries={["/auctions/rolex-126610lv/live"]}>
      <Routes>
        <Route
          path="/auctions/:auctionId/live"
          element={<LiveAuctionRoomPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("live auction outbid notification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEligibilityWorkflowStore.setState({ registrations: [] });
    useDemoStore.setState({
      walletBalance: 87_000_000,
      auctionDeposits: { "rolex-126610lv": 38_000_000 },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("notifies, updates the room, and prefills the next valid bid", () => {
    renderLiveRoom();

    expect(screen.queryByText("Bạn · dẫn đầu")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Đặt giá thủ công" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mức tối thiểu" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Tiếp tục xác nhận" }),
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận đặt giá" }),
    );

    act(() => vi.advanceTimersByTime(700));
    expect(
      screen.getByRole("heading", { name: "Giá mới" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("SBD 018")).toHaveLength(2);
    expect(screen.queryByText("Tự động đóng sau 1 phút")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Đặt giá mới" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Bạn · dẫn đầu")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Đóng cửa sổ đặt giá" }),
    );

    act(() => vi.advanceTimersByTime(3_200));

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("Bạn vừa bị vượt giá");
    expect(notice).toHaveTextContent("SBD 031 đã đặt 460.000.000 ₫");
    expect(notice).toHaveTextContent(
      "Giá tối thiểu tiếp theo: 465.000.000 ₫",
    );
    expect(
      screen.getByText("Bạn · vừa bị vượt giá"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Đặt giá thủ công" }),
    ).toHaveTextContent("🔥 Đặt lại 465.000.000 ₫");

    fireEvent.click(
      within(notice).getByRole("button", { name: "Đặt lại ngay" }),
    );

    expect(
      screen.getByRole("heading", { name: "Nhập mức giá của bạn" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("465000000");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not rank the user before a deposit and an accepted bid", () => {
    useDemoStore.setState({ auctionDeposits: {} });

    renderLiveRoom();

    const leaderboard = screen
      .getByRole("heading", { name: "Bảng xếp hạng đấu giá" })
      .closest("section");

    expect(leaderboard).not.toBeNull();
    expect(within(leaderboard!).queryByText("Bạn")).not.toBeInTheDocument();
    expect(within(leaderboard!).getByText("SBD 027")).toBeInTheDocument();
    expect(screen.queryByText("Chưa đặt cọc cho phiên này")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Đặt giá thủ công" }),
    ).toBeEnabled();
  });

  it("automatically closes the success popup after one minute", () => {
    renderLiveRoom();

    fireEvent.click(
      screen.getByRole("button", { name: "Đặt giá thủ công" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mức tối thiểu" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Tiếp tục xác nhận" }),
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận đặt giá" }),
    );
    act(() => vi.advanceTimersByTime(700));

    act(() => vi.advanceTimersByTime(59_999));
    expect(
      screen.getByRole("heading", { name: "Giá mới" }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.queryByRole("heading", { name: "Giá mới" }),
    ).not.toBeInTheDocument();
  });
});
