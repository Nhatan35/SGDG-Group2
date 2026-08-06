import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HandoverDeliveryAddress {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  note: string;
  updatedAt?: string;
}

export const DEFAULT_HANDOVER_DELIVERY_ADDRESS: HandoverDeliveryAddress = {
  recipientName: "Nguyễn Minh Anh",
  phone: "0901234567",
  addressLine: "72 Nguyễn Huệ",
  ward: "P. Bến Nghé",
  district: "Q.1",
  city: "TP. HCM",
  note: "",
};

interface HandoverDeliveryAddressState {
  addresses: Record<string, HandoverDeliveryAddress>;
  updateAddress: (
    caseId: string,
    address: HandoverDeliveryAddress,
  ) => void;
  resetForTests: () => void;
}

export const useHandoverDeliveryAddressStore =
  create<HandoverDeliveryAddressState>()(
    persist(
      (set) => ({
        addresses: {},
        updateAddress: (caseId, address) =>
          set((state) => ({
            addresses: {
              ...state.addresses,
              [caseId]: {
                ...address,
                updatedAt: new Date().toISOString(),
              },
            },
          })),
        resetForTests: () => set({ addresses: {} }),
      }),
      {
        name: "sgdg-handover-delivery-address-v1",
        version: 1,
        partialize: (state) => ({ addresses: state.addresses }),
      },
    ),
  );

export function formatHandoverDeliveryAddress(
  address: HandoverDeliveryAddress,
) {
  return [
    address.addressLine,
    address.ward,
    address.district,
    address.city,
  ]
    .filter(Boolean)
    .join(", ");
}
