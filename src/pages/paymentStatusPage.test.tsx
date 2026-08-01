import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PaymentStatusPage } from "./auction/PaymentStatusPage";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,VIETQR"),
  },
}));

function renderPayment() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/me/auctions/patek-nautilus/payment?scenario=pending",
      ]}
    >
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
  it("renders a generated VietQR for the bank transfer method", async () => {
    renderPayment();

    expect(
      screen.getByRole("heading", { name: "Quét mã để thanh toán" }),
    ).toBeInTheDocument();
    const qrImage = await screen.findByRole("img", {
      name: /Mã VietQR thanh toán/,
    });
    expect(qrImage).toHaveAttribute("src", "data:image/png;base64,VIETQR");
    expect(screen.getAllByText("3.282.500.000 ₫")).toHaveLength(2);
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
});
