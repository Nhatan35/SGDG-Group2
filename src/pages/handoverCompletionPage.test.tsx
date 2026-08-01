import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HandoverCompletionPage } from "./handover/HandoverCompletionPage";

afterEach(() => {
  vi.useRealTimers();
});

describe("handover completion review", () => {
  it("shows the success state and redirects to the home page", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter
        initialEntries={[
          "/me/handover/HO-5711R-2026/completion?auctionId=patek-nautilus",
        ]}
      >
        <Routes>
          <Route
            path="/me/handover/:caseId/completion"
            element={<HandoverCompletionPage />}
          />
          <Route path="/" element={<h1>Trang chủ</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    expect(
      screen.getByRole("heading", { name: "Đánh giá thành công!" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã gửi đánh giá thành công",
    );

    act(() => vi.advanceTimersByTime(1_999));
    expect(screen.queryByRole("heading", { name: "Trang chủ" })).toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole("heading", { name: "Trang chủ" }),
    ).toBeInTheDocument();
  });
});
