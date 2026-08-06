import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HandoverOverviewPage } from "./handover/HandoverOverviewPage";
import { useHandoverDeliveryAddressStore } from "../store/handoverDeliveryAddressStore";

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/me/handover/HO-5711R-2026?auctionId=patek-nautilus",
      ]}
    >
      <Routes>
        <Route
          path="/me/handover/:caseId"
          element={<HandoverOverviewPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("handover delivery address editor", () => {
  beforeEach(() => {
    localStorage.clear();
    useHandoverDeliveryAddressStore.getState().resetForTests();
  });

  it("updates and persists the receiver address for the handover case", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "Chỉnh sửa" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Chỉnh sửa địa chỉ nhận hàng" }),
    ).toBeInTheDocument();

    const addressInput = screen.getByRole("textbox", {
      name: "Địa chỉ cụ thể",
    });
    await user.clear(addressInput);
    await user.type(addressInput, "25 Lê Lợi");
    await user.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));

    expect(
      screen.getByText("25 Lê Lợi, P. Bến Nghé, Q.1, TP. HCM"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã cập nhật địa chỉ nhận hàng",
    );
    expect(
      useHandoverDeliveryAddressStore.getState().addresses[
        "HO-5711R-2026"
      ],
    ).toMatchObject({ addressLine: "25 Lê Lợi" });
  });
});
