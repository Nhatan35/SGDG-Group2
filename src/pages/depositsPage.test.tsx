import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { DepositsPage } from "./customer/AccountPages";
import { useDemoStore } from "../store/demoStore";

describe("DepositsPage", () => {
  beforeEach(() => {
    useDemoStore.setState({ auctionDepositRecords: {} });
  });

  it("hiển thị trạng thái rỗng mà không phát sinh vòng render", () => {
    render(
      <MemoryRouter>
        <DepositsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Bạn chưa có khoản cọc nào")).toBeInTheDocument();
  });

  it("hiển thị khoản cọc và lịch sử xử lý", () => {
    useDemoStore.setState({
      auctionDepositRecords: {
        "rolex-126610lv": {
          auctionId: "rolex-126610lv",
          reference: "DEP-ROLEX-001",
          amount: 45_000_000,
          status: "ACTIVE",
          createdAt: "2026-08-03T08:00:00.000Z",
          updatedAt: "2026-08-03T08:00:00.000Z",
          timeline: [
            {
              id: "DEP-ROLEX-001-ACTIVE",
              at: "2026-08-03T08:00:00.000Z",
              status: "ACTIVE",
              label: "Đã xác nhận đặt cọc",
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <DepositsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("DEP-ROLEX-001")).toBeInTheDocument();
    expect(screen.getByText("Đang được giữ")).toBeInTheDocument();
    expect(screen.getByText("Đã xác nhận đặt cọc")).toBeInTheDocument();
  });
});
