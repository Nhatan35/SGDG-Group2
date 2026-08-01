import { describe, expect, it } from "vitest";
import { buildVietQrPayload, normalizeVietQrText } from "./vietQr";

describe("VietQR payload", () => {
  it("matches the published VietQR transfer payload example", () => {
    expect(
      buildVietQrPayload({
        bankBin: "970415",
        accountNumber: "113366668888",
        amount: 79_000,
        additionalInfo: "Ung Ho Quy Vac Xin",
      }),
    ).toBe(
      "00020101021238560010A0000007270126000697041501121133666688880208QRIBFTTA53037045405790005802VN62220818Ung Ho Quy Vac Xin63043ACF",
    );
  });

  it("normalizes Vietnamese transfer descriptions for banking apps", () => {
    expect(normalizeVietQrText("  Thanh toán  Patek #002  ")).toBe(
      "Thanh toan Patek 002",
    );
  });
});
