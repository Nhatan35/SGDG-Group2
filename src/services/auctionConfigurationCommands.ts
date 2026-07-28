import type { StaffRole } from "../config/staffRoles";

export type AuctionConfigurationStatus =
  | "DRAFT_PROPOSAL"
  | "PENDING_REVIEW"
  | "APPROVED_SNAPSHOT";

export interface AuctionConfiguration {
  ruleVersionId: string;
  version: number;
  status: AuctionConfigurationStatus;
  startingPrice: number;
  minimumIncrement: number;
  depositPolicyReference: string;
  eligibilityPolicyReference: string;
  extensionPolicyReference: string;
  fallbackPolicyReference: string;
}

type CommandFailure =
  | "FORBIDDEN"
  | "STALE"
  | "IMMUTABLE"
  | "INVALID"
  | "REASON_REQUIRED";
export type ConfigurationCommandResult =
  | { ok: true; configuration: AuctionConfiguration }
  | { ok: false; reason: CommandFailure; errors?: string[] };

export function configurationErrors(value: AuctionConfiguration): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(value.startingPrice) || value.startingPrice <= 0)
    errors.push("Giá khởi điểm phải lớn hơn 0.");
  if (
    !Number.isFinite(value.minimumIncrement) ||
    value.minimumIncrement <= 0 ||
    value.minimumIncrement > value.startingPrice
  )
    errors.push("Bước giá phải lớn hơn 0 và không vượt giá khởi điểm.");
  if (
    [
      value.depositPolicyReference,
      value.eligibilityPolicyReference,
      value.extensionPolicyReference,
      value.fallbackPolicyReference,
    ].some((reference) => !reference.trim())
  )
    errors.push("Tất cả tham chiếu chính sách đều bắt buộc.");
  return errors;
}

function guard(
  current: AuctionConfiguration,
  actor: StaffRole,
  expectedVersion: number,
): ConfigurationCommandResult | undefined {
  if (actor !== "CONTENT_STAFF") return { ok: false, reason: "FORBIDDEN" };
  if (current.version !== expectedVersion) return { ok: false, reason: "STALE" };
  if (current.status !== "DRAFT_PROPOSAL")
    return { ok: false, reason: "IMMUTABLE" };
  const errors = configurationErrors(current);
  if (errors.length) return { ok: false, reason: "INVALID", errors };
  return undefined;
}

export function saveConfiguration(
  current: AuctionConfiguration,
  actor: StaffRole,
  expectedVersion: number,
): ConfigurationCommandResult {
  const blocked = guard(current, actor, expectedVersion);
  if (blocked) return blocked;
  return {
    ok: true,
    configuration: { ...current, version: current.version + 1 },
  };
}

export function submitConfiguration(
  current: AuctionConfiguration,
  actor: StaffRole,
  expectedVersion: number,
): ConfigurationCommandResult {
  const blocked = guard(current, actor, expectedVersion);
  if (blocked) return blocked;
  return {
    ok: true,
    configuration: {
      ...current,
      version: current.version + 1,
      status: "PENDING_REVIEW",
    },
  };
}

export function proposeSensitiveChange(
  approved: AuctionConfiguration,
  actor: StaffRole,
  expectedVersion: number,
  reason: string,
  changes: Partial<AuctionConfiguration>,
): ConfigurationCommandResult {
  if (actor !== "CONTENT_STAFF") return { ok: false, reason: "FORBIDDEN" };
  if (approved.version !== expectedVersion)
    return { ok: false, reason: "STALE" };
  if (approved.status !== "APPROVED_SNAPSHOT")
    return { ok: false, reason: "IMMUTABLE" };
  if (!reason.trim()) return { ok: false, reason: "REASON_REQUIRED" };
  return {
    ok: true,
    configuration: {
      ...approved,
      ...changes,
      ruleVersionId: `${approved.ruleVersionId}-CHANGE`,
      version: approved.version + 1,
      status: "PENDING_REVIEW",
    },
  };
}
