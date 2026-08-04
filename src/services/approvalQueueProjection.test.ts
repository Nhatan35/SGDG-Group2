import { describe, expect, it } from "vitest";
import { buildApprovalQueue } from "./approvalQueueProjection";

describe("approval queue projection", () => {
  it("maps domain-owned requests to their source detail routes", () => {
    const items = buildApprovalQueue({
      accessRequests: [],
      contents: [
        {
          id: "CMS-01",
          title: "Thông báo",
          slug: "thong-bao",
          type: "NEWS",
          category: "Tin tức",
          status: "PENDING_REVIEW",
          author: "Content Staff",
          summary: "",
          body: "",
          seoTitle: "",
          seoDescription: "",
          keywords: "",
          featuredImage: "",
          updatedAt: "20/07/2026",
          version: 1,
        },
      ],
      financeOverrides: [],
      eligibilityReviews: [],
      openingRequests: [],
      disputes: [],
      configurations: [],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "CMS-01",
      sourceDomain: "CONTENT",
      status: "PENDING",
      detailRoute: "/governance/content-approvals/CMS-01",
    });
  });
});
