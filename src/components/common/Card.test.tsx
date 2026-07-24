import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
} from "./Card";

describe("Card", () => {
  it("renders the requested semantic wrapper and variant", () => {
    render(
      <Card as="section" variant="warm" aria-label="Thông tin phiên">
        Nội dung
      </Card>,
    );
    expect(
      screen.getByRole("region", { name: "Thông tin phiên" }),
    ).toHaveClass("sgdg-card", "sgdg-card--warm");
  });

  it("composes structural slots without creating interactive behavior", () => {
    const { container } = render(
      <Card>
        <CardHeader>Tiêu đề</CardHeader>
        <CardBody>Nội dung</CardBody>
        <CardFooter>Chân thẻ</CardFooter>
      </Card>,
    );
    expect(container.querySelector(".sgdg-card__header")).toHaveTextContent(
      "Tiêu đề",
    );
    expect(container.querySelector("a, button")).toBeNull();
  });
});
