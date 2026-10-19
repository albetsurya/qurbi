import Image from "next/image";
import { formatRupiah, formatWeight } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { CartItem } from "@/hooks/useCart";

export default function OrderSummary({ items, totalPrice }: { items: CartItem[]; totalPrice: number }) {
  return (
    <Card aria-label="Ringkasan pesanan">
      <h2 className="mb-3 font-heading text-h3 font-semibold">Ringkasan Pesanan</h2>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.livestockId} className="flex items-center gap-3">
            <span className="relative h-12 w-12 overflow-hidden rounded-control bg-black/5">
              <Image src={i.image || "https://picsum.photos/seed/cart/120/120"} alt={i.name} fill sizes="48px" className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{i.name}</p>
              <p className="text-xs text-ink-muted">{formatWeight(i.weightKg)} × {i.quantity}</p>
            </div>
            <p className="text-sm font-bold">{formatRupiah(i.price * i.quantity)}</p>
          </li>
        ))}
      </ul>
      <hr className="my-3 border-black/5" />
      <div className="flex justify-between font-heading text-h3 font-bold">
        <span>Total Bayar</span><span className="text-primary">{formatRupiah(totalPrice)}</span>
      </div>
    </Card>
  );
}
