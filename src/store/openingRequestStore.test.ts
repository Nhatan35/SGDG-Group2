import { beforeEach, describe, expect, it } from "vitest";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  isOpeningRequestCustomerEditable,
  selectCustomerVisibleHistory,
  selectOpeningRequestForOwner,
  selectOwnedOpeningRequests,
  useOpeningRequestStore,
} from "./openingRequestStore";

const validFields = {
  title: "Đấu giá đồng hồ sưu tầm",
  assetReference: "AST-CUS-NEW-001",
  purpose: "Đề nghị SGDG tiếp nhận và tổ chức đấu giá",
  proposedStartPrice: 250_000_000,
  customerNotes: "Hồ sơ tham chiếu đã sẵn sàng.",
  declarationAccepted: true,
};

const currentDraft = () =>
  useOpeningRequestStore
    .getState()
    .records.find(
      (record) =>
        record.ownerId === CURRENT_CUSTOMER_ID && record.status === "DRAFT",
    )!;

const submitCurrentDraft = (commandId = "submit-current-draft") => {
  const draft = currentDraft();
  return useOpeningRequestStore.getState().submitOpeningRequest({
    requestId: draft.requestId,
    actorId: CURRENT_CUSTOMER_ID,
    actorRole: "CUSTOMER",
    expectedVersion: draft.version,
    commandId,
    fields: validFields,
  });
};

const startSubmittedReview = (commandId = "start-current-review") => {
  const submitted = submitCurrentDraft();
  expect(submitted.ok).toBe(true);
  if (!submitted.ok) throw new Error(submitted.message);
  const started = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId,
  });
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error(started.message);
  return started.data;
};

