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
});
