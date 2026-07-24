import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  useRef,
  useState,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

function DialogHarness({ preventClose = false }: { preventClose?: boolean }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => setOpen(true)}>Mở xác nhận</button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Xác nhận đặt giá"
        description="Kiểm tra mức giá trước khi gửi."
        initialFocusRef={inputRef}
        preventClose={preventClose}
        footer={<Button onClick={() => setOpen(false)}>Xác nhận</Button>}
      >
        <input ref={inputRef} aria-label="Mức giá" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("labels the dialog and moves initial focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Mở xác nhận" }));
    const dialog = screen.getByRole("dialog", {
      name: "Xác nhận đặt giá",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription(
      "Kiểm tra mức giá trước khi gửi.",
    );
    expect(screen.getByRole("textbox", { name: "Mức giá" })).toHaveFocus();
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Mở xác nhận" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("traps focus at both ends", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Mở xác nhận" }));
    const input = screen.getByRole("textbox", { name: "Mức giá" });
    const confirm = screen.getByRole("button", { name: "Xác nhận" });
    confirm.focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Đóng hộp thoại" })).toHaveFocus();
    screen.getByRole("button", { name: "Đóng hộp thoại" }).focus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    expect(input).not.toHaveFocus();
  });

  it("supports backdrop close and prevent-close policy", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Dialog open onOpenChange={onOpenChange} title="A">
        Nội dung
      </Dialog>,
    );
    const overlay = screen.getByRole("dialog").parentElement!;
    fireEvent.mouseDown(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    rerender(
      <Dialog open preventClose onOpenChange={onOpenChange} title="A">
        Nội dung
      </Dialog>,
    );
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Đóng hộp thoại" })).toBeDisabled();
  });
});
