import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Button, ButtonLink } from "./Button";

describe("Button", () => {
  it("defaults to type button and applies variant classes", () => {
    render(<Button variant="live">Đặt giá</Button>);
    const button = screen.getByRole("button", { name: "Đặt giá" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("sgdg-button--live", "primary");
  });

  it("supports an explicit submit type", () => {
    render(<Button type="submit">Gửi</Button>);
    expect(screen.getByRole("button", { name: "Gửi" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("blocks interaction when disabled or loading", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Lưu
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <Button loading loadingText="Đang lưu hồ sơ" onClick={onClick}>
        Lưu
      </Button>,
    );
    const loadingButton = screen.getByRole("button");
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Đang lưu hồ sơ");
    fireEvent.click(loadingButton);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps icon-only buttons accessible through an explicit label", () => {
    render(
      <Button aria-label="Đóng" leftIcon={<span>×</span>}>
        <span className="sr-only">Đóng</span>
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
  });
});

describe("ButtonLink", () => {
  it("uses anchor navigation semantics without nesting a button", () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/auctions" variant="secondary">
          Xem phiên
        </ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Xem phiên" });
    expect(link).toHaveAttribute("href", "/auctions");
    expect(link).toHaveClass("sgdg-button--secondary");
    expect(link.querySelector("button")).toBeNull();
  });
});
