import { beforeEach, describe, expect, it } from "vitest";
import { useCustomerGovernanceStore } from "./customerGovernanceStore";

const initial = useCustomerGovernanceStore.getState();

describe("customer governance", () => {
  beforeEach(() => useCustomerGovernanceStore.setState(initial, true));

  it("keeps account access separate from eKYC status", () => {
    useCustomerGovernanceStore
      .getState()
      .decideEkycException("CUS-002", "REQUEST_INFO", "Admin", "Thiếu hồ sơ");
    const account = useCustomerGovernanceStore
      .getState()
      .accounts.find((item) => item.id === "CUS-002");
    expect(account).toMatchObject({
      accountStatus: "ACTIVE",
      ekycStatus: "NEEDS_ADDITIONAL_INFO",
      supportHandoff: true,
    });
  });
});
