import { describe, expect, it } from "vitest";
import {
  canVisitStaffPath,
  demoStaffAccounts,
  workspaceForRole,
} from "./staffRoles";

describe("staff role workspaces", () => {
  it("maps each demo account to one fixed workspace", () => {
    expect(workspaceForRole(demoStaffAccounts["admin@sgdg.demo"])).toBe(
      "/admin",
    );
    expect(workspaceForRole(demoStaffAccounts["support@sgdg.demo"])).toBe(
      "/support",
    );
    expect(workspaceForRole(demoStaffAccounts["content@sgdg.demo"])).toBe(
      "/ops",
    );
    expect(workspaceForRole(demoStaffAccounts["finance@sgdg.demo"])).toBe(
      "/finance",
    );
  });
  it("keeps CMS authoring and content approval separated", () => {
    expect(canVisitStaffPath("CONTENT_STAFF", "/cms/contents")).toBe(true);
    expect(
      canVisitStaffPath("CONTENT_STAFF", "/governance/content-approvals"),
    ).toBe(false);
    expect(canVisitStaffPath("ADMIN", "/governance/content-approvals")).toBe(
      true,
    );
    expect(canVisitStaffPath("ADMIN", "/cms/contents")).toBe(false);
    expect(canVisitStaffPath("FINANCE", "/cms")).toBe(false);
    expect(canVisitStaffPath("CUSTOMER_SUPPORT", "/cms/media")).toBe(false);
  });
  it("keeps Opening Request review and governance routes narrowly separated", () => {
    expect(
      canVisitStaffPath("CONTENT_STAFF", "/ops/opening-requests/ORQ-001"),
    ).toBe(true);
    expect(
      canVisitStaffPath(
        "CONTENT_STAFF",
        "/governance/opening-requests/ORQ-001",
      ),
    ).toBe(false);
    expect(
      canVisitStaffPath("ADMIN", "/governance/opening-requests/ORQ-001"),
    ).toBe(true);
    expect(
      canVisitStaffPath("FINANCE", "/ops/opening-requests/ORQ-001"),
    ).toBe(false);
    expect(
      canVisitStaffPath(
        "CUSTOMER_SUPPORT",
        "/ops/opening-requests/ORQ-001",
      ),
    ).toBe(false);
  });
  it("keeps SGDG-managed Session creation inside Content Staff operations", () => {
    expect(
      canVisitStaffPath("CONTENT_STAFF", "/ops/auctions/new"),
    ).toBe(true);
    expect(canVisitStaffPath("ADMIN", "/ops/auctions/new")).toBe(false);
    expect(canVisitStaffPath("FINANCE", "/ops/auctions/new")).toBe(false);
    expect(
      canVisitStaffPath("CUSTOMER_SUPPORT", "/ops/auctions/new"),
    ).toBe(false);
  });
  it("separates Configuration preparation from narrow ADMIN confirmation", () => {
    expect(
      canVisitStaffPath(
        "CONTENT_STAFF",
        "/ops/auctions/dynamic-session/rules",
      ),
    ).toBe(true);
    expect(
      canVisitStaffPath(
        "CONTENT_STAFF",
        "/governance/auction-configurations",
      ),
    ).toBe(false);
    expect(
      canVisitStaffPath(
        "ADMIN",
        "/governance/auction-configurations/configuration-001",
      ),
    ).toBe(true);
    expect(
      canVisitStaffPath("ADMIN", "/ops/auctions/dynamic-session/rules"),
    ).toBe(false);
    expect(
      canVisitStaffPath(
        "FINANCE",
        "/governance/auction-configurations/configuration-001",
      ),
    ).toBe(false);
    expect(
      canVisitStaffPath(
        "CUSTOMER_SUPPORT",
        "/governance/auction-configurations",
      ),
    ).toBe(false);
  });
  it("keeps the internal Auction Content workspace exclusive to Content Staff", () => {
    const path = "/ops/auctions/dynamic-session/content";
    expect(canVisitStaffPath("CONTENT_STAFF", path)).toBe(true);
    expect(canVisitStaffPath("ADMIN", path)).toBe(false);
    expect(canVisitStaffPath("FINANCE", path)).toBe(false);
    expect(canVisitStaffPath("CUSTOMER_SUPPORT", path)).toBe(false);
  });
  it("keeps Content Review evidence and mutations exclusive to Content Staff", () => {
    const path = "/ops/auctions/dynamic-session/content-review";
    expect(canVisitStaffPath("CONTENT_STAFF", path)).toBe(true);
    expect(canVisitStaffPath("ADMIN", path)).toBe(false);
    expect(canVisitStaffPath("FINANCE", path)).toBe(false);
    expect(canVisitStaffPath("CUSTOMER_SUPPORT", path)).toBe(false);
  });
  it("separates Package preparation from the read-only ADMIN dynamic queue", () => {
    const preparation = "/ops/auctions/dynamic-session/approval-package";
    const queue = "/governance/auction-approval-packages";
    const detail =
      "/governance/auction-approval-packages/approval-package-dynamic-session";
    expect(canVisitStaffPath("CONTENT_STAFF", preparation)).toBe(true);
    expect(canVisitStaffPath("ADMIN", preparation)).toBe(false);
    expect(canVisitStaffPath("CONTENT_STAFF", queue)).toBe(false);
    expect(canVisitStaffPath("ADMIN", queue)).toBe(true);
    expect(canVisitStaffPath("ADMIN", detail)).toBe(true);
    expect(canVisitStaffPath("FINANCE", preparation)).toBe(false);
    expect(canVisitStaffPath("FINANCE", queue)).toBe(false);
    expect(canVisitStaffPath("CUSTOMER_SUPPORT", detail)).toBe(false);
  });
  it("keeps Registration Validation on the ADMIN governance boundary", () => {
    const path =
      "/governance/customer-registrations/customer-registration-001/validation";
    expect(canVisitStaffPath("ADMIN", path)).toBe(true);
    expect(canVisitStaffPath("CONTENT_STAFF", path)).toBe(false);
    expect(canVisitStaffPath("FINANCE", path)).toBe(false);
    expect(canVisitStaffPath("CUSTOMER_SUPPORT", path)).toBe(false);
  });
});
