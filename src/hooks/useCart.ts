"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  livestockId: string;
  slug: string;
  name: string;
  type: string;
  price: number;
  image: string;
  weightKg: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (livestockId: string, quantity: number) => void;
  removeItem: (livestockId: string) => void;
  clearCart: () => void;
}

function calcTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      totalPrice: 0,

      addItem: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.livestockId === item.livestockId);
          const items = existing
            ? s.items.map((i) =>
                i.livestockId === item.livestockId
                  ? { ...i, quantity: Math.min(i.quantity + quantity, 99) }
                  : i
              )
            : [...s.items, { ...item, quantity }];
          return { items, totalPrice: calcTotal(items) };
        }),

      setQuantity: (livestockId, quantity) =>
        set((s) => {
          const items =
            quantity <= 0
              ? s.items.filter((i) => i.livestockId !== livestockId)
              : s.items.map((i) =>
                  i.livestockId === livestockId
                    ? { ...i, quantity: Math.min(quantity, 99) }
                    : i
                );
          return { items, totalPrice: calcTotal(items) };
        }),

      removeItem: (livestockId) =>
        set((s) => {
          const items = s.items.filter((i) => i.livestockId !== livestockId);
          return { items, totalPrice: calcTotal(items) };
        }),

      clearCart: () => set({ items: [], totalPrice: 0 }),
    }),
    { name: "qbk-cart" }
  )
);
