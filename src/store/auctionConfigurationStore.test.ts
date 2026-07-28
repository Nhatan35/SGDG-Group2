import { beforeEach, describe, expect, it } from "vitest";
import type { SgdgManagedSessionDraft } from "../services/assetReadinessService";
import {
  getApprovalPackages,
  getAuctionRuleFixture,
} from "../services/mock/operationsService";
import { useAssetReadinessStore } from "./assetReadinessStore";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  CURRENT_CUSTOMER_ID,
  useOpeningRequestStore,
} from "./openingRequestStore";
import {
  type AuctionConfigurationProposal,
  type AuctionConfigurationRules,
  type ConfigurationSection,
  useAuctionConfigurationStore,
  validateConfiguration,
} from "./auctionConfigurationStore";
import { getAuctionRoomFeePolicy } from "../services/roomValueTierPolicy";

const readyRules: AuctionConfigurationRules = {
  startingPrice: 2_900_000_000,
  minimumIncrement: 25_000_000,
  depositPolicyReference: "DEP-STD-01",
  eligibilityPolicyReference: "ELG-STD-01",
  extensionPolicyReference: "EXT-02",
  fallbackPolicyReference: "FB-READONLY",
};

const directDraft: SgdgManagedSessionDraft = {
  assetId: "AST-OMEGA-SPD-001",
  title: "Omega governed configuration",
  purpose: "Prepare a governed Configuration Proposal",
  region: "Ho Chi Minh City",
  ownerId: CONTENT_STAFF_ACTOR_ID,
};

