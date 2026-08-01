import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useFinanceOverrideStore } from "../store/financeOverrideStore";
import {
  FinanceOverrideReadPage,
  FinanceOverrideRequestPage,
} from "./governance/FinanceOverridePages";

describe("controlled Finance override request UI", () => {
  beforeEach(() => {
    localStorage.clear();
    useFinanceOverrideStore.getState().resetForTests();
  });

  it("validates, reviews and sends a three-step request to ADMIN", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/finance/override-requests/new"]}>
        <Routes>
          <Route
            path="/finance/override-requests/new"
            element={<FinanceOverrideRequestPage />}
          />
          <Route
            path="/finance/override-requests/:overrideId"
            element={<FinanceOverrideReadPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.type(
      screen.getByLabelText(/Lý do nghiệp vụ/),
      "Cần rà soát lại provider reference sau khi dữ liệu đối soát đã khóa.",
    );
    await user.type(
      screen.getByLabelText(/Reference bằng chứng/),
      "PAY-REV-5711R{enter}AUD-FIN-2026-0718",
    );
    await user.click(screen.getByRole("button", { name: "Kiểm tra yêu cầu" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: /Tôi xác nhận yêu cầu chỉ đề nghị action đã chọn/,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Gửi cho ADMIN duyệt" }),
    );

    expect(useFinanceOverrideStore.getState().requests).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "FOV-2026-002" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Chờ ADMIN duyệt")).toBeInTheDocument();
  });
});
