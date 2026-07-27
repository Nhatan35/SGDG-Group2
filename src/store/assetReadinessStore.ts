import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  canRequestAssetReadiness,
  getAssetReadinessReference,
  getRefreshedAssetReadinessReference,
  type AssetReadinessReference,
  type AssetReadinessScenario,
} from "../services/assetReadinessService";

export interface AssetReadinessHistoryEntry {
  id: string;
  action: "REFERENCE_REQUESTED" | "REFERENCE_REFRESHED";
  assetId: string;
  referenceId: string;
  assetVersion: number;
  actorId: string;
  actorRole: "CONTENT_STAFF";
  commandId: string;
  createdAt: string;
}

interface AssetReferenceCommand {
  assetId: string;
  actorId: string;
  actorRole: ActorRole;
  commandId: string;
  scenario?: AssetReadinessScenario;
}

interface RefreshAssetReferenceCommand extends AssetReferenceCommand {
  expectedAssetVersion: number;
}

export type AssetReferenceCommandResult =
  | {
      ok: true;
      reference: AssetReadinessReference;
      refreshed: boolean;
    }
  | {
      ok: false;
      code:
        | "ACCESS_DENIED"
        | "ASSET_NOT_FOUND"
        | "STALE_ASSET_VERSION"
        | "DUPLICATE_COMMAND"
        | "BLOCKED";
      message: string;
    };

interface AssetReadinessState {
  references: AssetReadinessReference[];
  history: AssetReadinessHistoryEntry[];
  requestAssetReadinessReference: (
    command: AssetReferenceCommand,
  ) => AssetReferenceCommandResult;
  refreshAssetReadinessReference: (
    command: RefreshAssetReferenceCommand,
  ) => AssetReferenceCommandResult;
  getReferenceByAssetId: (
    assetId: string,
  ) => AssetReadinessReference | undefined;
  resetDeterministicAssetReadinessState: () => void;
}

const failure = (
  code: Extract<AssetReferenceCommandResult, { ok: false }>["code"],
  message: string,
): AssetReferenceCommandResult => ({ ok: false, code, message });

const isReference = (value: unknown): value is AssetReadinessReference => {
  if (typeof value !== "object" || value === null) return false;
  return (
    typeof Reflect.get(value, "referenceId") === "string" &&
    Reflect.get(value, "sourceDomain") === "PRODUCT_ASSET" &&
    typeof Reflect.get(value, "assetId") === "string" &&
    typeof Reflect.get(value, "assetDisplayName") === "string" &&
    Number.isInteger(Reflect.get(value, "assetVersion")) &&
    Reflect.get(value, "assetVersion") > 0 &&
    ["APPROVED", "PENDING_REVIEW", "REJECTED"].includes(
      String(Reflect.get(value, "approvalStatus")),
    ) &&
    [
      "AVAILABLE",
      "HELD",
      "RESTRICTED",
      "COMMITTED_TO_ACTIVE_SESSION",
      "UNAVAILABLE",
    ].includes(String(Reflect.get(value, "availabilityStatus"))) &&
    typeof Reflect.get(value, "observedAt") === "string" &&
    Number.isFinite(Date.parse(String(Reflect.get(value, "observedAt"))))
  );
};

const isHistoryEntry = (
  value: unknown,
): value is AssetReadinessHistoryEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "id") === "string" &&
  ["REFERENCE_REQUESTED", "REFERENCE_REFRESHED"].includes(
    String(Reflect.get(value, "action")),
  ) &&
  typeof Reflect.get(value, "assetId") === "string" &&
  typeof Reflect.get(value, "referenceId") === "string" &&
  Number.isInteger(Reflect.get(value, "assetVersion")) &&
  typeof Reflect.get(value, "actorId") === "string" &&
  Reflect.get(value, "actorRole") === "CONTENT_STAFF" &&
  typeof Reflect.get(value, "commandId") === "string" &&
  String(Reflect.get(value, "commandId")).trim().length > 0 &&
  typeof Reflect.get(value, "createdAt") === "string";

export const sanitizeAssetReadinessPersistence = (
  referencesValue: unknown,
  historyValue: unknown,
) => {
  const assetIds = new Set<string>();
  const referenceIds = new Set<string>();
  const references = Array.isArray(referencesValue)
    ? referencesValue.filter((candidate): candidate is AssetReadinessReference => {
        if (
          !isReference(candidate) ||
          assetIds.has(candidate.assetId) ||
          referenceIds.has(candidate.referenceId)
        )
          return false;
        assetIds.add(candidate.assetId);
        referenceIds.add(candidate.referenceId);
        return true;
      })
    : [];
  const validAssetIds = new Set(
    references.map((reference) => reference.assetId),
  );
  const commandIds = new Set<string>();
  const history = Array.isArray(historyValue)
    ? historyValue.filter((candidate): candidate is AssetReadinessHistoryEntry => {
        if (
          !isHistoryEntry(candidate) ||
          !validAssetIds.has(candidate.assetId) ||
          commandIds.has(candidate.commandId)
        )
          return false;
        commandIds.add(candidate.commandId);
        return true;
      })
    : [];
  return { references, history };
};

