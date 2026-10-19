"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  /** Nomor WhatsApp terakhir yang dipakai checkout (untuk lacak pesanan tamu). */
  lastOrderPhone: string | null;
  setLastOrderPhone: (phone: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      lastOrderPhone: null,
      setLastOrderPhone: (phone) => set({ lastOrderPhone: phone }),
    }),
    { name: "qbk-ui" }
  )
);
