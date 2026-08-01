import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSupportStore } from "../store/supportStore";
import { FinancialInvestigationDetail } from "./admin/FinancialInvestigationPages";

const initialSupportState = useSupportStore.getState();

describe("Finance transaction investigation workspace", () => {
  beforeEach(() => {
    localStorage.clear();
    useSupportStore.setState(initialSupportState, true);
  });

  afterEach(() => {
    useSupportStore.setState(initialSupportState, true);
  });

  it("accepts a Support handoff and submits findings back to Support", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/finance/investigations/FIN-INV-088"]}>
        <Routes>
          <Route
            path="/finance/investigations/:investigationId"
            element={<FinancialInvestigationDetail />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Bắt đầu điều tra" }));
    expect(
      useSupportStore
        .getState()
        .investigations.find((item) => item.id === "FIN-INV-088")?.status,
    ).toBe("IN_PROGRESS");

    await user.type(
      screen.getByLabelText("Kết luận hoặc nội dung cần bổ sung"),
      "Đã khớp ledger, gateway và batch đối soát của REF-0214.",
    );
    await user.click(screen.getByRole("button", { name: "Gửi kết luận" }));

    expect(
      useSupportStore
        .getState()
        .investigations.find((item) => item.id === "FIN-INV-088"),
    ).toMatchObject({
      status: "SUBMITTED",
      findings: "Đã khớp ledger, gateway và batch đối soát của REF-0214.",
    });
    expect(
      screen.getByText("Đã gửi kết luận về Customer Support."),
    ).toBeInTheDocument();
  });
});
