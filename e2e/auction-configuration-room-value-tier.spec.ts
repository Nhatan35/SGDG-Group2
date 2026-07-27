import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

const assetId = "AST-OMEGA-SPD-001";
const sessionId = "sgdg-managed-ast-omega-spd-001-s1";
const storageKey = "sgdg-auction-configurations-v1";

async function login(page: Page, account: "content@sgdg.demo") {
  await page.goto("/admin/login");
  await page.getByLabel("Email công việc").fill(account);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function createAppliedDirectConfiguration(page: Page) {
  await page.goto("/ops/auctions/new");
  await page.getByLabel("Tài sản").selectOption(assetId);
  await page
    .getByRole("button", { name: "Kiểm tra trạng thái tài sản" })
    .click();
  await page
    .getByRole("textbox", { name: "Mục đích đấu giá" })
    .fill("Schema-v3 SGDG legacy migration evidence");
  await page
    .getByRole("button", { name: "Tạo bản nháp phiên đấu giá" })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận tạo bản nháp" })
    .click();
  await page.goto(`/ops/auctions/${sessionId}/rules`);
  await page
    .getByRole("button", { name: "Tạo đề xuất cấu hình" })
    .click();
  await page.getByLabel("Giá khởi điểm").fill("2900000000");
  await page.getByLabel("Bước giá tối thiểu").fill("25000000");
  await page
    .getByLabel(/deposit policy reference/i)
    .selectOption("DEP-STD-01");
  await page
    .getByLabel(/eligibility policy reference/i)
    .selectOption("ELG-STD-01");
  await page
    .getByLabel(/extension policy reference/i)
    .selectOption("EXT-02");
  await page
    .getByLabel(/fallback policy reference/i)
    .selectOption("FB-READONLY");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await page
    .getByRole("button", {
      name: "Resolve Auction Room and Member Listing Fee",
    })
    .click();
}

test("schema-v3 SGDG confirmation becomes immutable legacy evidence and never current CONFIRMED projection", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await login(page, "content@sgdg.demo");
  await createAppliedDirectConfiguration(page);

  await page.evaluate(
    ({ key }) => {
      const persisted = JSON.parse(localStorage.getItem(key) ?? "{}");
      const proposal = persisted.state.proposals[0];
      const confirmedAt = "2026-07-26T09:05:00.000Z";
      delete proposal.roomResolutionState;
      delete proposal.listingFeeResolutionState;
      delete proposal.overallConfigurationResolutionState;
      proposal.policyResolutionState = "APPLIED";
      proposal.proposalVersion = 4;
      proposal.status = "CONFIRMED";
      proposal.confirmedBy = "admin.configuration@mock.local";
      proposal.confirmedAt = confirmedAt;
      proposal.updatedAt = confirmedAt;
      proposal.versions.push({
        proposalVersion: 4,
        status: "CONFIRMED",
        rules: { ...proposal.rules },
        recordedAt: confirmedAt,
        recordedBy: proposal.confirmedBy,
        commandId: "e2e-schema-v3-sgdg-confirm",
      });
      proposal.history.push({
        historyId: `${proposal.configurationId}-history-4-configuration-confirmed`,
        configurationId: proposal.configurationId,
        sessionId: proposal.sessionId,
        proposalVersion: 4,
        action: "CONFIGURATION_CONFIRMED",
        fromStatus: "SUBMITTED",
        toStatus: "CONFIRMED",
        actorId: proposal.confirmedBy,
        actorRole: "ADMIN",
        commandId: "e2e-schema-v3-sgdg-confirm",
        occurredAt: confirmedAt,
        visibility: "STAFF_ONLY",
      });
      persisted.state.snapshots = [
        {
          snapshotId: `${proposal.configurationId}-snapshot-v4`,
          configurationId: proposal.configurationId,
          sessionId: proposal.sessionId,
          sessionVersionAtConfirmation: proposal.sessionVersion,
          proposalVersion: 4,
          creationSource: proposal.creationSource,
          managementMode: proposal.managementMode,
          rules: proposal.rules,
          policyDecisionReference: proposal.policyDecisionReference,
          priceBandResolution: proposal.priceBandResolution,
          roomResolution: proposal.roomResolution,
          listingFeeResolution: proposal.listingFeeResolution,
          specialRooms: proposal.specialRoomContext,
          confirmedBy: proposal.confirmedBy,
          confirmedAt,
          confirmationCommandReference: "e2e-schema-v3-sgdg-confirm",
          snapshotVersion: 1,
        },
      ];
      persisted.version = 3;
      localStorage.setItem(key, JSON.stringify(persisted));
    },
    { key: storageKey },
  );
  await page.reload();

  await page.goto(`/ops/auctions/${sessionId}`);
  await expect(
    page.getByText(
      /Legacy Configuration evidence retained — SGDG-managed Listing Fee decision required/,
    ),
  ).toBeVisible();
  await expect(page.getByText(/LEGACY_SGDG_FEE_UNRESOLVED/)).toBeVisible();
  await expect(page.getByText(/No current Snapshot/)).toBeVisible();
  await expect(page.getByText(/Configuration đã xác nhận/)).toHaveCount(0);
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  await expect(page.getByText("NOT_READY", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(/LEGACY_SGDG_FEE_UNRESOLVED/)).toBeVisible();
  await expect(page.getByText(/Configuration đã xác nhận/)).toHaveCount(0);
});
