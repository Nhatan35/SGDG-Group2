import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResilientImage } from "./ResilientImage";

describe("ResilientImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports the failed source and displays the fallback", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ResilientImage src="/assets/missing-product.jpg" alt="Tài sản" />);
    const image = screen.getByRole("img", { name: "Tài sản" });

    fireEvent.error(image);

    expect(error).toHaveBeenCalledWith(
      "[ImageLoader] Product image failed to load.",
      expect.objectContaining({
        failedSource: expect.stringContaining("missing-product.jpg"),
        fallbackSrc: "/assets/auction-image-fallback.svg",
      }),
    );
    expect(image).toHaveAttribute(
      "src",
      "/assets/auction-image-fallback.svg",
    );
    expect(image).toHaveAttribute(
      "data-failed-source",
      expect.stringContaining("missing-product.jpg"),
    );
  });
});
