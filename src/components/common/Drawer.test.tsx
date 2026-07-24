import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Drawer } from "./Drawer";

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Mở Auto-bid</button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Thiết lập Auto-bid"
        mobilePresentation="bottom-sheet"
        footer={<Button>Lưu</Button>}
      >
        <input aria-label="Giới hạn" />
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("opens with mobile presentation class and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const trigger = screen.getByRole("button", { name: "Mở Auto-bid" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toHaveClass(
      "sgdg-drawer__panel--mobile-bottom-sheet",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("traps focus and blocks close while protected", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer
        open
        preventClose
        onOpenChange={onOpenChange}
        title="Đang lưu"
        footer={<Button>Cuối</Button>}
      >
        <button>Đầu</button>
      </Drawer>,
    );
    const last = screen.getByRole("button", { name: "Cuối" });
    last.focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Đầu" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
