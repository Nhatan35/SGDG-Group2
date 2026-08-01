import { describe, expect, it } from "vitest";
import { canVisitStaffPath } from "../config/staffRoles";
import {
  filterHandoverCases,
  getHandoverSearchProjection,
} from "./handoverSearchProjection";

describe("handover governance search projection", () => {
  const source = getHandoverSearchProjection();

  it("searches by case, auction and asset without mutating the source", () => {
    const before = structuredClone(source);
    expect(filterHandoverCases(source, "HO-5711R", "ALL", "ALL")).toHaveLength(1);
    expect(filterHandoverCases(source, "patek", "ALL", "ALL")).toHaveLength(1);
    expect(filterHandoverCases(source, "nautilus", "ALL", "ALL")).toHaveLength(1);
    expect(source).toEqual(before);
  });

  it("derives status and overdue filters and distinguishes no match", () => {
    expect(
      filterHandoverCases(source, "", "SCHEDULE_PROPOSED", "ALL"),
    ).toHaveLength(1);
    expect(filterHandoverCases(source, "", "ALL", "OVERDUE")).toHaveLength(1);
    expect(filterHandoverCases(source, "missing", "ALL", "ALL")).toEqual([]);
    expect(source).not.toEqual([]);
  });

  it("masks customer data and provides the controlled next action", () => {
    expect(source[0].customerReferenceMasked).toContain("•••");
    expect(source[0].nextAction).toBeTruthy();
  });

  it("allows only ADMIN through the governance route boundary", () => {
    expect(canVisitStaffPath("ADMIN", "/governance/handover-cases")).toBe(true);
    expect(
      canVisitStaffPath("CONTENT_STAFF", "/governance/handover-cases"),
    ).toBe(false);
    expect(canVisitStaffPath("FINANCE", "/governance/handover-cases")).toBe(
      false,
    );
  });
});
