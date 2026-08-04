import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionCustomerRegistrationPage } from "./customer/AuctionCustomerRegistrationPage";
import {
  prepareOpenRegistrationWindow,
  resetCustomerRegistrationTestState,
} from "../test/customerRegistrationTestHarness";
import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import { useDemoStore } from "../store/demoStore";
import { CURRENT_CUSTOMER_ID } from "../store/openingRequestStore";

function renderRegistration(sessionId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/customer/auctions/${sessionId}/registration`]}
    >
      <Routes>
        <Route
          path="/customer/auctions/:sessionId/registration"
          element={<AuctionCustomerRegistrationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Customer Registration page", () => {
  beforeEach(() => {
    resetCustomerRegistrationTestState();
    useDemoStore.setState({
      authenticated: true,
      actorRole: "CUSTOMER",
    });
  });

  it("lets an eligible Customer create their own Draft", async () => {
    const user = userEvent.setup();
    const prepared = prepareOpenRegistrationWindow();
    renderRegistration(prepared.session.sessionId);
    expect(
      screen.getByRole("heading", { level: 1, name: "Đăng ký tham gia đấu giá" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Tạo bản nháp đăng ký" }),
    );
    expect(screen.getByText("DRAFT / v1")).toBeInTheDocument();
    expect(
      useAuctionCustomerRegistrationStore.getState().registrations,
    ).toHaveLength(1);
  });

  it("renders authenticated Customer identity as read-only", () => {
    const prepared = prepareOpenRegistrationWindow();
    renderRegistration(prepared.session.sessionId);
    expect(screen.getByText(CURRENT_CUSTOMER_ID)).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /customer identity/i }),
    ).not.toBeInTheDocument();
  });

  it("blocks Submit until rules are accepted and saved", async () => {
    const user = userEvent.setup();
    const prepared = prepareOpenRegistrationWindow();
    renderRegistration(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Tạo bản nháp đăng ký" }),
    );
    const submit = screen.getByRole("button", { name: "Gửi đăng ký" });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /đồng ý/i }));
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    expect(screen.getByRole("button", { name: "Gửi đăng ký" }))
      .toBeEnabled();
  });

  it("submits successfully and makes the Registration read-only", async () => {
    const user = userEvent.setup();
    const prepared = prepareOpenRegistrationWindow();
    renderRegistration(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Tạo bản nháp đăng ký" }),
    );
    await user.click(screen.getByRole("checkbox", { name: /đồng ý/i }));
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    await user.click(
      screen.getByRole("button", { name: "Gửi đăng ký" }),
    );
    expect(screen.getByText("SUBMITTED / v3")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /đồng ý/i })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Gửi đăng ký" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/2026-08-01T01:30:00/)).toBeInTheDocument();
  });

  it("shows all submission boundary statements", () => {
    const prepared = prepareOpenRegistrationWindow();
    renderRegistration(prepared.session.sessionId);
    expect(
      screen.getByText("Gửi đăng ký không đồng nghĩa khách hàng đã đủ điều kiện tham gia."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Chưa bắt đầu kiểm tra hạng thành viên, tiền cọc và điều kiện tham gia.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Thao tác này không tự động công khai phiên đấu giá.",
      ),
    ).toBeInTheDocument();
  });

  it.each(["ADMIN", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "blocks unauthorized role %s",
    (actorRole) => {
      const prepared = prepareOpenRegistrationWindow();
      useDemoStore.setState({ actorRole });
      renderRegistration(prepared.session.sessionId);
      expect(screen.getByText("Không có quyền truy cập")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Tạo bản nháp đăng ký" }),
      ).not.toBeInTheDocument();
    },
  );

  it("does not expose another Customer's Registration", () => {
    const prepared = prepareOpenRegistrationWindow();
    const result = useAuctionCustomerRegistrationStore
      .getState()
      .createRegistrationDraft({
        sessionId: prepared.session.sessionId,
        actorId: "CUS-OTHER-001",
        actorRole: "CUSTOMER",
        expectedSessionVersion: prepared.session.currentVersion,
        expectedRegistrationWindowId:
          prepared.registrationWindow.registrationWindowId,
        commandId: "create-other-registration",
      });
    expect(result.ok).toBe(true);
    renderRegistration(prepared.session.sessionId);
    expect(screen.queryByText("CUS-OTHER-001")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tạo bản nháp đăng ký" }),
    ).toBeInTheDocument();
  });
});
