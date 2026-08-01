import { describe, expect, it } from "vitest";
import {
  proposeSensitiveChange,
  saveConfiguration,
  submitConfiguration,
  type AuctionConfiguration,
} from "./auctionConfigurationCommands";

const draft: AuctionConfiguration = {
  ruleVersionId: "RULE-001-V1",
  version: 1,
  status: "DRAFT_PROPOSAL",
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
};

describe("auction configuration command boundary", () => {
  it("allows content staff to save a valid draft without schedule data", () => {
    const result = saveConfiguration(draft, "CONTENT_STAFF", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.version).toBe(2);
    expect("publicationStatus" in result.configuration).toBe(false);
  });

  it("rejects invalid prices, missing policies and unauthorized actors", () => {
    expect(
      saveConfiguration({ ...draft, startingPrice: 0 }, "CONTENT_STAFF", 1),
    ).toMatchObject({ ok: false, reason: "INVALID" });
    expect(
      saveConfiguration(
        { ...draft, depositPolicyReference: "" },
        "CONTENT_STAFF",
        1,
      ),
    ).toMatchObject({ ok: false, reason: "INVALID" });
    expect(saveConfiguration(draft, "ADMIN", 1)).toEqual({
      ok: false,
      reason: "FORBIDDEN",
    });
  });

  it("rejects stale and immutable commits", () => {
    expect(submitConfiguration(draft, "CONTENT_STAFF", 2)).toEqual({
      ok: false,
      reason: "STALE",
    });
    expect(
      saveConfiguration(
        { ...draft, status: "APPROVED_SNAPSHOT" },
        "CONTENT_STAFF",
        1,
      ),
    ).toEqual({ ok: false, reason: "IMMUTABLE" });
  });

  it("creates a governed change while preserving the approved snapshot", () => {
    const approved = { ...draft, status: "APPROVED_SNAPSHOT" as const };
    const result = proposeSensitiveChange(
      approved,
      "CONTENT_STAFF",
      1,
      "Điều chỉnh theo thẩm định mới",
      { startingPrice: 3_000_000_000 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.startingPrice).toBe(3_000_000_000);
    expect(result.configuration.status).toBe("PENDING_REVIEW");
    expect(approved.startingPrice).toBe(2_900_000_000);
    expect(
      proposeSensitiveChange(approved, "CONTENT_STAFF", 1, "", {
        startingPrice: 3_000_000_000,
      }),
    ).toEqual({ ok: false, reason: "REASON_REQUIRED" });
  });
});
