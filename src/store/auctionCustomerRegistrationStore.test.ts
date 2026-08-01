import { beforeEach, describe, expect, it } from "vitest";
import { setRegistrationReadinessClock } from "../test/registrationReadinessTestHarness";
import {
  prepareOpenRegistrationWindow,
  resetCustomerRegistrationTestState,
} from "../test/customerRegistrationTestHarness";
import {
  CUSTOMER_REGISTRATION_ALREADY_SUBMITTED,
  CUSTOMER_REGISTRATION_BLOCKED_BY_STALE_EVIDENCE,
  CUSTOMER_REGISTRATION_WINDOW_EXPIRED,
  REGISTRATION_WINDOW_EXPIRED_MESSAGE,
  sanitizePersistedAuctionCustomerRegistrationState,
  useAuctionCustomerRegistrationStore,
} from "./auctionCustomerRegistrationStore";
import { useAuctionConfirmedScheduleStore } from "./auctionConfirmedScheduleStore";
import { useAuctionRegistrationWindowStore } from "./auctionRegistrationWindowStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import { CURRENT_CUSTOMER_ID } from "./openingRequestStore";

const createCommand = (
  prepared: ReturnType<typeof prepareOpenRegistrationWindow>,
  overrides: Record<string, unknown> = {},
) => ({
  sessionId: prepared.session.sessionId,
  actorId: CURRENT_CUSTOMER_ID,
  actorRole: "CUSTOMER" as const,
  expectedSessionVersion: prepared.session.currentVersion,
  expectedRegistrationWindowId:
    prepared.registrationWindow.registrationWindowId,
  commandId: "create-customer-registration",
  ...overrides,
});

function createDraft(prepared: ReturnType<typeof prepareOpenRegistrationWindow>) {
  const result = useAuctionCustomerRegistrationStore
    .getState()
    .createRegistrationDraft(createCommand(prepared));
  if (!result.ok) throw new Error(result.message);
  return result.registration;
}