const commandAlreadyUsed = (
  history: AssetReadinessHistoryEntry[],
  commandId: string,
) => history.find((entry) => entry.commandId === commandId);

export const useAssetReadinessStore = create<AssetReadinessState>()(
  persist(
    (set, get) => ({
      references: [],
      history: [],
      requestAssetReadinessReference: (command) => {
        if (!canRequestAssetReadiness(command.actorRole))
          return failure(
            "ACCESS_DENIED",
            "Chỉ Content Staff được yêu cầu tham chiếu Asset nội bộ.",
          );
        if (!command.commandId.trim())
          return failure("BLOCKED", "Command ID là bắt buộc.");
        const used = commandAlreadyUsed(get().history, command.commandId);
        if (used) {
          const reference = get().references.find(
            (item) => item.referenceId === used.referenceId,
          );
          if (reference && reference.assetId === command.assetId)
            return { ok: true, reference, refreshed: false };
          return failure(
            "DUPLICATE_COMMAND",
            "Command ID đã được dùng cho Asset khác.",
          );
        }
        const reference = getAssetReadinessReference(
          command.assetId,
          command.scenario,
        );
        if (!reference)
          return failure("ASSET_NOT_FOUND", "Không tìm thấy Asset reference.");
        const event: AssetReadinessHistoryEntry = {
          id: `ARH-${reference.referenceId}-REQUEST`,
          action: "REFERENCE_REQUESTED",
          assetId: reference.assetId,
          referenceId: reference.referenceId,
          assetVersion: reference.assetVersion,
          actorId: command.actorId,
          actorRole: "CONTENT_STAFF",
          commandId: command.commandId,
          createdAt: reference.observedAt,
        };
        set((state) => ({
          references: [
            ...state.references.filter(
              (item) => item.assetId !== reference.assetId,
            ),
            reference,
          ],
          history: [
            ...state.history.filter(
              (item) => item.assetId !== reference.assetId,
            ),
            event,
          ],
        }));
        return { ok: true, reference, refreshed: false };
      },
      refreshAssetReadinessReference: (command) => {
        if (!canRequestAssetReadiness(command.actorRole))
          return failure(
            "ACCESS_DENIED",
            "Chỉ Content Staff được làm mới tham chiếu Asset.",
          );
        if (!command.commandId.trim())
          return failure("BLOCKED", "Command ID là bắt buộc.");
        const current = get().references.find(
          (item) => item.assetId === command.assetId,
        );
        if (!current)
          return failure("ASSET_NOT_FOUND", "Chưa có tham chiếu để làm mới.");
        const used = commandAlreadyUsed(get().history, command.commandId);
        if (used) {
          if (used.assetId === command.assetId)
            return { ok: true, reference: current, refreshed: true };
          return failure(
            "DUPLICATE_COMMAND",
            "Command ID đã được dùng cho Asset khác.",
          );
        }
        if (current.assetVersion !== command.expectedAssetVersion)
          return failure(
            "STALE_ASSET_VERSION",
            "Phiên bản tham chiếu cục bộ đã thay đổi. Hãy tải lại.",
          );
        const reference = getRefreshedAssetReadinessReference(
          command.assetId,
          command.scenario,
        );
        if (!reference)
          return failure("ASSET_NOT_FOUND", "Không tìm thấy Asset reference.");
        const event: AssetReadinessHistoryEntry = {
          id: `ARH-${reference.referenceId}-REFRESH-${get().history.length + 1}`,
          action: "REFERENCE_REFRESHED",
          assetId: reference.assetId,
          referenceId: reference.referenceId,
          assetVersion: reference.assetVersion,
          actorId: command.actorId,
          actorRole: "CONTENT_STAFF",
          commandId: command.commandId,
          createdAt: reference.refreshedAt ?? reference.observedAt,
        };
        set((state) => ({
          references: [
            ...state.references.filter(
              (item) => item.assetId !== reference.assetId,
            ),
            reference,
          ],
          history: [...state.history, event],
        }));
        return { ok: true, reference, refreshed: true };
      },
      getReferenceByAssetId: (assetId) =>
        get().references.find((reference) => reference.assetId === assetId),
      resetDeterministicAssetReadinessState: () =>
        set({ references: [], history: [] }),
    }),
    {
      name: "sgdg-asset-readiness-v1",
      version: 1,
      partialize: (state) => ({
        references: state.references,
        history: state.history,
      }),
      merge: (persisted, current) => {
        const sanitized = sanitizeAssetReadinessPersistence(
          typeof persisted === "object" && persisted !== null
            ? Reflect.get(persisted, "references")
            : undefined,
          typeof persisted === "object" && persisted !== null
            ? Reflect.get(persisted, "history")
            : undefined,
        );
        return { ...current, ...sanitized };
      },
    },
  ),
);