function createDirectSession(commandId = "config-direct-session") {
  const reference = useAssetReadinessStore
    .getState()
    .requestAssetReadinessReference({
      assetId: directDraft.assetId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId: `${commandId}-reference`,
      scenario: "ready",
    });
  if (!reference.ok) throw new Error(reference.message);
  const created = useAuctionSessionStore
    .getState()
    .createSgdgManagedDraftSession({
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      commandId,
      draft: directDraft,
      assetReadinessReferenceId: reference.reference.referenceId,
      expectedAssetVersion: reference.reference.assetVersion,
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!created.ok) throw new Error(created.message);
  return created.session;
}

function createLinkedSession() {
  const draft = useOpeningRequestStore
    .getState()
    .records.find(
      (item) =>
        item.ownerId === CURRENT_CUSTOMER_ID && item.status === "DRAFT",
    )!;
  const submitted = useOpeningRequestStore
    .getState()
    .submitOpeningRequest({
      requestId: draft.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: draft.version,
      commandId: "config-linked-request-submit",
      fields: {
        title: "Customer-requested governed configuration",
        assetReference: "AST-CUS-CONFIG-001",
        purpose: "Create a linked Session for configuration evidence",
        proposedStartPrice: 900_000_000,
        customerNotes: "",
        declarationAccepted: true,
      },
    });
  if (!submitted.ok) throw new Error(submitted.message);
  const review = useOpeningRequestStore.getState().startReview({
    requestId: submitted.data.requestId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedVersion: submitted.data.version,
    commandId: "config-linked-request-review",
  });
  if (!review.ok) throw new Error(review.message);
  const accepted = useOpeningRequestStore
    .getState()
    .acceptForDraftPreparation({
      requestId: review.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedVersion: review.data.version,
      commandId: "config-linked-request-accept",
      reason: "Request is eligible for deterministic draft preparation.",
    });
  if (!accepted.ok) throw new Error(accepted.message);
  const linked = useAuctionSessionStore
    .getState()
    .createLinkedSessionFromAcceptedRequest({
      requestId: accepted.data.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedRequestVersion: accepted.data.version,
      commandId: "config-linked-session",
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
  if (!linked.ok) throw new Error(linked.message);
  return linked.session;
}

function createProposal(
  session: PersistedAuctionSession,
  commandId = `create-config-${session.sessionId}`,
) {
  const result = useAuctionConfigurationStore
    .getState()
    .createConfigurationDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: session.currentVersion,
      commandId,
    });
  if (!result.ok) throw new Error(result.message);
  return result.proposal;
}

function saveProposal(
  proposal: AuctionConfigurationProposal,
  rules = readyRules,
  commandId = `save-config-${proposal.configurationId}-v${proposal.proposalVersion}`,
) {
  const result = useAuctionConfigurationStore.getState().saveConfigurationDraft({
    configurationId: proposal.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: proposal.proposalVersion,
    commandId,
    values: rules,
  });
  if (!result.ok) throw new Error(result.message);
  return result.proposal;
}

function applyPolicyResolution(
  proposal: AuctionConfigurationProposal,
  session: PersistedAuctionSession,
  commandId = `apply-policy-${proposal.configurationId}-v${proposal.proposalVersion}`,
) {
  return useAuctionConfigurationStore
    .getState()
    .applyAuctionRoomMemberFeeResolution({
      configurationId: proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF",
      expectedProposalVersion: proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      expectedPolicyVersion: getAuctionRoomFeePolicy().decisionVersion,
      commandId,
    });
}

function submitProposal(
  proposal: AuctionConfigurationProposal,
  session: PersistedAuctionSession,
  commandId = `submit-config-${proposal.configurationId}-v${proposal.proposalVersion}`,
) {
  let current = proposal;
  if (
    !["READY", "BUSINESS_DECISION_REQUIRED"].includes(
      current.overallConfigurationResolutionState,
    ) &&
    typeof current.rules.startingPrice === "number" &&
    Number.isFinite(current.rules.startingPrice) &&
    current.rules.startingPrice > 0
  ) {
    const applied = applyPolicyResolution(
      current,
      session,
      `${commandId}-apply-policy`,
    );
    if (!applied.ok) return applied;
    current = applied.proposal;
  }
  return useAuctionConfigurationStore.getState().submitConfigurationProposal({
    configurationId: current.configurationId,
    actorId: CONTENT_STAFF_ACTOR_ID,
    actorRole: "CONTENT_STAFF",
    expectedProposalVersion: current.proposalVersion,
    expectedSessionVersion: session.currentVersion,
    commandId,
  });
}

describe("persisted Auction Configuration aggregate", () => {
  beforeEach(() => {
    localStorage.clear();
    useOpeningRequestStore.getState().resetForTests();
    useAssetReadinessStore.getState().resetDeterministicAssetReadinessState();
    useAuctionSessionStore.getState().resetDeterministicSessionState();
    useAuctionConfigurationStore
      .getState()
      .resetDeterministicConfigurationState();
  });

  it("allows only CONTENT_STAFF to create one Draft for an eligible dynamic Session", () => {
    const session = createDirectSession();
    for (const actorRole of [
      "ADMIN",
      "CUSTOMER",
      "FINANCE",
      "CUSTOMER_SUPPORT",
    ] as const) {
      expect(
        useAuctionConfigurationStore.getState().createConfigurationDraft({
          sessionId: session.sessionId,
          actorId: `blocked-${actorRole}`,
          actorRole,
          expectedSessionVersion: session.currentVersion,
          commandId: `blocked-create-${actorRole}`,
        }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    }
    const proposal = createProposal(session);
    expect(proposal).toMatchObject({
      proposalVersion: 1,
      status: "DRAFT",
      managementMode: "SGDG_MANAGED",
      creationSource: "DIRECT_SGDG",
      roomResolutionState: "REQUIRED",
      listingFeeResolutionState: "REQUIRED",
      overallConfigurationResolutionState: "INCOMPLETE",
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .createConfigurationDraft({
          sessionId: session.sessionId,
          actorId: CONTENT_STAFF_ACTOR_ID,
          actorRole: "CONTENT_STAFF",
          expectedSessionVersion: session.currentVersion,
          commandId: "another-create-command",
        }),
    ).toMatchObject({ ok: true, created: false });
    expect(useAuctionConfigurationStore.getState().proposals).toHaveLength(1);
  });

  it("rejects missing, fixture-only, and stale Session inputs", () => {
    expect(
      useAuctionConfigurationStore.getState().createConfigurationDraft({
        sessionId: "missing-session",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        commandId: "missing-session-config",
      }),
    ).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
    expect(
      useAuctionConfigurationStore.getState().createConfigurationDraft({
        sessionId: "royal-oak-15500st-draft",
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        commandId: "fixture-session-config",
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SESSION_STATE" });
    const session = createDirectSession();
    expect(
      useAuctionConfigurationStore.getState().createConfigurationDraft({
        sessionId: session.sessionId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 99,
        commandId: "stale-session-config",
      }),
    ).toMatchObject({ ok: false, code: "STALE_SESSION_VERSION" });
  });

  it("persists incomplete Drafts, increments versions, and strips unsupported fields", () => {
    const session = createDirectSession();
    const proposal = createProposal(session);
    const values = {
      ...readyRules,
      startingPrice: null,
      unsupportedReservePrice: 123,
    } as AuctionConfigurationRules & { unsupportedReservePrice: number };
    const saved = saveProposal(proposal, values);
    expect(saved.proposalVersion).toBe(2);
    expect(saved.rules.startingPrice).toBeNull();
    expect(saved.rules).not.toHaveProperty("unsupportedReservePrice");
    expect(saved.versions).toHaveLength(2);
    expect(saved.history.at(-1)?.action).toBe(
      "CONFIGURATION_DRAFT_SAVED",
    );
  });

  it("rejects invalid numeric Draft values and stale proposal saves without mutation", () => {
    const session = createDirectSession();
    const proposal = createProposal(session);
    expect(
      useAuctionConfigurationStore.getState().saveConfigurationDraft({
        configurationId: proposal.configurationId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedProposalVersion: proposal.proposalVersion,
        commandId: "invalid-number-save",
        values: { ...readyRules, startingPrice: Number.POSITIVE_INFINITY },
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(
      useAuctionConfigurationStore.getState().saveConfigurationDraft({
        configurationId: proposal.configurationId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedProposalVersion: 99,
        commandId: "stale-proposal-save",
        values: readyRules,
      }),
    ).toMatchObject({ ok: false, code: "STALE_PROPOSAL_VERSION" });
    expect(
      useAuctionConfigurationStore.getState().getProposalById(
        proposal.configurationId,
      )?.proposalVersion,
    ).toBe(1);
  });

  it.each([
    ["startingPrice", null],
    ["minimumIncrement", null],
    ["depositPolicyReference", ""],
    ["eligibilityPolicyReference", ""],
    ["extensionPolicyReference", ""],
    ["fallbackPolicyReference", ""],
  ] as const)("blocks submit when %s is missing", (field, value) => {
    const session = createLinkedSession();
    const proposal = createProposal(session, `missing-${field}-create`);
    const saved = saveProposal(
      proposal,
      { ...readyRules, [field]: value },
      `missing-${field}-save`,
    );
    expect(
      submitProposal(saved, session, `missing-${field}-submit`),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("submits valid rules, enforces Session/proposal versions, and makes submission read-only", () => {
    const session = createLinkedSession();
    const saved = saveProposal(createProposal(session));
    expect(
      submitProposal(
        { ...saved, proposalVersion: 99 },
        session,
        "stale-submit-proposal",
      ),
    ).toMatchObject({ ok: false, code: "STALE_PROPOSAL_VERSION" });
    expect(
      useAuctionConfigurationStore.getState().submitConfigurationProposal({
        configurationId: saved.configurationId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedProposalVersion: saved.proposalVersion,
        expectedSessionVersion: 99,
        commandId: "stale-submit-session",
      }),
    ).toMatchObject({ ok: false, code: "STALE_SESSION_VERSION" });
    const submitted = submitProposal(saved, session, "valid-submit");
    expect(submitted).toMatchObject({
      ok: true,
      proposal: { status: "SUBMITTED", proposalVersion: 4 },
    });
    if (!submitted.ok) return;
    expect(
      useAuctionConfigurationStore.getState().saveConfigurationDraft({
        configurationId: saved.configurationId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedProposalVersion: submitted.proposal.proposalVersion,
        commandId: "submitted-edit",
        values: readyRules,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
  });

  it("requires ADMIN, reason, and affected sections for correction", () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(createProposal(session)),
      session,
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const base = {
      configurationId: submitted.proposal.configurationId,
      actorId: adminActorId,
      actorRole: "ADMIN" as const,
      expectedProposalVersion: submitted.proposal.proposalVersion,
      commandId: "correction-command",
      reason: "Rules require a documented correction.",
      affectedSections: ["RULES"] as ConfigurationSection[],
    };
    expect(
      useAuctionConfigurationStore
        .getState()
        .requestConfigurationCorrection({
          ...base,
          actorRole: "CONTENT_STAFF",
        }),
    ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    expect(
      useAuctionConfigurationStore
        .getState()
        .requestConfigurationCorrection({
          ...base,
          commandId: "missing-reason",
          reason: "",
        }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(
      useAuctionConfigurationStore
        .getState()
        .requestConfigurationCorrection({
          ...base,
          commandId: "missing-section",
          affectedSections: [],
        }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    const corrected = useAuctionConfigurationStore
      .getState()
      .requestConfigurationCorrection({
        ...base,
        affectedSections: [...base.affectedSections],
      });
    expect(corrected).toMatchObject({
      ok: true,
      proposal: {
        status: "RETURNED_FOR_CORRECTION",
        proposalVersion: 5,
        correctionContext: {
          reason: base.reason,
          affectedSections: ["RULES"],
        },
      },
    });
  });

  it("allows returned correction save/resubmit and preserves every version/history entry", () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(createProposal(session)),
      session,
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const returned = useAuctionConfigurationStore
      .getState()
      .requestConfigurationCorrection({
        configurationId: submitted.proposal.configurationId,
        actorId: adminActorId,
        actorRole: "ADMIN",
        expectedProposalVersion: submitted.proposal.proposalVersion,
        commandId: "return-for-correction",
        reason: "Minimum increment needs another review.",
        affectedSections: ["RULES"],
      });
    if (!returned.ok) throw new Error(returned.message);
    const corrected = saveProposal(
      returned.proposal,
      { ...readyRules, minimumIncrement: 30_000_000 },
      "save-corrected-rules",
    );
    const resubmitted = submitProposal(
      corrected,
      session,
      "resubmit-corrected-rules",
    );
    expect(resubmitted).toMatchObject({
      ok: true,
      proposal: {
        status: "SUBMITTED",
        proposalVersion: 7,
        rules: { minimumIncrement: 30_000_000 },
      },
    });
    if (!resubmitted.ok) return;
    expect(resubmitted.proposal.versions.map((item) => item.proposalVersion))
      .toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(resubmitted.proposal.history.at(-1)?.action).toBe(
      "CONFIGURATION_RESUBMITTED",
    );
  });

  it("allows only ADMIN to confirm a source-valid prototype resolution", () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(createProposal(session)),
      session,
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const command = {
      configurationId: submitted.proposal.configurationId,
      actorId: adminActorId,
      actorRole: "ADMIN" as const,
      expectedProposalVersion: submitted.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "confirm-with-policy-blocker",
    };
    for (const actorRole of [
      "CONTENT_STAFF",
      "CUSTOMER",
      "CUSTOMER_SUPPORT",
      "FINANCE",
    ] as const)
      expect(
        useAuctionConfigurationStore
          .getState()
          .confirmConfigurationProposal({
            ...command,
            actorRole,
          }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    const confirmed = useAuctionConfigurationStore
      .getState()
      .confirmConfigurationProposal(command);
    expect(
      confirmed,
    ).toMatchObject({
      ok: true,
      created: true,
      proposal: { status: "CONFIRMED" },
      snapshot: {
        policyDecisionReference: {
          decisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE",
          decisionVersion: 2,
        },
      },
    });
    expect(useAuctionConfigurationStore.getState().snapshots).toHaveLength(1);
    expect(
      useAuctionConfigurationStore.getState().getProposalById(
        submitted.proposal.configurationId,
      ),
    ).toMatchObject({ status: "CONFIRMED" });
    expect(session).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(session).not.toHaveProperty("approvalPackageId");
    expect(session).not.toHaveProperty("schedule");
    expect(session).not.toHaveProperty("publicationAt");
  });

  it("rejects stale confirmation and duplicate command identity without side effects", () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(createProposal(session)),
      session,
      "shared-submit-command",
    );
    if (!submitted.ok) throw new Error(submitted.message);
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal({
          configurationId: submitted.proposal.configurationId,
          actorId: adminActorId,
          actorRole: "ADMIN",
          expectedProposalVersion: 99,
          expectedSessionVersion: session.currentVersion,
          commandId: "stale-confirm-proposal",
        }),
    ).toMatchObject({ ok: false, code: "STALE_PROPOSAL_VERSION" });
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal({
          configurationId: submitted.proposal.configurationId,
          actorId: adminActorId,
          actorRole: "ADMIN",
          expectedProposalVersion: submitted.proposal.proposalVersion,
          expectedSessionVersion: 99,
          commandId: "stale-confirm-session",
        }),
    ).toMatchObject({ ok: false, code: "STALE_SESSION_VERSION" });
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal({
          configurationId: submitted.proposal.configurationId,
          actorId: adminActorId,
          actorRole: "ADMIN",
          expectedProposalVersion: submitted.proposal.proposalVersion,
          expectedSessionVersion: session.currentVersion,
          commandId: "shared-submit-command",
        }),
    ).toMatchObject({ ok: false, code: "DUPLICATE_COMMAND" });
    expect(useAuctionConfigurationStore.getState().snapshots).toHaveLength(0);
  });

  it("keeps Customer-requested and SGDG-managed proposals and lineage distinct", () => {
    const linked = createLinkedSession();
    const direct = createDirectSession();
    const linkedProposal = saveProposal(
      createProposal(linked, "create-linked-config"),
      readyRules,
      "save-linked-config",
    );
    const directProposal = saveProposal(
      createProposal(direct, "create-direct-config"),
      { ...readyRules, startingPrice: 3_100_000_000 },
      "save-direct-config",
    );
    expect(linkedProposal).toMatchObject({
      creationSource: "OPENING_REQUEST",
      managementMode: "CUSTOMER_REQUESTED",
      sessionId: linked.sessionId,
    });
    expect(directProposal).toMatchObject({
      creationSource: "DIRECT_SGDG",
      managementMode: "SGDG_MANAGED",
      sessionId: direct.sessionId,
    });
    expect(linked).toHaveProperty("openingRequestId");
    expect(linked).not.toHaveProperty("assetReadinessReferenceId");
    expect(direct).toHaveProperty("assetReadinessReferenceId");
    expect(direct).not.toHaveProperty("openingRequestId");
    const linkedSubmitted = submitProposal(
      linkedProposal,
      linked,
      "submit-linked-cross-branch",
    );
    const directSubmitted = submitProposal(
      directProposal,
      direct,
      "submit-direct-cross-branch",
    );
    expect(linkedSubmitted).toMatchObject({ ok: true });
    expect(directSubmitted).toMatchObject({
      ok: false,
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .getSubmittedProposals()
        .map((item) => item.sessionId),
    ).toEqual([linked.sessionId]);
  });

  it("executes the Customer-requested correction/resubmit chain and retains Opening Request lineage at the policy block", () => {
    const session = createLinkedSession();
    const firstSubmit = submitProposal(
      saveProposal(
        createProposal(session, "customer-chain-create"),
        readyRules,
        "customer-chain-save",
      ),
      session,
      "customer-chain-submit",
    );
    if (!firstSubmit.ok) throw new Error(firstSubmit.message);
    const returned = useAuctionConfigurationStore
      .getState()
      .requestConfigurationCorrection({
        configurationId: firstSubmit.proposal.configurationId,
        actorId: adminActorId,
        actorRole: "ADMIN",
        expectedProposalVersion: firstSubmit.proposal.proposalVersion,
        commandId: "customer-chain-correction",
        reason: "Minimum increment requires Customer-requested chain evidence.",
        affectedSections: ["RULES"],
      });
    if (!returned.ok) throw new Error(returned.message);
    const corrected = saveProposal(
      returned.proposal,
      { ...readyRules, minimumIncrement: 35_000_000 },
      "customer-chain-corrected-save",
    );
    const resubmitted = submitProposal(
      corrected,
      session,
      "customer-chain-resubmit",
    );
    if (!resubmitted.ok) throw new Error(resubmitted.message);
    expect(resubmitted.proposal).toMatchObject({
      proposalVersion: 7,
      status: "SUBMITTED",
      creationSource: "OPENING_REQUEST",
      managementMode: "CUSTOMER_REQUESTED",
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal({
          configurationId: resubmitted.proposal.configurationId,
          actorId: adminActorId,
          actorRole: "ADMIN",
          expectedProposalVersion: resubmitted.proposal.proposalVersion,
          expectedSessionVersion: session.currentVersion,
          commandId: "customer-chain-confirm",
        }),
    ).toMatchObject({ ok: true, created: true });
    expect(session).toHaveProperty("openingRequestId");
    expect(session).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(useAuctionConfigurationStore.getState().snapshots).toHaveLength(1);
  });

  it("blocks Customer submission when the persisted Membership reference becomes stale", () => {
    const session = createLinkedSession();
    const applied = applyPolicyResolution(
      saveProposal(
        createProposal(session, "stale-member-submit-create"),
        readyRules,
        "stale-member-submit-save",
      ),
      session,
      "stale-member-submit-apply",
    );
    if (!applied.ok) throw new Error(applied.message);
    useAuctionConfigurationStore.setState((state) => ({
      proposals: state.proposals.map((proposal) =>
        proposal.configurationId === applied.proposal.configurationId &&
        proposal.memberTitleReference
          ? {
              ...proposal,
              memberTitleReference: {
                ...proposal.memberTitleReference,
                referenceVersion: "MEMBERSHIP-STALE",
              },
            }
          : proposal,
      ),
    }));
    expect(
      useAuctionConfigurationStore
        .getState()
        .submitConfigurationProposal({
          configurationId: applied.proposal.configurationId,
          actorId: CONTENT_STAFF_ACTOR_ID,
          actorRole: "CONTENT_STAFF",
          expectedProposalVersion: applied.proposal.proposalVersion,
          expectedSessionVersion: session.currentVersion,
          commandId: "stale-member-submit",
        }),
    ).toMatchObject({ ok: false, code: "POLICY_RESOLUTION_STALE" });
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(applied.proposal.configurationId),
    ).toMatchObject({ status: "DRAFT" });
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
  });

  it("blocks Customer confirmation when Membership evidence changes after submission", () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(
        createProposal(session, "stale-member-confirm-create"),
        readyRules,
        "stale-member-confirm-save",
      ),
      session,
      "stale-member-confirm-submit",
    );
    if (!submitted.ok) throw new Error(submitted.message);
    useAuctionConfigurationStore.setState((state) => ({
      proposals: state.proposals.map((proposal) =>
        proposal.configurationId === submitted.proposal.configurationId &&
        proposal.memberTitleReference
          ? {
              ...proposal,
              memberTitleReference: {
                ...proposal.memberTitleReference,
                referenceVersion: "MEMBERSHIP-STALE",
              },
            }
          : proposal,
      ),
    }));
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal({
          configurationId: submitted.proposal.configurationId,
          actorId: adminActorId,
          actorRole: "ADMIN",
          expectedProposalVersion: submitted.proposal.proposalVersion,
          expectedSessionVersion: session.currentVersion,
          commandId: "stale-member-confirm",
        }),
    ).toMatchObject({ ok: false, code: "BLOCKING_CONDITION" });
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(submitted.proposal.configurationId)
        ?.history.some((entry) => entry.action === "CONFIGURATION_CONFIRMED"),
    ).toBe(false);
  });

  it("validates the six supported Configuration rule fields without legacy dynamic evidence", () => {
    const result = validateConfiguration(readyRules);
    expect(result.validForSubmission).toBe(true);
    expect(result.validForConfirmation).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("preserves valid proposals across rehydration and resets deterministically", async () => {
    const session = createDirectSession();
    const saved = saveProposal(createProposal(session));
    const persisted = localStorage.getItem("sgdg-auction-configurations-v1");
    expect(persisted).not.toBeNull();
    useAuctionConfigurationStore
      .getState()
      .resetDeterministicConfigurationState();
    localStorage.setItem("sgdg-auction-configurations-v1", persisted!);
    await useAuctionConfigurationStore.persist.rehydrate();
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalBySessionId(session.sessionId),
    ).toMatchObject({
      configurationId: saved.configurationId,
      proposalVersion: 2,
      rules: readyRules,
    });
    useAuctionConfigurationStore
      .getState()
      .resetDeterministicConfigurationState();
    expect(useAuctionConfigurationStore.getState().proposals).toEqual([]);
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
  });

  it("fails safe for malformed proposal, orphan snapshot, duplicate command, and later-phase fields", async () => {
    const session = createDirectSession();
    const proposal = saveProposal(createProposal(session));
    const malformedStates = [
      {
        proposals: [{ ...proposal, status: "PUBLISHED" }],
        snapshots: [],
      },
      {
        proposals: [proposal],
        snapshots: [
          {
            snapshotId: "orphan",
            configurationId: proposal.configurationId,
            sessionId: "another-session",
          },
        ],
      },
      {
        proposals: [
          {
            ...proposal,
            history: [
              ...proposal.history,
              {
                ...proposal.history[0],
                historyId: "duplicate-command-history",
              },
            ],
          },
        ],
        snapshots: [],
      },
      {
        proposals: [{ ...proposal, approvalPackageId: "APR-UNSAFE" }],
        snapshots: [],
      },
      {
        proposals: [
          {
            ...proposal,
            room: {
              sourceStatus: "NOT_APPLICABLE",
            },
          },
        ],
        snapshots: [],
      },
      {
        proposals: [
          {
            ...proposal,
            valueTier: {
              sourceStatus: "SOURCE_SUPPORTED",
              reference: "FAKE",
            },
          },
        ],
        snapshots: [],
      },
    ];
    for (const state of malformedStates) {
      localStorage.setItem(
        "sgdg-auction-configurations-v1",
        JSON.stringify({
          state: { ...state, legacySnapshots: [] },
          version: 4,
        }),
      );
      await useAuctionConfigurationStore.persist.rehydrate();
      expect(useAuctionConfigurationStore.getState().proposals).toEqual([]);
      expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
    }
  });

  it("authorizes, versions, derives, and idempotently applies the prototype policy", () => {
    const session = createDirectSession("policy-command-session");
    const saved = saveProposal(
      createProposal(session, "policy-command-create"),
      { ...readyRules, startingPrice: 5_000_000_000 },
      "policy-command-save",
    );
    for (const actorRole of [
      "ADMIN",
      "CUSTOMER",
      "FINANCE",
      "CUSTOMER_SUPPORT",
    ] as const)
      expect(
        useAuctionConfigurationStore
          .getState()
          .applyAuctionRoomMemberFeeResolution({
            configurationId: saved.configurationId,
            actorId: `blocked-${actorRole}`,
            actorRole,
            expectedProposalVersion: saved.proposalVersion,
            expectedSessionVersion: session.currentVersion,
            expectedPolicyVersion: 2,
            commandId: `blocked-policy-${actorRole}`,
          }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });

    expect(
      useAuctionConfigurationStore
        .getState()
        .applyAuctionRoomMemberFeeResolution({
          configurationId: saved.configurationId,
          actorId: CONTENT_STAFF_ACTOR_ID,
          actorRole: "CONTENT_STAFF",
          expectedProposalVersion: 99,
          expectedSessionVersion: session.currentVersion,
          expectedPolicyVersion: 2,
          commandId: "stale-policy-proposal",
        }),
    ).toMatchObject({ ok: false, code: "STALE_PROPOSAL_VERSION" });
    expect(
      useAuctionConfigurationStore
        .getState()
        .applyAuctionRoomMemberFeeResolution({
          configurationId: saved.configurationId,
          actorId: CONTENT_STAFF_ACTOR_ID,
          actorRole: "CONTENT_STAFF",
          expectedProposalVersion: saved.proposalVersion,
          expectedSessionVersion: session.currentVersion,
          expectedPolicyVersion: 99,
          commandId: "stale-policy-version",
        }),
    ).toMatchObject({ ok: false, code: "STALE_POLICY_VERSION" });

    const applied = applyPolicyResolution(
      saved,
      session,
      "apply-high-policy",
    );
    expect(applied).toMatchObject({
      ok: true,
      created: true,
      proposal: {
        proposalVersion: 3,
        roomResolutionState: "APPLIED",
        listingFeeResolutionState: "BUSINESS_DECISION_REQUIRED",
        overallConfigurationResolutionState: "BUSINESS_DECISION_REQUIRED",
        policyDecisionReference: {
          decisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE",
          decisionVersion: 2,
        },
        priceBandResolution: {
          reference: "PRICE-BAND-ROOM-3",
          evaluatedStartingPrice: 5_000_000_000,
        },
        roomResolution: { roomReference: "ROOM-3" },
        listingFeeResolution: {
          applicability: "BUSINESS_DECISION_REQUIRED",
        },
      },
    });
    expect(
      applyPolicyResolution(saved, session, "apply-high-policy"),
    ).toMatchObject({ ok: true, created: false, proposal: { proposalVersion: 3 } });
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(saved.configurationId)?.history.filter(
          (entry) =>
            entry.action === "AUCTION_ROOM_RESOLVED_FEE_DECISION_REQUIRED",
        ),
    ).toHaveLength(1);
  });

  it("blocks SGDG-managed submission idempotently and never creates a current Snapshot", () => {
    const session = createDirectSession("sgdg-blocked-session");
    const saved = saveProposal(
      createProposal(session, "sgdg-blocked-create"),
      readyRules,
      "sgdg-blocked-save",
    );
    const applied = applyPolicyResolution(
      saved,
      session,
      "sgdg-blocked-apply",
    );
    if (!applied.ok) throw new Error(applied.message);
    const command = {
      configurationId: applied.proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: "CONTENT_STAFF" as const,
      expectedProposalVersion: applied.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "sgdg-blocked-submit",
    };
    expect(
      useAuctionConfigurationStore
        .getState()
        .submitConfigurationProposal(command),
    ).toMatchObject({
      ok: false,
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .submitConfigurationProposal(command),
    ).toMatchObject({
      ok: false,
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    });
    const persisted = useAuctionConfigurationStore
      .getState()
      .getProposalById(applied.proposal.configurationId);
    expect(persisted).toMatchObject({
      status: "DRAFT",
      roomResolutionState: "APPLIED",
      listingFeeResolutionState: "BUSINESS_DECISION_REQUIRED",
      overallConfigurationResolutionState: "BUSINESS_DECISION_REQUIRED",
    });
    expect(
      persisted?.history.filter(
        (entry) => entry.action === "CONFIGURATION_SUBMISSION_BLOCKED",
      ),
    ).toHaveLength(1);
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
  });

  it("rejects a schema-v4 SGDG CONFIRMED aggregate with an unresolved Listing Fee", async () => {
    const session = createDirectSession("schema-v4-forged-sgdg-session");
    const applied = applyPolicyResolution(
      saveProposal(
        createProposal(session, "schema-v4-forged-sgdg-create"),
        readyRules,
        "schema-v4-forged-sgdg-save",
      ),
      session,
      "schema-v4-forged-sgdg-apply",
    );
    if (!applied.ok) throw new Error(applied.message);
    const forgedConfirmed = {
      ...structuredClone(applied.proposal),
      status: "CONFIRMED",
      confirmedBy: adminActorId,
      confirmedAt: "2026-07-26T09:04:00.000Z",
    };
    const forgedSnapshot = {
      snapshotId: `${applied.proposal.configurationId}-snapshot-v${applied.proposal.proposalVersion}`,
      configurationId: applied.proposal.configurationId,
      sessionId: applied.proposal.sessionId,
      sessionVersionAtConfirmation: applied.proposal.sessionVersion,
      proposalVersion: applied.proposal.proposalVersion,
      creationSource: applied.proposal.creationSource,
      managementMode: applied.proposal.managementMode,
      rules: applied.proposal.rules,
      policyDecisionReference: applied.proposal.policyDecisionReference,
      priceBandResolution: applied.proposal.priceBandResolution,
      roomResolution: applied.proposal.roomResolution,
      listingFeeResolution: applied.proposal.listingFeeResolution,
      specialRoomContext: applied.proposal.specialRoomContext,
      confirmedBy: adminActorId,
      confirmedAt: "2026-07-26T09:04:00.000Z",
      confirmationCommandReference: "schema-v4-forged-sgdg-confirm",
      snapshotVersion: 1,
    };
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: {
          proposals: [forgedConfirmed],
          snapshots: [forgedSnapshot],
          legacySnapshots: [],
        },
        version: 4,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    expect(useAuctionConfigurationStore.getState().proposals).toEqual([]);
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
  });

  it("blocks migrated schema-v3 SGDG submission confirmation and retains old confirmation only as legacy evidence", async () => {
    const session = createDirectSession("schema-v3-sgdg-session");
    const applied = applyPolicyResolution(
      saveProposal(
        createProposal(session, "schema-v3-sgdg-create"),
        readyRules,
        "schema-v3-sgdg-save",
      ),
      session,
      "schema-v3-sgdg-apply",
    );
    if (!applied.ok) throw new Error(applied.message);
    const submittedAt = "2026-07-26T09:04:00.000Z";
    const schemaV3Applied = structuredClone(applied.proposal);
    Reflect.deleteProperty(schemaV3Applied, "roomResolutionState");
    Reflect.deleteProperty(schemaV3Applied, "listingFeeResolutionState");
    Reflect.deleteProperty(
      schemaV3Applied,
      "overallConfigurationResolutionState",
    );
    const schemaV3Submitted = {
      ...schemaV3Applied,
      proposalVersion: 4,
      status: "SUBMITTED" as const,
      policyResolutionState: "APPLIED",
      submittedBy: CONTENT_STAFF_ACTOR_ID,
      submittedAt,
      updatedAt: submittedAt,
      versions: [
        ...schemaV3Applied.versions,
        {
          proposalVersion: 4,
          status: "SUBMITTED" as const,
          rules: readyRules,
          recordedAt: submittedAt,
          recordedBy: CONTENT_STAFF_ACTOR_ID,
          commandId: "schema-v3-sgdg-submit",
        },
      ],
      history: [
        ...schemaV3Applied.history,
        {
          historyId: `${schemaV3Applied.configurationId}-history-4-configuration-submitted`,
          configurationId: schemaV3Applied.configurationId,
          sessionId: schemaV3Applied.sessionId,
          proposalVersion: 4,
          action: "CONFIGURATION_SUBMITTED" as const,
          fromStatus: "DRAFT" as const,
          toStatus: "SUBMITTED" as const,
          actorId: CONTENT_STAFF_ACTOR_ID,
          actorRole: "CONTENT_STAFF" as const,
          commandId: "schema-v3-sgdg-submit",
          occurredAt: submittedAt,
          visibility: "STAFF_ONLY" as const,
        },
      ],
    };
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: {
          proposals: [schemaV3Submitted],
          snapshots: [],
          legacySnapshots: [],
        },
        version: 3,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    const migratedSubmitted = useAuctionConfigurationStore
      .getState()
      .getProposalById(schemaV3Submitted.configurationId);
    expect(migratedSubmitted).toMatchObject({
      status: "SUBMITTED",
      roomResolutionState: "APPLIED",
      listingFeeResolutionState: "BUSINESS_DECISION_REQUIRED",
      overallConfigurationResolutionState: "BUSINESS_DECISION_REQUIRED",
    });
    if (!migratedSubmitted)
      throw new Error("Expected migrated schema-v3 SGDG Proposal.");
    const blockedConfirmationCommand = {
      configurationId: migratedSubmitted.configurationId,
      actorId: adminActorId,
      actorRole: "ADMIN" as const,
      expectedProposalVersion: migratedSubmitted.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "schema-v3-sgdg-confirm-blocked",
    };
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal(blockedConfirmationCommand),
    ).toMatchObject({
      ok: false,
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal(blockedConfirmationCommand),
    ).toMatchObject({
      ok: false,
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    });
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(schemaV3Submitted.configurationId)
        ?.history.some(
          (entry) => entry.action === "CONFIGURATION_CONFIRMED",
        ),
    ).toBe(false);
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(schemaV3Submitted.configurationId)
        ?.history.filter(
          (entry) => entry.action === "CONFIGURATION_CONFIRMATION_BLOCKED",
        ),
    ).toHaveLength(1);

    const confirmedAt = "2026-07-26T09:05:00.000Z";
    const schemaV3Confirmed = {
      ...schemaV3Submitted,
      proposalVersion: 5,
      status: "CONFIRMED" as const,
      confirmedBy: adminActorId,
      confirmedAt,
      updatedAt: confirmedAt,
      versions: [
        ...schemaV3Submitted.versions,
        {
          proposalVersion: 5,
          status: "CONFIRMED" as const,
          rules: readyRules,
          recordedAt: confirmedAt,
          recordedBy: adminActorId,
          commandId: "schema-v3-sgdg-confirm",
        },
      ],
      history: [
        ...schemaV3Submitted.history,
        {
          historyId: `${schemaV3Submitted.configurationId}-history-5-configuration-confirmed`,
          configurationId: schemaV3Submitted.configurationId,
          sessionId: schemaV3Submitted.sessionId,
          proposalVersion: 5,
          action: "CONFIGURATION_CONFIRMED" as const,
          fromStatus: "SUBMITTED" as const,
          toStatus: "CONFIRMED" as const,
          actorId: adminActorId,
          actorRole: "ADMIN" as const,
          commandId: "schema-v3-sgdg-confirm",
          occurredAt: confirmedAt,
          visibility: "STAFF_ONLY" as const,
        },
      ],
    };
    const schemaV3Snapshot = {
      snapshotId: `${schemaV3Confirmed.configurationId}-snapshot-v5`,
      configurationId: schemaV3Confirmed.configurationId,
      sessionId: schemaV3Confirmed.sessionId,
      sessionVersionAtConfirmation: schemaV3Confirmed.sessionVersion,
      proposalVersion: 5,
      creationSource: "DIRECT_SGDG",
      managementMode: "SGDG_MANAGED",
      rules: readyRules,
      policyDecisionReference: schemaV3Confirmed.policyDecisionReference,
      priceBandResolution: schemaV3Confirmed.priceBandResolution,
      roomResolution: schemaV3Confirmed.roomResolution,
      listingFeeResolution: schemaV3Confirmed.listingFeeResolution,
      specialRooms: schemaV3Confirmed.specialRoomContext,
      confirmedBy: adminActorId,
      confirmedAt,
      confirmationCommandReference: "schema-v3-sgdg-confirm",
      snapshotVersion: 1,
    };
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: {
          proposals: [schemaV3Confirmed],
          snapshots: [schemaV3Snapshot],
          legacySnapshots: [],
        },
        version: 3,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    const migratedLegacy = useAuctionConfigurationStore.getState();
    expect(migratedLegacy.snapshots).toEqual([]);
    expect(migratedLegacy.proposals[0]).toMatchObject({
      status: "CONFIRMED",
      legacyPolicyState: "LEGACY_SGDG_FEE_UNRESOLVED",
      overallConfigurationResolutionState: "STALE",
    });
    expect(migratedLegacy.legacySnapshots).toHaveLength(1);
    expect(migratedLegacy.legacySnapshots[0]).toMatchObject({
      snapshotId: schemaV3Snapshot.snapshotId,
      proposalVersion: 5,
      policyClassification: "LEGACY_SGDG_FEE_UNRESOLVED",
      originalConfirmedBy: adminActorId,
      originalConfirmedAt: confirmedAt,
      legacyEvidence: {
        roomResolution: schemaV3Snapshot.roomResolution,
        listingFeeResolution: {
          applicability: "BUSINESS_DECISION_REQUIRED",
        },
      },
    });
  });

  it("invalidates policy evidence when Starting Price changes and blocks submission", () => {
    const session = createLinkedSession();
    const saved = saveProposal(
      createProposal(session, "stale-resolution-create"),
      readyRules,
      "stale-resolution-save",
    );
    const applied = applyPolicyResolution(saved, session, "stale-resolution-apply");
    if (!applied.ok) throw new Error(applied.message);
    const changed = saveProposal(
      applied.proposal,
      { ...readyRules, startingPrice: 5_000_000_000 },
      "stale-resolution-price-change",
    );
    expect(changed).toMatchObject({
      roomResolutionState: "STALE",
      listingFeeResolutionState: "STALE",
      overallConfigurationResolutionState: "STALE",
    });
    expect(changed.priceBandResolution).toBeUndefined();
    expect(changed.roomResolution).toBeUndefined();
    expect(changed.listingFeeResolution).toBeUndefined();
    expect(
      useAuctionConfigurationStore.getState().submitConfigurationProposal({
        configurationId: changed.configurationId,
        actorId: CONTENT_STAFF_ACTOR_ID,
        actorRole: "CONTENT_STAFF",
        expectedProposalVersion: changed.proposalVersion,
        expectedSessionVersion: session.currentVersion,
        commandId: "submit-stale-resolution",
      }),
    ).toMatchObject({ ok: false, code: "POLICY_RESOLUTION_STALE" });
  });

  it("creates one deeply immutable Snapshot and enforces confirmation idempotency", () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(
        createProposal(session, "snapshot-create"),
        readyRules,
        "snapshot-save",
      ),
      session,
      "snapshot-submit",
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const command = {
      configurationId: submitted.proposal.configurationId,
      actorId: adminActorId,
      actorRole: "ADMIN" as const,
      expectedProposalVersion: submitted.proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: "snapshot-confirm",
    };
    const first = useAuctionConfigurationStore
      .getState()
      .confirmConfigurationProposal(command);
    expect(first).toMatchObject({ ok: true, created: true });
    if (!first.ok || !first.snapshot) return;
    expect(Object.isFrozen(first.snapshot)).toBe(true);
    expect(Object.isFrozen(first.snapshot.rules)).toBe(true);
    expect(Object.isFrozen(first.snapshot.policyDecisionReference)).toBe(true);
    expect(Object.isFrozen(first.snapshot.priceBandResolution)).toBe(true);
    expect(Object.isFrozen(first.snapshot.roomResolution)).toBe(true);
    expect(Object.isFrozen(first.snapshot.listingFeeResolution)).toBe(true);
    expect(
      Object.isFrozen(
        "fee" in first.snapshot.listingFeeResolution
          ? first.snapshot.listingFeeResolution.fee
          : first.snapshot.listingFeeResolution,
      ),
    ).toBe(true);
    expect(Object.isFrozen(first.snapshot.specialRoomContext)).toBe(true);
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal(command),
    ).toMatchObject({
      ok: true,
      created: false,
      snapshot: { snapshotId: first.snapshot.snapshotId },
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .confirmConfigurationProposal({
          ...command,
          commandId: "snapshot-confirm-different",
        }),
    ).toMatchObject({ ok: false, code: "ALREADY_CONFIRMED" });
    expect(useAuctionConfigurationStore.getState().snapshots).toHaveLength(1);
    expect(session).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(session).not.toHaveProperty("approvalPackageId");
  });

  it("migrates a valid schema-v3 Customer confirmation as the current immutable Snapshot", async () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(
        createProposal(session, "schema-v3-customer-create"),
        readyRules,
        "schema-v3-customer-save",
      ),
      session,
      "schema-v3-customer-submit",
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const confirmed = useAuctionConfigurationStore
      .getState()
      .confirmConfigurationProposal({
        configurationId: submitted.proposal.configurationId,
        actorId: adminActorId,
        actorRole: "ADMIN",
        expectedProposalVersion: submitted.proposal.proposalVersion,
        expectedSessionVersion: session.currentVersion,
        commandId: "schema-v3-customer-confirm",
      });
    if (!confirmed.ok || !confirmed.snapshot)
      throw new Error("Expected valid Customer confirmation.");
    const schemaV3Proposal = structuredClone(confirmed.proposal);
    Reflect.deleteProperty(schemaV3Proposal, "roomResolutionState");
    Reflect.deleteProperty(schemaV3Proposal, "listingFeeResolutionState");
    Reflect.deleteProperty(
      schemaV3Proposal,
      "overallConfigurationResolutionState",
    );
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: {
          proposals: [
            {
              ...schemaV3Proposal,
              policyResolutionState: "APPLIED",
            },
          ],
          snapshots: [structuredClone(confirmed.snapshot)],
          legacySnapshots: [],
        },
        version: 3,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    const migrated = useAuctionConfigurationStore.getState();
    expect(migrated.proposals[0]).toMatchObject({
      status: "CONFIRMED",
      managementMode: "CUSTOMER_REQUESTED",
      roomResolutionState: "APPLIED",
      listingFeeResolutionState: "APPLIED",
      overallConfigurationResolutionState: "READY",
    });
    expect(migrated.snapshots).toHaveLength(1);
    expect(migrated.legacySnapshots).toEqual([]);
    expect(migrated.snapshots[0]).toMatchObject({
      snapshotId: confirmed.snapshot.snapshotId,
      memberTitleReference: confirmed.snapshot.memberTitleReference,
      listingFeeResolution: confirmed.snapshot.listingFeeResolution,
      confirmedBy: confirmed.snapshot.confirmedBy,
      confirmedAt: confirmed.snapshot.confirmedAt,
    });
    expect(Object.isFrozen(migrated.snapshots[0])).toBe(true);
    expect(Object.isFrozen(migrated.snapshots[0].listingFeeResolution)).toBe(
      true,
    );
  });

  it("fails closed for forged v2 policy and confirmation persistence", async () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(
        createProposal(session, "security-create"),
        readyRules,
        "security-save",
      ),
      session,
      "security-submit",
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const confirmedResult = useAuctionConfigurationStore
      .getState()
      .confirmConfigurationProposal({
        configurationId: submitted.proposal.configurationId,
        actorId: adminActorId,
        actorRole: "ADMIN",
        expectedProposalVersion: submitted.proposal.proposalVersion,
        expectedSessionVersion: session.currentVersion,
        commandId: "security-confirm",
      });
    if (!confirmedResult.ok || !confirmedResult.snapshot)
      throw new Error("Expected confirmed security fixture.");

    const validProposal = structuredClone(confirmedResult.proposal);
    const validSnapshot = structuredClone(confirmedResult.snapshot);
    const drafts = [
      {
        label: "fake Room",
        mutate: (proposal: AuctionConfigurationProposal) => {
          Object.assign(proposal.roomResolution!, {
            roomReference: "ROOM-1",
          });
        },
      },
      {
        label: "fake price band",
        mutate: (proposal: AuctionConfigurationProposal) => {
          Object.assign(proposal.priceBandResolution!, {
            reference: "PRICE-BAND-ROOM-1",
          });
        },
      },
      {
        label: "forged member fee",
        mutate: (proposal: AuctionConfigurationProposal) => {
          Object.assign(proposal.listingFeeResolution!, {
            applicability: "APPLICABLE",
            memberTitle: "VIP",
            roomReference: "ROOM-3",
            fee: { kind: "MP", sourceLabel: "MP" },
          });
        },
      },
      {
        label: "fake policy ID",
        mutate: (proposal: AuctionConfigurationProposal) => {
          Object.assign(proposal.policyDecisionReference!, {
            decisionId: "SGDG-FAKE",
          });
        },
      },
      {
        label: "stale policy version",
        mutate: (proposal: AuctionConfigurationProposal) => {
          Object.assign(proposal.policyDecisionReference!, {
            decisionVersion: 99,
          });
        },
      },
      {
        label: "forged special room",
        mutate: (proposal: AuctionConfigurationProposal) => {
          Object.assign(proposal.specialRoomContext!, {
            vipRoomStatus: "ROOM-VIP",
          });
        },
      },
    ];

    for (const crafted of drafts) {
      const proposal = structuredClone(validProposal);
      crafted.mutate(proposal);
      localStorage.setItem(
        "sgdg-auction-configurations-v1",
        JSON.stringify({
          state: {
            proposals: [proposal],
            snapshots: [validSnapshot],
            legacySnapshots: [],
          },
          version: 4,
        }),
      );
      await useAuctionConfigurationStore.persist.rehydrate();
      expect(
        useAuctionConfigurationStore.getState().proposals,
        crafted.label,
      ).toEqual([]);
      expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
    }

    for (const craftedSnapshotField of [
      {
        label: "generic Room snapshot field",
        field: "room",
        value: { sourceStatus: "NOT_APPLICABLE" },
      },
      {
        label: "generic valueTier snapshot field",
        field: "valueTier",
        value: {
          sourceStatus: "SOURCE_SUPPORTED",
          reference: "FAKE",
        },
      },
    ]) {
      const craftedSnapshot = structuredClone(validSnapshot);
      Object.assign(craftedSnapshot, {
        [craftedSnapshotField.field]: craftedSnapshotField.value,
      });
      localStorage.setItem(
        "sgdg-auction-configurations-v1",
        JSON.stringify({
          state: {
            proposals: [validProposal],
            snapshots: [craftedSnapshot],
            legacySnapshots: [],
          },
          version: 4,
        }),
      );
      await useAuctionConfigurationStore.persist.rehydrate();
      expect(
        useAuctionConfigurationStore.getState().proposals,
        craftedSnapshotField.label,
      ).toEqual([]);
      expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
    }

    const noSnapshot = structuredClone(validProposal);
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: { proposals: [noSnapshot], snapshots: [], legacySnapshots: [] },
        version: 4,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    expect(useAuctionConfigurationStore.getState().proposals).toEqual([]);

    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: {
          proposals: [],
          snapshots: [validSnapshot],
          legacySnapshots: [],
        },
        version: 4,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);

    const matchingFakeProposal = structuredClone(validProposal);
    const matchingFakeSnapshot = structuredClone(validSnapshot);
    Object.assign(matchingFakeProposal.priceBandResolution!, {
      reference: "PRICE-BAND-ROOM-1",
    });
    Object.assign(matchingFakeProposal.roomResolution!, {
      roomReference: "ROOM-1",
      derivedFromPriceBand: "PRICE-BAND-ROOM-1",
    });
    Object.assign(matchingFakeSnapshot.priceBandResolution, {
      reference: "PRICE-BAND-ROOM-1",
    });
    Object.assign(matchingFakeSnapshot.roomResolution, {
      roomReference: "ROOM-1",
      derivedFromPriceBand: "PRICE-BAND-ROOM-1",
    });
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: {
          proposals: [matchingFakeProposal],
          snapshots: [matchingFakeSnapshot],
        },
        version: 4,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    expect(useAuctionConfigurationStore.getState().proposals).toEqual([]);
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
  });

  it("migrates a v1 blocked submitted Proposal without applying or confirming policy", async () => {
    const session = createDirectSession("v1-migration-session");
    const blocked = saveProposal(
      createProposal(session, "v1-migration-create"),
      readyRules,
      "v1-migration-save",
    );
    const legacySubmitted: AuctionConfigurationProposal = {
      ...blocked,
      proposalVersion: 3,
      status: "SUBMITTED",
      submittedBy: CONTENT_STAFF_ACTOR_ID,
      submittedAt: "2026-07-26T09:03:00.000Z",
      versions: [
        ...blocked.versions,
        {
          proposalVersion: 3,
          status: "SUBMITTED",
          rules: readyRules,
          recordedAt: "2026-07-26T09:03:00.000Z",
          recordedBy: CONTENT_STAFF_ACTOR_ID,
          commandId: "v1-legacy-submit",
        },
      ],
      history: [
        ...blocked.history,
        {
          historyId: `${blocked.configurationId}-history-3-configuration-submitted`,
          configurationId: blocked.configurationId,
          sessionId: blocked.sessionId,
          proposalVersion: 3,
          action: "CONFIGURATION_SUBMITTED",
          fromStatus: "DRAFT",
          toStatus: "SUBMITTED",
          actorId: CONTENT_STAFF_ACTOR_ID,
          actorRole: "CONTENT_STAFF",
          commandId: "v1-legacy-submit",
          occurredAt: "2026-07-26T09:03:00.000Z",
          visibility: "STAFF_ONLY",
        },
      ],
    };
    const persistedLegacy = structuredClone(legacySubmitted) as Partial<
      AuctionConfigurationProposal
    >;
    delete (
      persistedLegacy as Partial<AuctionConfigurationProposal> & {
        policyResolutionState?: string;
      }
    ).policyResolutionState;
    Object.assign(persistedLegacy, {
      room: { sourceStatus: "NOT_APPLICABLE" },
      valueTier: {
        sourceStatus: "SOURCE_SUPPORTED",
        reference: "LEGACY-ONLY",
      },
    });
    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: { proposals: [persistedLegacy], snapshots: [] },
        version: 1,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(blocked.configurationId),
    ).toMatchObject({
      status: "SUBMITTED",
      proposalVersion: 3,
      roomResolutionState: "STALE",
      listingFeeResolutionState: "STALE",
      overallConfigurationResolutionState: "STALE",
    });
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(blocked.configurationId),
    ).not.toHaveProperty("room");
    expect(
      useAuctionConfigurationStore
        .getState()
        .getProposalById(blocked.configurationId),
    ).not.toHaveProperty("valueTier");
    expect(useAuctionConfigurationStore.getState().snapshots).toEqual([]);
  });

  it.each(["DRAFT", "RETURNED_FOR_CORRECTION"] as const)(
    "marks an old-policy %s proposal stale and requires reapplication",
    async (legacyStatus) => {
      const session =
        legacyStatus === "RETURNED_FOR_CORRECTION"
          ? createLinkedSession()
          : createDirectSession(`legacy-${legacyStatus}-session`);
      const applied = applyPolicyResolution(
        saveProposal(
          createProposal(session, `legacy-${legacyStatus}-create`),
          readyRules,
          `legacy-${legacyStatus}-save`,
        ),
        session,
        `legacy-${legacyStatus}-apply`,
      );
      if (!applied.ok) throw new Error(applied.message);
      let legacyProposal = applied.proposal;
      if (legacyStatus === "RETURNED_FOR_CORRECTION") {
        const submitted = submitProposal(
          applied.proposal,
          session,
          `legacy-${legacyStatus}-submit`,
        );
        if (!submitted.ok) throw new Error(submitted.message);
        const returned = useAuctionConfigurationStore
          .getState()
          .requestConfigurationCorrection({
            configurationId: submitted.proposal.configurationId,
            actorId: adminActorId,
            actorRole: "ADMIN",
            expectedProposalVersion: submitted.proposal.proposalVersion,
            commandId: `legacy-${legacyStatus}-return`,
            reason: "Reapply the current source-based policy version.",
            affectedSections: ["ROOM", "MEMBER_FEE"],
          });
        if (!returned.ok) throw new Error(returned.message);
        legacyProposal = returned.proposal;
      }

      localStorage.setItem(
        "sgdg-auction-configurations-v1",
        JSON.stringify({
          state: { proposals: [legacyProposal], snapshots: [] },
          version: 2,
        }),
      );
      await useAuctionConfigurationStore.persist.rehydrate();
      const migrated = useAuctionConfigurationStore
        .getState()
        .getProposalById(legacyProposal.configurationId);
      expect(migrated).toMatchObject({
        status: legacyStatus,
        roomResolutionState: "STALE",
        listingFeeResolutionState: "STALE",
        overallConfigurationResolutionState: "STALE",
      });
      expect(migrated?.policyDecisionReference).toBeUndefined();
      expect(migrated?.priceBandResolution).toBeUndefined();
      expect(migrated?.roomResolution).toBeUndefined();
      expect(migrated?.listingFeeResolution).toBeUndefined();
    },
  );

  it("resolves a customer fee from the read-only membership reference and rejects forged membership/fee evidence", async () => {
    const session = createLinkedSession();
    const saved = saveProposal(
      createProposal(session, "member-fee-create"),
      {
        ...readyRules,
        startingPrice: 4_000_000,
        minimumIncrement: 1_000_000,
      },
      "member-fee-save",
    );
    const applied = applyPolicyResolution(saved, session, "member-fee-apply");
    expect(applied).toMatchObject({
      ok: true,
      proposal: {
        priceBandResolution: { reference: "PRICE-BAND-ROOM-1" },
        roomResolution: { roomReference: "ROOM-1" },
        memberTitleReference: {
          memberId: CURRENT_CUSTOMER_ID,
          title: "VANG",
          referenceVersion: "MEMBERSHIP-MOCK-V1",
          sourceDomain: "MEMBERSHIP_ACCOUNT",
        },
        listingFeeResolution: {
          applicability: "APPLICABLE",
          memberTitle: "VANG",
          roomReference: "ROOM-1",
          fee: { kind: "MP", sourceLabel: "MP/1SP" },
        },
      },
    });
    if (!applied.ok) return;

    const validProposal = structuredClone(applied.proposal);
    const craftedStates = [
      {
        label: "forged member title",
        mutate: (proposal: AuctionConfigurationProposal) =>
          Object.assign(proposal.memberTitleReference!, { title: "VIP" }),
      },
      {
        label: "stale membership version",
        mutate: (proposal: AuctionConfigurationProposal) =>
          Object.assign(proposal.memberTitleReference!, {
            referenceVersion: "MEMBERSHIP-STALE",
          }),
      },
      {
        label: "forged fee amount",
        mutate: (proposal: AuctionConfigurationProposal) =>
          Object.assign(proposal.listingFeeResolution!, {
            fee: {
              kind: "AMOUNT",
              amountVnd: 1,
              unit: "PER_PRODUCT",
            },
          }),
      },
      {
        label: "forged MP conversion",
        mutate: (proposal: AuctionConfigurationProposal) =>
          Object.assign(proposal.listingFeeResolution!, {
            fee: {
              kind: "AMOUNT",
              amountVnd: 0,
              unit: "PER_PRODUCT",
            },
          }),
      },
      {
        label: "forged Event fee",
        mutate: (proposal: AuctionConfigurationProposal) =>
          Object.assign(proposal.listingFeeResolution!, {
            roomReference: "ROOM-EVENT",
            fee: {
              kind: "AMOUNT",
              amountVnd: 30_000,
              unit: "PER_PRODUCT",
            },
          }),
      },
      {
        label: "forged VIP derivation",
        mutate: (proposal: AuctionConfigurationProposal) =>
          Object.assign(proposal.roomResolution!, {
            roomReference: "ROOM-VIP",
          }),
      },
    ];

    for (const crafted of craftedStates) {
      const proposal = structuredClone(validProposal);
      crafted.mutate(proposal);
      localStorage.setItem(
        "sgdg-auction-configurations-v1",
        JSON.stringify({
          state: {
            proposals: [proposal],
            snapshots: [],
            legacySnapshots: [],
          },
          version: 4,
        }),
      );
      await useAuctionConfigurationStore.persist.rehydrate();
      expect(
        useAuctionConfigurationStore.getState().proposals,
        crafted.label,
      ).toEqual([]);
    }
  });

  it("preserves an old confirmed snapshot as immutable legacy evidence without treating it as policy v2", async () => {
    const session = createLinkedSession();
    const submitted = submitProposal(
      saveProposal(
        createProposal(session, "legacy-confirmed-create"),
        readyRules,
        "legacy-confirmed-save",
      ),
      session,
      "legacy-confirmed-submit",
    );
    if (!submitted.ok) throw new Error(submitted.message);
    const confirmed = useAuctionConfigurationStore
      .getState()
      .confirmConfigurationProposal({
        configurationId: submitted.proposal.configurationId,
        actorId: adminActorId,
        actorRole: "ADMIN",
        expectedProposalVersion: submitted.proposal.proposalVersion,
        expectedSessionVersion: session.currentVersion,
        commandId: "legacy-confirmed-confirm",
      });
    if (!confirmed.ok || !confirmed.snapshot)
      throw new Error("Expected confirmed migration fixture.");
    const oldProposal = structuredClone(confirmed.proposal);
    const oldSnapshot = structuredClone(
      confirmed.snapshot,
    ) as unknown as Record<string, unknown>;
    Object.assign(oldProposal.policyDecisionReference!, {
      decisionId: "RVT-PROTOTYPE-2026-01",
      decisionVersion: 1,
    });
    Object.assign(oldSnapshot.policyDecisionReference as object, {
      decisionId: "RVT-PROTOTYPE-2026-01",
      decisionVersion: 1,
    });
    oldSnapshot.legacyRoomReference = "ROOM-ONLINE-PREMIUM";
    oldSnapshot.legacyValueTierReference = "VALUE-TIER-PREMIUM";

    localStorage.setItem(
      "sgdg-auction-configurations-v1",
      JSON.stringify({
        state: { proposals: [oldProposal], snapshots: [oldSnapshot] },
        version: 2,
      }),
    );
    await useAuctionConfigurationStore.persist.rehydrate();
    const migrated = useAuctionConfigurationStore.getState();
    expect(migrated.snapshots).toEqual([]);
    expect(migrated.proposals).toEqual([
      expect.objectContaining({
        configurationId: oldProposal.configurationId,
        status: "CONFIRMED",
        roomResolutionState: "STALE",
        listingFeeResolutionState: "STALE",
        overallConfigurationResolutionState: "STALE",
        legacyPolicyState: "LEGACY_PROTOTYPE_POLICY",
      }),
    ]);
    expect(migrated.proposals[0].policyDecisionReference).toBeUndefined();
    expect(migrated.legacySnapshots).toHaveLength(1);
    expect(migrated.legacySnapshots[0]).toMatchObject({
      snapshotId: oldSnapshot.snapshotId,
      policyClassification: "LEGACY_PROTOTYPE_POLICY",
      legacyEvidence: oldSnapshot,
    });
    expect(Object.isFrozen(migrated.legacySnapshots[0])).toBe(true);
    expect(Object.isFrozen(migrated.legacySnapshots[0].legacyEvidence)).toBe(
      true,
    );
    expect(
      Object.isFrozen(
        migrated.legacySnapshots[0].legacyEvidence.policyDecisionReference,
      ),
    ).toBe(true);
  });

  it("does not mutate legacy rule or Approval Package fixtures", () => {
    const rulesBefore = structuredClone(
      getAuctionRuleFixture("royal-oak-15500st-draft", "draft"),
    );
    const packagesBefore = structuredClone(getApprovalPackages());
    const session = createDirectSession();
    saveProposal(createProposal(session));
    expect(
      getAuctionRuleFixture("royal-oak-15500st-draft", "draft"),
    ).toEqual(rulesBefore);
    expect(getApprovalPackages()).toEqual(packagesBefore);
  });
});

const adminActorId = "admin.configuration@mock.local";
