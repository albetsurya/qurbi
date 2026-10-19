"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { CartItem } from "@/hooks/useCart";
import { formatRupiah, formatWeight } from "@/lib/utils";

export default function CartItem({ item, onQtyChange, onRemove }: {
  item: CartItem;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex gap-3 rounded-card bg-surface p-3 shadow-subtle">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control bg-black/5">
        <Image src={item.image || "https://picsum.photos/seed/cart/200/200"} alt={item.name} fill sizes="80px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-semibold">{item.name}</p>
        <p className="text-xs text-ink-muted">{formatWeight(item.weightKg)} · {item.type}</p>
        <p className="mt-1 font-heading text-sm font-bold text-primary">{formatRupiah(item.price)}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button aria-label="Kurangi" onClick={() => onQtyChange(item.livestockId, item.quantity - 1)}
              className="btn-press flex h-8 w-8 items-center justify-center rounded-control border border-black/10">
              <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
            <button aria-label="Tambah" onClick={() => onQtyChange(item.livestockId, item.quantity + 1)}
              className="btn-press flex h-8 w-8 items-center justify-center rounded-control bg-primary text-white">
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            </button>
          </div>
          <button aria-label="Hapus" onClick={() => onRemove(item.livestockId)}
            className="btn-press flex h-8 w-8 items-center justify-center text-error">
            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
