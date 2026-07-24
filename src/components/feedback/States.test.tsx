import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../common/Button";
import { FeedbackState } from "./States";

describe("FeedbackState", () => {
  it("uses polite status semantics for loading", () => {
    render(
      <FeedbackState
        variant="loading"
        title="Đang tải"
        description="Vui lòng chờ"
      />,
    );
    const state = screen.getByRole("status", { name: "Đang tải" });
    expect(state).toHaveAttribute("aria-live", "polite");
    expect(state).toHaveAttribute("aria-busy", "true");
    expect(state).toHaveAccessibleDescription("Vui lòng chờ");
  });

  it("only uses alert semantics for errors that need announcement", () => {
    const { rerender } = render(
      <FeedbackState
        variant="error"
        title="Lỗi tĩnh"
        description="Mở lại sau"
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(
      <FeedbackState
        variant="error"
        announce
        title="Lỗi tức thời"
        description="Thử lại"
      />,
    );
    expect(screen.getByRole("alert")).toHaveAccessibleName("Lỗi tức thời");
  });

  it("renders actions and reference identifiers", () => {
    render(
      <FeedbackState
        variant="blocked"
        title="Tạm khóa"
        referenceId="ERR-102"
        primaryAction={<Button>Liên hệ hỗ trợ</Button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Liên hệ hỗ trợ" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ERR-102/)).toBeInTheDocument();
    expect(screen.getByText("Tạm khóa").closest("section")).toHaveClass(
      "sgdg-feedback-state--blocked",
    );
  });
});
