"use client";

import { useRouter } from "next/navigation";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "@/hooks/useCart";
import EmptyState from "@/components/shared/EmptyState";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import OrderSummary from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <EmptyState icon={faCartShopping} title="Tidak ada yang bisa di-checkout"
        description="Keranjangmu kosong." actionLabel="Kembali Belanja"
        onAction={() => router.push("/produk")} />
    );
  }

  return (
    <div className="container-app space-y-4 py-4">
      <h1 className="font-heading text-h1 font-semibold">Checkout</h1>
      <OrderSummary items={items} totalPrice={totalPrice} />
      <CheckoutForm items={items} totalPrice={totalPrice} onSuccess={clearCart} />
    </div>
  );
}
