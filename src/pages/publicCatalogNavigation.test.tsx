import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PublicHeader } from "../components/navigation/PublicHeader";
import { useDemoStore } from "../store/demoStore";
import { AuctionsPage } from "./public/AuctionsPage";

function renderCatalog(entry = "/auctions") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <PublicHeader />
      <AuctionsPage />
    </MemoryRouter>,
  );
}

describe("public catalog navigation and filters", () => {
  beforeEach(() => {
    useDemoStore.setState({ authenticated: false });
  });

  it("removes Upcoming from the header and terminal states from filters", () => {
    renderCatalog();

    const navigation = screen.getByRole("navigation", {
      name: "Điều hướng chính",
    });
    expect(
      navigation.querySelector('a[href="/auctions/upcoming"]'),
    ).not.toBeInTheDocument();
    expect(
      navigation.querySelector('a[href="/open-auction"]'),
    ).toHaveTextContent("Mở đấu giá");
    expect(
      screen.queryByRole("button", { name: "Đã kết thúc" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Đã hủy" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Đang diễn ra" }),
    ).toBeInTheDocument();
  });

  it.each(["closed", "cancelled"])(
    "ignores the removed %s status from an old URL",
    (removedStatus) => {
      const { container } = renderCatalog(
        `/auctions?status=${removedStatus}`,
      );

      // Khu vực sân khấu luôn trưng bày ba phiên nổi bật; các phiên còn lại
      // được hiển thị trong thanh "Khám phá thêm".
      expect(container.querySelectorAll(".catalog-auction-grid .auction-card"))
        .toHaveLength(3);
      expect(
        screen.queryByRole("button", {
          name: removedStatus === "closed" ? "Đã kết thúc" : "Đã hủy",
        }),
      ).not.toBeInTheDocument();
    },
  );
});
