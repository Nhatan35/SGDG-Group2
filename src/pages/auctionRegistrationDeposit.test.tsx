import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionRegistrationWizard } from "./auction/AuctionRegistrationWizard";
import { LiveAuctionRoomPage } from "./auction/LiveAuctionRoomPage";
import { useDemoStore } from "../store/demoStore";
import { useEligibilityWorkflowStore } from "../store/eligibilityWorkflowStore";

function renderRegistration() {
  return render(
    <MemoryRouter
      initialEntries={["/auctions/diamond-gia/register?step=review"]}
    >
      <Routes>
        <Route
          path="/auctions/:auctionId/register"
          element={<AuctionRegistrationWizard />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

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

describe("customer registration deposit step", () => {
  beforeEach(() => {
    localStorage.clear();
    useDemoStore.setState({
      authenticated: true,
      actorRole: "CUSTOMER",
      walletBalance: 125_000_000,
      auctionDeposits: {},
    });
    useEligibilityWorkflowStore.setState({ registrations: [] });
  });

  it("moves from review to a dedicated deposit step and records one deposit", async () => {
    const user = userEvent.setup();
    renderRegistration();

    expect(
      screen.getByRole("heading", { name: "Kiểm tra và xác nhận đăng ký" }),
    ).toBeInTheDocument();
    const continueButton = screen.getByRole("button", {
      name: "Tiếp tục đặt cọc",
    });
    expect(continueButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(continueButton);

    expect(
      screen.getByRole("heading", { name: "Đặt cọc và gửi đăng ký" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tiền cọc 10%")).toBeInTheDocument();
    expect(screen.getByText("68.000.000 ₫")).toBeInTheDocument();
    expect(useDemoStore.getState().auctionDeposits).toEqual({});

    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Đặt cọc và gửi đăng ký" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "Đặt cọc và gửi đăng ký thành công",
        }),
      ).toBeInTheDocument(),
    );
    expect(useDemoStore.getState().auctionDeposits["diamond-gia"]).toBe(
      68_000_000,
    );
    expect(useDemoStore.getState().walletBalance).toBe(57_000_000);
  });

  it("requires enough wallet balance before submitting", async () => {
    const user = userEvent.setup();
    useDemoStore.setState({ walletBalance: 10_000_000 });
    renderRegistration();

    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Tiếp tục đặt cọc" }),
    );
    await user.click(screen.getByRole("checkbox"));

    expect(
      screen.getByText("Số dư ví còn thiếu 58.000.000 ₫"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Đặt cọc và gửi đăng ký" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "Nạp bổ sung qua cổng thanh toán demo",
      }),
    );
    expect(useDemoStore.getState().walletBalance).toBe(68_000_000);
    expect(
      screen.getByRole("button", { name: "Đặt cọc và gửi đăng ký" }),
    ).toBeEnabled();
  });

  it("requires a room deposit before opening the manual bid form", async () => {
    const user = userEvent.setup();
    renderLiveRoom();

    await user.click(
      screen.getByRole("button", { name: "Đặt giá thủ công" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Xác nhận đặt cọc để tham gia đấu giá",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đồng ý đặt cọc" }));
    expect(useDemoStore.getState().auctionDeposits["rolex-126610lv"]).toBe(
      38_000_000,
    );
    await user.click(screen.getByRole("button", { name: "Vào đấu giá" }));
    expect(
      screen.getByRole("heading", { name: "Nhập mức giá của bạn" }),
    ).toBeInTheDocument();
  });
});