describe("Opening Request lifecycle command boundary", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
  });

  it("enforces customer ownership in list and load projections", () => {
    const records = useOpeningRequestStore.getState().records;
    const owned = selectOwnedOpeningRequests(records, CURRENT_CUSTOMER_ID);
    expect(owned).toHaveLength(1);
    expect(
      owned.every((record) => record.ownerId === CURRENT_CUSTOMER_ID),
    ).toBe(true);
    expect(
      selectOpeningRequestForOwner(
        records,
        "ORQ-CUS-OTHER-001",
        CURRENT_CUSTOMER_ID,
      ),
    ).toBeUndefined();
  });

  it("submits a valid draft and exposes the same logical record to Staff", () => {
    const draft = currentDraft();
    const submitted = submitCurrentDraft();
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data.requestId).toBe(draft.requestId);
    expect(submitted.data.status).toBe("SUBMITTED");
    expect(submitted.data.version).toBe(draft.version + 1);
    expect(
      useOpeningRequestStore
        .getState()
        .records.find((record) => record.requestId === draft.requestId),
    ).toBe(submitted.data);
    expect(isOpeningRequestCustomerEditable(submitted.data.status)).toBe(false);
  });

  it("rejects invalid submission data without changing the version", () => {
    const draft = currentDraft();
    const result = useOpeningRequestStore.getState().submitOpeningRequest({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "invalid-submit",
      fields: { ...validFields, assetReference: "bad ref", purpose: "" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.fieldErrors).toMatchObject({
      assetReference: expect.any(String),
      purpose: expect.any(String),
    });
    expect(currentDraft().version).toBe(draft.version);
  });

  it("blocks another owner, stale customer commands and immutable edits", () => {
    const draft = currentDraft();
    const forbidden = useOpeningRequestStore.getState().saveDraft({
      requestId: draft.requestId,
      actorId: "CUS-OTHER-002",
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "other-owner-save",
      fields: validFields,
    });
    expect(forbidden).toMatchObject({ ok: false, code: "NOT_FOUND" });

    const stale = useOpeningRequestStore.getState().saveDraft({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: 999,
      commandId: "stale-save",
      fields: validFields,
    });
    expect(stale).toMatchObject({ ok: false, code: "STALE_VERSION" });

    const submitted = submitCurrentDraft();
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const immutable = useOpeningRequestStore.getState().saveDraft({
      requestId: submitted.data.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: submitted.data.version,
      commandId: "immutable-save",
      fields: validFields,
    });
    expect(immutable).toMatchObject({
      ok: false,
      code: "INVALID_TRANSITION",
    });
  });

  it("guards Start Review authority, stale versions and duplicate commands", () => {
    const submitted = submitCurrentDraft();
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const unauthorized = useOpeningRequestStore.getState().startReview({
      requestId: submitted.data.requestId,
      actorId: "finance@sgdg.demo",
      actorRole: "FINANCE",
      expectedVersion: submitted.data.version,
      commandId: "finance-start",
    });
    expect(unauthorized).toMatchObject({
      ok: false,
      code: "ACCESS_DENIED",
    });
    const stale = useOpeningRequestStore.getState().startReview({
      requestId: submitted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: submitted.data.version - 1,
      commandId: "stale-start",
    });
    expect(stale).toMatchObject({ ok: false, code: "STALE_VERSION" });
    const started = useOpeningRequestStore.getState().startReview({
      requestId: submitted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: submitted.data.version,
      commandId: "start-once",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.data.status).toBe("UNDER_REVIEW");
    const duplicate = useOpeningRequestStore.getState().startReview({
      requestId: started.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: started.data.version,
      commandId: "start-once",
    });
    expect(duplicate).toMatchObject({
      ok: false,
      code: "DUPLICATE_COMMAND",
    });
  });

  it("requires a meaningful correction reason and affected sections", () => {
    const reviewing = startSubmittedReview();
    const noReason = useOpeningRequestStore.getState().returnForCorrection({
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.version,
      commandId: "return-no-reason",
      reason: "ngắn",
      affectedSections: [],
    });
    expect(noReason).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: {
        reason: expect.any(String),
        affectedSections: expect.any(String),
      },
    });
  });

  it("executes Submit → Return → Correct → Resubmit on the same request", () => {
    const reviewing = startSubmittedReview();
    const returned = useOpeningRequestStore.getState().returnForCorrection({
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.version,
      commandId: "return-for-purpose",
      reason: "Vui lòng bổ sung mục đích đấu giá rõ ràng.",
      affectedSections: ["Mục đích đấu giá"],
    });
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    expect(returned.data.status).toBe("RETURNED_FOR_CORRECTION");
    expect(returned.data.version).toBe(reviewing.version + 1);
    expect(returned.data.reviewerComment).toContain("bổ sung");
    expect(isOpeningRequestCustomerEditable(returned.data.status)).toBe(true);

    const saved = useOpeningRequestStore.getState().saveDraft({
      requestId: returned.data.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: returned.data.version,
      commandId: "save-correction",
      fields: { ...validFields, purpose: "Mục đích đã được cập nhật đầy đủ" },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const resubmitted = useOpeningRequestStore
      .getState()
      .submitOpeningRequest({
        requestId: saved.data.requestId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedVersion: saved.data.version,
        commandId: "resubmit-correction",
        fields: saved.data,
      });
    expect(resubmitted.ok).toBe(true);
    if (!resubmitted.ok) return;
    expect(resubmitted.data.requestId).toBe(reviewing.requestId);
    expect(resubmitted.data.status).toBe("SUBMITTED");
    expect(resubmitted.data.version).toBe(saved.data.version + 1);
    expect(resubmitted.data.previousSubmittedAt).toBeDefined();
    expect(
      resubmitted.data.history.map((entry) => entry.action),
    ).toEqual(
      expect.arrayContaining([
        "SUBMIT",
        "START_REVIEW",
        "RETURN_FOR_CORRECTION",
        "SAVE_DRAFT",
        "RESUBMIT",
      ]),
    );
  });

  it("exposes only Customer-safe history to Customer", () => {
    const reviewing = startSubmittedReview();
    const returned = useOpeningRequestStore.getState().returnForCorrection({
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.version,
      commandId: "return-safe-history",
      reason: "Vui lòng cập nhật tham chiếu tài sản đã khai báo.",
      affectedSections: ["Tham chiếu tài sản"],
    });
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    const customerHistory = selectCustomerVisibleHistory(returned.data);
    expect(
      customerHistory.every((entry) => entry.visibility === "CUSTOMER_SAFE"),
    ).toBe(true);
    expect(
      customerHistory.some((entry) => entry.action === "START_REVIEW"),
    ).toBe(false);
  });

  it("executes Submit → Reject and makes the outcome immutable", () => {
    const reviewing = startSubmittedReview();
    const tooShort = useOpeningRequestStore.getState().rejectOpeningRequest({
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.version,
      commandId: "reject-short",
      reason: "không",
    });
    expect(tooShort).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    const rejected = useOpeningRequestStore.getState().rejectOpeningRequest({
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: reviewing.version,
      commandId: "reject-complete",
      reason: "Hồ sơ không đáp ứng điều kiện tiếp nhận hiện hành.",
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.data.status).toBe("REJECTED");
    expect(isOpeningRequestCustomerEditable(rejected.data.status)).toBe(false);
    const resubmit = useOpeningRequestStore.getState().submitOpeningRequest({
      requestId: rejected.data.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: rejected.data.version,
      commandId: "resubmit-rejected",
      fields: validFields,
    });
    expect(resubmit).toMatchObject({
      ok: false,
      code: "INVALID_TRANSITION",
    });
  });

  it("executes Submit → Accept for Draft without creating a Session", () => {
    const reviewing = startSubmittedReview();
    const accepted = useOpeningRequestStore
      .getState()
      .acceptForDraftPreparation({
        requestId: reviewing.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: reviewing.version,
        commandId: "accept-for-draft",
        reason: "Hồ sơ hợp lệ để tiếp nhận cho bước chuẩn bị bản nháp.",
      });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.data.status).toBe("ACCEPTED_FOR_DRAFT");
    expect(accepted.data.acceptedOpeningRequestVersion).toBe(
      accepted.data.version,
    );
    expect(isOpeningRequestCustomerEditable(accepted.data.status)).toBe(false);
    expect(accepted.data).not.toHaveProperty("sessionId");
    expect(accepted.data).not.toHaveProperty("linkedSession");
    expect(accepted.data.history.at(-1)?.action).toBe("ACCEPT_FOR_DRAFT");
  });

  it("routes a governance concern, suspends ordinary review and masks it from Customer", () => {
    const reviewing = startSubmittedReview();
    const missingReason = useOpeningRequestStore
      .getState()
      .recordGovernanceConcern({
        requestId: reviewing.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: reviewing.version,
        commandId: "governance-short",
        concernReason: "ngắn",
        evidenceReferenceIds: [],
      });
    expect(missingReason).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    const governed = useOpeningRequestStore
      .getState()
      .recordGovernanceConcern({
        requestId: reviewing.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: reviewing.version,
        commandId: "route-governance",
        concernReason:
          "Cần ADMIN xem xét quan ngại quản trị nội bộ của hồ sơ.",
        evidenceReferenceIds: ["EVD-PRIVATE-001"],
      });
    expect(governed.ok).toBe(true);
    if (!governed.ok) return;
    expect(governed.data.status).toBe("GOVERNANCE_REVIEW");
    expect(
      selectCustomerVisibleHistory(governed.data).some(
        (entry) => entry.reason?.includes("quan ngại"),
      ),
    ).toBe(false);
    const ordinaryReturn = useOpeningRequestStore
      .getState()
      .returnForCorrection({
        requestId: governed.data.requestId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedVersion: governed.data.version,
        commandId: "return-governed",
        reason: "Không được phép trả hồ sơ trong lúc quản trị.",
        affectedSections: ["Mục đích đấu giá"],
      });
    expect(ordinaryReturn).toMatchObject({
      ok: false,
      code: "INVALID_TRANSITION",
    });
    expect(
      useOpeningRequestStore
        .getState()
        .records.filter((record) => record.status === "GOVERNANCE_REVIEW")
        .map((record) => record.requestId),
    ).toContain(governed.data.requestId);
  });

  it.each([
    ["FINANCE", "finance@sgdg.demo"],
    ["CUSTOMER_SUPPORT", "support@sgdg.demo"],
    ["ADMIN", "admin@sgdg.demo"],
  ] as const)(
    "does not grant ordinary Opening Request decisions to %s",
    (actorRole, actorId) => {
      const reviewing = startSubmittedReview();
      const result = useOpeningRequestStore
        .getState()
        .rejectOpeningRequest({
          requestId: reviewing.requestId,
          actorId,
          actorRole,
          expectedVersion: reviewing.version,
          commandId: `unauthorized-reject-${actorRole}`,
          reason: "Vai trò này không có thẩm quyền quyết định hồ sơ.",
        });
      expect(result).toMatchObject({
        ok: false,
        code: "ACCESS_DENIED",
      });
    },
  );

  it("rejects stale expectedVersion across every versioned mutation", () => {
    const draft = currentDraft();
    const staleSubmit = useOpeningRequestStore
      .getState()
      .submitOpeningRequest({
        requestId: draft.requestId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedVersion: draft.version + 1,
        commandId: "stale-submit-all",
        fields: validFields,
      });
    expect(staleSubmit).toMatchObject({
      ok: false,
      code: "STALE_VERSION",
    });

    const reviewing = startSubmittedReview();
    const base = {
      requestId: reviewing.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedVersion: reviewing.version - 1,
    };
    expect(
      useOpeningRequestStore.getState().returnForCorrection({
        ...base,
        commandId: "stale-return-all",
        reason: "Lý do hợp lệ nhưng phiên bản đã cũ.",
        affectedSections: ["Mục đích đấu giá"],
      }),
    ).toMatchObject({ ok: false, code: "STALE_VERSION" });
    expect(
      useOpeningRequestStore.getState().rejectOpeningRequest({
        ...base,
        commandId: "stale-reject-all",
        reason: "Lý do hợp lệ nhưng phiên bản đã cũ.",
      }),
    ).toMatchObject({ ok: false, code: "STALE_VERSION" });
    expect(
      useOpeningRequestStore.getState().acceptForDraftPreparation({
        ...base,
        commandId: "stale-accept-all",
        reason: "Căn cứ hợp lệ nhưng phiên bản đã cũ.",
      }),
    ).toMatchObject({ ok: false, code: "STALE_VERSION" });
    expect(
      useOpeningRequestStore.getState().recordGovernanceConcern({
        ...base,
        commandId: "stale-governance-all",
        concernReason: "Quan ngại hợp lệ nhưng phiên bản đã cũ.",
        evidenceReferenceIds: [],
      }),
    ).toMatchObject({ ok: false, code: "STALE_VERSION" });
  });
});
