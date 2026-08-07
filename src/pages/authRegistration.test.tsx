import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { RegisterPage } from "./auth/AuthPages";
import { useDemoStore } from "../store/demoStore";

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useDemoStore.setState({
      authenticated: false,
      actorRole: "CUSTOMER",
      userName: "Nguyễn Minh Anh",
    });
  });

  it("shows inline validation instead of failing silently", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(screen.getByRole("button", { name: "Gửi mã OTP" }));

    expect(screen.getByText("Vui lòng nhập họ và tên.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Bạn cần đồng ý điều khoản sử dụng và chính sách bảo mật.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tạo tài khoản SGDG" }),
    ).toBeInTheDocument();
  });

  it("shows the OTP step and a visible success result", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText("Họ và tên"), "Trần An");
    await user.type(screen.getByLabelText("Email"), "an@example.com");
    await user.type(screen.getByLabelText("Số điện thoại"), "0912345678");
    await user.type(screen.getByLabelText("Mật khẩu"), "Password1");
    await user.click(
      screen.getByRole("checkbox", {
        name: /Tôi đồng ý điều khoản sử dụng/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Gửi mã OTP" }));

    expect(
      screen.getByRole("heading", { name: "Xác minh mã OTP" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("an@example.com");

    await user.type(screen.getByLabelText("Mã OTP"), "123456");
    await user.click(
      screen.getByRole("button", { name: "Xác nhận và tạo tài khoản" }),
    );

    expect(
      screen.getByRole("heading", { name: "Tạo tài khoản thành công" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tài khoản demo đã đăng nhập",
    );
    expect(useDemoStore.getState().authenticated).toBe(true);
    expect(useDemoStore.getState().userName).toBe("Trần An");
  });
});
