"use client";

import { useRouter } from "next/navigation";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "@/hooks/useCart";
import CartItem from "@/components/cart/CartItem";
import CartSummary from "@/components/cart/CartSummary";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export default function KeranjangPage() {
  const router = useRouter();
  const { items, setQuantity, removeItem, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={faCartShopping}
        title="Keranjangmu masih kosong"
        description="Yuk pilih kambing atau sapi qurban terbaikmu."
        actionLabel="Mulai Belanja"
        onAction={() => router.push("/produk")}
      />
    );
  }

  return (
    <div className="container-app space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-h1 font-semibold">Keranjang</h1>
        <button onClick={clearCart} className="text-xs font-semibold text-error">Kosongkan</button>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <CartItem key={item.livestockId} item={item} onQtyChange={setQuantity} onRemove={removeItem} />
        ))}
      </ul>
      <CartSummary totalPrice={totalPrice} />
      <Button onClick={() => router.push("/checkout")}>Lanjut ke Checkout</Button>
    </div>
  );
}