describe("Customer Registration aggregate", () => {
  beforeEach(resetCustomerRegistrationTestState);

  it("creates one eligible CUSTOMER-owned DRAFT at version 1 with exact authority references", () => {
    const prepared = prepareOpenRegistrationWindow();
    const sessionBefore = JSON.stringify(useAuctionSessionStore.getState().sessions);
    const windowBefore = JSON.stringify(
      useAuctionRegistrationWindowStore.getState().registrationWindows,
    );
    const registration = createDraft(prepared);

    expect(registration).toMatchObject({
      registrationId: `customer-registration-${prepared.session.sessionId}-${CURRENT_CUSTOMER_ID}`,
      registrationVersion: 1,
      status: "DRAFT",
      sessionId: prepared.session.sessionId,
      sessionVersionAtCreation: prepared.session.currentVersion,
      customerId: CURRENT_CUSTOMER_ID,
      registrationWindowId: prepared.registrationWindow.registrationWindowId,
      registrationWindowRecordVersion: 1,
      rulesAccepted: false,
    });
    expect(registration).not.toHaveProperty("membership");
    expect(registration).not.toHaveProperty("deposit");
    expect(registration).not.toHaveProperty("eligibility");
    expect(registration).not.toHaveProperty("publication");
    expect(JSON.stringify(useAuctionSessionStore.getState().sessions)).toBe(
      sessionBefore,
    );
    expect(
      JSON.stringify(
        useAuctionRegistrationWindowStore.getState().registrationWindows,
      ),
    ).toBe(windowBefore);
  });

  it.each(["ADMIN", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-CUSTOMER create and submit for %s",
    (actorRole) => {
      const prepared = prepareOpenRegistrationWindow();
      expect(
        useAuctionCustomerRegistrationStore
          .getState()
          .createRegistrationDraft(createCommand(prepared, { actorRole })),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
      const registration = createDraft(prepared);
      expect(
        useAuctionCustomerRegistrationStore.getState().submitRegistration({
          registrationId: registration.registrationId,
          actorId: CURRENT_CUSTOMER_ID,
          actorRole,
          expectedRegistrationVersion: registration.registrationVersion,
          expectedRegistrationWindowId:
            prepared.registrationWindow.registrationWindowId,
          commandId: `submit-as-${actorRole}`,
        }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("enforces ownership and allows only rulesAccepted to change", () => {
    const prepared = prepareOpenRegistrationWindow();
    const registration = createDraft(prepared);
    const otherCustomer = useAuctionCustomerRegistrationStore
      .getState()
      .saveRegistrationDraft({
        registrationId: registration.registrationId,
        actorId: "CUS-OTHER-001",
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 1,
        rulesAccepted: true,
        commandId: "other-customer-save",
      });
    expect(otherCustomer).toMatchObject({
      ok: false,
      code: "REGISTRATION_OWNERSHIP_MISMATCH",
    });
    const unsupported = useAuctionCustomerRegistrationStore
      .getState()
      .saveRegistrationDraft({
        registrationId: registration.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 1,
        rulesAccepted: true,
        commandId: "unsupported-save",
        notes: "not allowed",
      } as unknown as Parameters<
        ReturnType<
          typeof useAuctionCustomerRegistrationStore.getState
        >["saveRegistrationDraft"]
      >[0]);
    expect(unsupported).toMatchObject({ ok: false, code: "UNSUPPORTED_FIELD" });
  });

  it("prevents duplicate Drafts and makes repeated create commands idempotent", () => {
    const prepared = prepareOpenRegistrationWindow();
    const store = useAuctionCustomerRegistrationStore.getState();
    const first = store.createRegistrationDraft(createCommand(prepared));
    const replay = store.createRegistrationDraft(createCommand(prepared));
    expect(first.ok && first.created).toBe(true);
    expect(replay).toMatchObject({ ok: true, created: false, changed: false });
    expect(
      store.createRegistrationDraft(
        createCommand(prepared, { commandId: "different-create-command" }),
      ),
    ).toMatchObject({ ok: false, code: "CUSTOMER_REGISTRATION_ALREADY_EXISTS" });
    expect(useAuctionCustomerRegistrationStore.getState().registrations).toHaveLength(1);
  });

  it("rejects missing and expired Registration Windows when creating", () => {
    const prepared = prepareOpenRegistrationWindow();
    useAuctionRegistrationWindowStore.setState({ registrationWindows: [] });
    expect(
      useAuctionCustomerRegistrationStore
        .getState()
        .createRegistrationDraft(createCommand(prepared)),
    ).toMatchObject({
      ok: false,
      code: "CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN",
    });
    useAuctionRegistrationWindowStore.setState({
      registrationWindows: [prepared.registrationWindow],
    });
    setRegistrationReadinessClock(
      prepared.registrationWindow.window.registrationCloseAt,
    );
    expect(
      useAuctionCustomerRegistrationStore.getState().createRegistrationDraft(
        createCommand(prepared, { commandId: "expired-create" }),
      ),
    ).toMatchObject({
      ok: false,
      code: CUSTOMER_REGISTRATION_WINDOW_EXPIRED,
    });
  });

  it("keeps SGDG-managed workflow blocked by configuration", () => {
    const prepared = prepareOpenRegistrationWindow();
    useAuctionSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.sessionId === prepared.session.sessionId
          ? ({
              ...session,
              recordKind: "DYNAMIC_SGDG_MANAGED_SESSION",
              creationSource: "DIRECT_SGDG",
              managementMode: "SGDG_MANAGED",
            } as never)
          : session,
      ),
    }));
    expect(
      useAuctionCustomerRegistrationStore
        .getState()
        .createRegistrationDraft(createCommand(prepared)),
    ).toMatchObject({
      ok: false,
      code: "DYNAMIC_CUSTOMER_SESSION_REQUIRED",
    });
  });

  it("increments only meaningful saves, leaves no-op saves unchanged, and rejects stale versions", () => {
    const prepared = prepareOpenRegistrationWindow();
    const registration = createDraft(prepared);
    const store = useAuctionCustomerRegistrationStore.getState();
    expect(
      store.saveRegistrationDraft({
        registrationId: registration.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 1,
        rulesAccepted: false,
        commandId: "noop-save",
      }),
    ).toMatchObject({ ok: true, changed: false });
    const saved = store.saveRegistrationDraft({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedRegistrationVersion: 1,
      rulesAccepted: true,
      commandId: "accept-rules",
    });
    expect(saved).toMatchObject({
      ok: true,
      changed: true,
      registration: { registrationVersion: 2, rulesAccepted: true },
    });
    expect(
      useAuctionCustomerRegistrationStore.getState().saveRegistrationDraft({
        registrationId: registration.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 1,
        rulesAccepted: false,
        commandId: "stale-save",
      }),
    ).toMatchObject({ ok: false, code: "STALE_REGISTRATION_VERSION" });
  });

  it("requires accepted rules and creates exactly one immutable Submission Record", () => {
    const prepared = prepareOpenRegistrationWindow();
    const draft = createDraft(prepared);
    const store = useAuctionCustomerRegistrationStore.getState();
    const command = {
      registrationId: draft.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER" as const,
      expectedRegistrationVersion: 1,
      expectedRegistrationWindowId:
        prepared.registrationWindow.registrationWindowId,
      commandId: "submit-registration",
    };
    expect(store.submitRegistration(command)).toMatchObject({
      ok: false,
      code: "RULES_ACCEPTANCE_REQUIRED",
    });
    const saved = store.saveRegistrationDraft({
      registrationId: draft.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedRegistrationVersion: 1,
      rulesAccepted: true,
      commandId: "save-before-submit",
    });
    if (!saved.ok) throw new Error(saved.message);
    const submitted = useAuctionCustomerRegistrationStore
      .getState()
      .submitRegistration({
        ...command,
        expectedRegistrationVersion: 2,
      });
    expect(submitted).toMatchObject({
      ok: true,
      registration: {
        status: "SUBMITTED",
        registrationVersion: 3,
        submissionRecord: {
          recordVersion: 1,
          submittedBy: CURRENT_CUSTOMER_ID,
        },
      },
    });
    if (!submitted.ok) return;
    expect(Object.isFrozen(submitted.registration.submissionRecord)).toBe(true);
    const replay = useAuctionCustomerRegistrationStore
      .getState()
      .submitRegistration({ ...command, expectedRegistrationVersion: 2 });
    expect(replay).toMatchObject({ ok: true, changed: false });
    expect(
      submitted.registration.history.filter(
        (entry) => entry.action === "CUSTOMER_REGISTRATION_SUBMITTED",
      ),
    ).toHaveLength(1);
  });

  it("final-revalidates expiry and current Window evidence without creating a submission", () => {
    const prepared = prepareOpenRegistrationWindow();
    const draft = createDraft(prepared);
    const saved = useAuctionCustomerRegistrationStore
      .getState()
      .saveRegistrationDraft({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 1,
        rulesAccepted: true,
        commandId: "save-for-expiry",
      });
    if (!saved.ok) throw new Error(saved.message);
    setRegistrationReadinessClock(
      prepared.registrationWindow.window.registrationCloseAt,
    );
    const expired = useAuctionCustomerRegistrationStore
      .getState()
      .submitRegistration({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 2,
        expectedRegistrationWindowId:
          prepared.registrationWindow.registrationWindowId,
        commandId: "expired-submit",
      });
    expect(expired).toMatchObject({
      ok: false,
      code: CUSTOMER_REGISTRATION_WINDOW_EXPIRED,
    });
    expect(REGISTRATION_WINDOW_EXPIRED_MESSAGE).toBe(
      "Cửa sổ đăng ký đã hết thời gian.",
    );
    expect(
      useAuctionCustomerRegistrationStore.getState().registrations[0]
        .submissionRecord,
    ).toBeUndefined();

    setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
    useAuctionConfirmedScheduleStore.setState({ confirmedSchedules: [] });
    expect(
      useAuctionCustomerRegistrationStore.getState().submitRegistration({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 2,
        expectedRegistrationWindowId:
          prepared.registrationWindow.registrationWindowId,
        commandId: "stale-evidence-submit",
      }),
    ).toMatchObject({
      ok: false,
      code: CUSTOMER_REGISTRATION_BLOCKED_BY_STALE_EVIDENCE,
    });
  });

  it("does not allow a submitted Registration to be edited or resubmitted", () => {
    const prepared = prepareOpenRegistrationWindow();
    const draft = createDraft(prepared);
    const saved = useAuctionCustomerRegistrationStore
      .getState()
      .saveRegistrationDraft({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 1,
        rulesAccepted: true,
        commandId: "save-final",
      });
    if (!saved.ok) throw new Error(saved.message);
    const submitted = useAuctionCustomerRegistrationStore
      .getState()
      .submitRegistration({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 2,
        expectedRegistrationWindowId:
          prepared.registrationWindow.registrationWindowId,
        commandId: "submit-final",
      });
    if (!submitted.ok) throw new Error(submitted.message);
    expect(
      useAuctionCustomerRegistrationStore.getState().saveRegistrationDraft({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 3,
        rulesAccepted: false,
        commandId: "edit-submitted",
      }),
    ).toMatchObject({ ok: false, code: CUSTOMER_REGISTRATION_ALREADY_SUBMITTED });
    expect(
      useAuctionCustomerRegistrationStore.getState().submitRegistration({
        registrationId: draft.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole: "CUSTOMER",
        expectedRegistrationVersion: 3,
        expectedRegistrationWindowId:
          prepared.registrationWindow.registrationWindowId,
        commandId: "resubmit",
      }),
    ).toMatchObject({ ok: false, code: CUSTOMER_REGISTRATION_ALREADY_SUBMITTED });
  });

  it("fails closed for malformed, duplicate, forbidden, and authority-less persistence", () => {
    const prepared = prepareOpenRegistrationWindow();
    const registration = createDraft(prepared);
    const malformed = [
      { ...registration, status: "APPROVED" },
      { ...registration, registrationVersion: 0 },
      { ...registration, membershipResult: "VERIFIED" },
      { ...registration, submissionRecord: { recordVersion: 1 } },
      {
        ...registration,
        history: registration.history.map((entry, index) =>
          index === 0
            ? { ...entry, action: "CUSTOMER_REGISTRATION_SUBMITTED" }
            : entry,
        ),
      },
    ];
    for (const value of malformed)
      expect(
        sanitizePersistedAuctionCustomerRegistrationState({
          registrations: [value],
        }).registrations,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionCustomerRegistrationState({
        registrations: [registration, registration],
      }).registrations,
    ).toEqual([]);
    useAuctionRegistrationWindowStore.setState({ registrationWindows: [] });
    expect(
      sanitizePersistedAuctionCustomerRegistrationState({
        registrations: [registration],
      }).registrations,
    ).toEqual([]);
  });
});
