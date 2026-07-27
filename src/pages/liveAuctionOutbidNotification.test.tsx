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
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("notifies, updates the room, and prefills the next valid bid", () => {
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
    expect(
      screen.getByRole("heading", { name: "Bid đã được chấp nhận" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Đóng$/ }));

    act(() => vi.advanceTimersByTime(3_200));

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("Bạn vừa bị vượt giá");
    expect(notice).toHaveTextContent("An***B đã đặt 460.000.000 ₫");
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
});
