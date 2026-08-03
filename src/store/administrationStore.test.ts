import { beforeEach, describe, expect, it } from "vitest";
import { useAdministrationStore } from "./administrationStore";

const initial = useAdministrationStore.getState();

describe("Administration maker-checker rules", () => {
  beforeEach(() => useAdministrationStore.setState(initial, true));

  it("stores the maker identity and submission reason", () => {
    useAdministrationStore
      .getState()
      .setConfigurationEffectiveAt("CFG-WORKFLOW-07", "2026-07-29T09:00");
    useAdministrationStore
      .getState()
      .submitConfiguration(
        "CFG-WORKFLOW-07",
        "admin@sgdg.demo",
        "Nguyễn Hoàng Nam",
        "Điều chỉnh ngưỡng hoàn tiền",
      );
    expect(
      useAdministrationStore
        .getState()
        .configurations.find((item) => item.id === "CFG-WORKFLOW-07"),
    ).toMatchObject({
      status: "PENDING_APPROVAL",
      makerEmail: "admin@sgdg.demo",
      submissionReason: "Điều chỉnh ngưỡng hoàn tiền",
    });
  });

  it("blocks self-approval and accepts a different checker", () => {
    useAdministrationStore
      .getState()
      .approveConfiguration(
        "CFG-SEARCH-02",
        "admin@sgdg.demo",
        "Nguyễn Hoàng Nam",
        "Tự phê duyệt",
      );
    expect(
      useAdministrationStore
        .getState()
        .configurations.find((item) => item.id === "CFG-SEARCH-02")?.status,
    ).toBe("PENDING_APPROVAL");

    useAdministrationStore
      .getState()
      .approveConfiguration(
        "CFG-SEARCH-02",
        "admin.checker@sgdg.demo",
        "Trần Ngọc Anh",
        "Đã thẩm định phạm vi masking",
      );
    expect(
      useAdministrationStore
        .getState()
        .configurations.find((item) => item.id === "CFG-SEARCH-02"),
    ).toMatchObject({
      status: "SCHEDULED",
      checkerEmail: "admin.checker@sgdg.demo",
      decisionReason: "Đã thẩm định phạm vi masking",
    });
  });

  it("stores the reason for an access decision", () => {
    useAdministrationStore
      .getState()
      .decideAccess(
        "AR-2026-041",
        "APPROVED",
        "Trần Ngọc Anh",
        "Phạm vi phù hợp ca trực",
      );
    expect(
      useAdministrationStore
        .getState()
        .accessRequests.find((item) => item.id === "AR-2026-041"),
    ).toMatchObject({
      status: "APPROVED",
      decidedBy: "Trần Ngọc Anh",
      decisionReason: "Phạm vi phù hợp ca trực",
    });
  });
});
