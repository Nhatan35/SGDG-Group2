import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PaymentStatusPage } from "./auction/PaymentStatusPage";
import { useDemoStore } from "../store/demoStore";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,VIETQR"),
  },
}));

function renderPayment(
  entry = "/me/auctions/patek-nautilus/payment?scenario=pending",
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/me/auctions/:auctionId/payment"
          element={<PaymentStatusPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("winner payment methods", () => {
  beforeEach(() => {
    useDemoStore.setState({
      walletBalance: 125_000_000,
      auctionDeposits: {},
      auctionDepositRecords: {},
    });
  });

  it("renders a generated VietQR for the bank transfer method", async () => {
    renderPayment();

    expect(
      screen.getByRole("heading", { name: "Quét mã để thanh toán" }),
    ).toBeInTheDocument();
    const qrImage = await screen.findByRole("img", {
      name: /Mã VietQR thanh toán/,
    });
    expect(qrImage).toHaveAttribute("src", "data:image/png;base64,VIETQR");
    expect(screen.getAllByText("3.282.500.000 ₫")).toHaveLength(3);
  });

  it("changes the form and guide when ATM or credit card is selected", async () => {
    const user = userEvent.setup();
    renderPayment();

    await user.click(screen.getByRole("radio", { name: "Thẻ ATM nội địa" }));
    expect(
      screen.getByRole("heading", { name: "Thông tin thẻ ATM nội địa" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cổng thanh toán Napas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tiếp tục với thẻ ATM" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("radio", { name: "Thẻ tín dụng / ghi nợ" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Thông tin thẻ tín dụng / ghi nợ",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cổng thẻ quốc tế")).toBeInTheDocument();
    expect(screen.getByLabelText("CVV/CVC")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Thanh toán bằng thẻ" }),
      ).toBeEnabled(),
    );
  });

  it("requires a valid OTP before recording an ATM card payment", async () => {
    const user = userEvent.setup();
    renderPayment();

    await user.click(screen.getByRole("radio", { name: "Thẻ ATM nội địa" }));
    await user.click(
      screen.getByRole("button", { name: "Tiếp tục với thẻ ATM" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Xác thực giao dịch bằng OTP" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Xác nhận thanh toán" }),
    );
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Mã xác thực chưa đúng");

    await user.click(
      screen.getByRole("button", { name: "Dùng mã 123456" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Xác nhận thanh toán" }),
    );

    expect(
      await screen.findByRole(
        "heading",
        { name: "Thanh toán đã được ghi nhận" },
        { timeout: 2_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deducts the confirmed deposit from the winner payment", async () => {
    useDemoStore.setState({ walletBalance: 500_000_000 });
    useDemoStore
      .getState()
      .payAuctionDeposit("patek-nautilus", 325_000_000);
    const user = userEvent.setup();

    renderPayment();

    expect(screen.getByText("-325.000.000 ₫")).toBeInTheDocument();
    expect(
      screen.getAllByText("2.957.500.000 ₫").length,
    ).toBeGreaterThanOrEqual(2);

    await user.click(
      screen.getByRole("button", { name: "Tôi đã chuyển khoản" }),
    );

    expect(
      await screen.findByRole(
        "heading",
        { name: "Thanh toán đã được ghi nhận" },
        { timeout: 2_000 },
      ),
    ).toBeInTheDocument();
    expect(
      useDemoStore.getState().auctionDepositRecords["patek-nautilus"]?.status,
    ).toBe("APPLIED_TO_PAYMENT");
    expect(
      useDemoStore.getState().auctionDeposits["patek-nautilus"],
    ).toBeUndefined();
  });

  it("forfeits the deposit when the winner defaults after the deadline", () => {
    useDemoStore.setState({ walletBalance: 500_000_000 });
    useDemoStore
      .getState()
      .payAuctionDeposit("patek-nautilus", 325_000_000);

    renderPayment(
      "/me/auctions/patek-nautilus/payment?scenario=defaulted",
    );

    expect(
      screen.getByRole("heading", { name: "Đã quá hạn thanh toán" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Khoản cọc đã bị thu do quá hạn thanh toán"),
    ).toBeInTheDocument();
    expect(
      useDemoStore.getState().auctionDepositRecords["patek-nautilus"],
    ).toMatchObject({
      status: "FORFEITED",
      reason: "PAYMENT_DEFAULT",
      amount: 325_000_000,
    });
    expect(useDemoStore.getState().walletBalance).toBe(175_000_000);
  });
});
