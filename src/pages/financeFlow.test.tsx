import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useDemoStore } from "../store/demoStore";
import { useFinanceFlowStore } from "../store/financeFlowStore";
import {
  FinanceReportsPage,
  SettlementsPage,
} from "./admin/FinanceWorkspacePages";
import { WalletPage } from "./customer/AccountPages";

function renderInRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("customer payout to Finance UI flow", () => {
  beforeEach(() => {
    localStorage.clear();
    useFinanceFlowStore.getState().resetForTests();
    useDemoStore.setState({
      authenticated: true,
      actorRole: "CUSTOMER",
      userName: "Nguyễn Minh Anh",
      walletBalance: 125_000_000,
      bankAccounts: [
        {
          id: "bank-vcb-test",
          bankName: "Vietcombank",
          accountNumber: "0123456789",
          accountHolder: "NGUYEN MINH ANH",
          isDefault: true,
        },
      ],
    });
  });

  it("creates a payout from the wallet and lets Finance approve it", async () => {
    const user = userEvent.setup();
    const wallet = renderInRouter(<WalletPage />);

    await user.type(
      screen.getByPlaceholderText("Nhập số tiền VND"),
      "20000000",
    );
    await user.click(screen.getByRole("button", { name: "Tiếp tục xác nhận" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận rút tiền" }));

    const payout = useFinanceFlowStore.getState().payoutRequests[0];
    expect(payout).toMatchObject({
      userName: "Nguyễn Minh Anh",
      amount: 20_000_000,
      status: "PENDING_REVIEW",
    });
    expect(screen.getByText(payout.id)).toBeInTheDocument();
    expect(useDemoStore.getState().walletBalance).toBe(105_000_000);

    wallet.unmount();
    renderInRouter(<SettlementsPage />);

    await user.click(
      screen.getByRole("button", {
        name: `Xem yêu cầu ${payout.id}`,
      }),
    );
    expect(
      screen.getByRole("dialog", {
        name: `Kiểm tra yêu cầu ${payout.id}`,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Duyệt yêu cầu" }));

    expect(
      useFinanceFlowStore
        .getState()
        .payoutRequests.find((item) => item.id === payout.id)?.status,
    ).toBe("APPROVED");
    expect(
      screen.getByRole("button", { name: "Đưa vào lệnh chi" }),
    ).toBeInTheDocument();
  }, 15_000);

  it("tops up the wallet directly from the balance card", async () => {
    const user = userEvent.setup();
    renderInRouter(<WalletPage />);

    await user.click(
      screen.getByRole("button", { name: /^Nạp tiền$/ }),
    );
    expect(
      screen.getByRole("dialog", { name: "Bổ sung số dư khả dụng" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Số tiền muốn nạp"), "15000000");
    await user.click(
      screen.getByRole("button", { name: "Xác nhận nạp tiền" }),
    );

    expect(useDemoStore.getState().walletBalance).toBe(140_000_000);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nạp 15.000.000 ₫ vào ví thành công",
    );
    expect(
      screen.queryByRole("dialog", { name: "Bổ sung số dư khả dụng" }),
    ).not.toBeInTheDocument();
  });

  it("switches report views and produces visible export feedback", async () => {
    const user = userEvent.setup();
    renderInRouter(<FinanceReportsPage />);

    await user.click(screen.getByRole("button", { name: /Theo tuần/ }));
    expect(
      screen.getByRole("heading", { name: "Doanh thu theo tuần" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tuần 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Theo tháng/ }));
    expect(
      screen.getByRole("heading", { name: "Doanh thu theo tháng" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thanh toán" }));
    expect(screen.getByText("Giao dịch thành công")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Theo dõi tiền vào, hoàn tiền, payout và chất lượng đối soát.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xuất báo cáo" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã tạo snapshot báo cáo Thanh toán theo tháng cho tháng 07/2026",
    );
  });
});
