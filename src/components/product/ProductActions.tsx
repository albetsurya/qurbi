"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { flyToCart, pulseCartIcon } from "@/lib/fly-to-cart";
import { Button } from "@/components/ui/button";

export default function ProductActions(p: {
  livestockId: string; slug: string; name: string; type: string;
  price: number; image: string; weightKg: number; stock: number;
}) {
  const router = useRouter();
  const { addItem } = useCart();

  if (p.stock <= 0) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-app bg-surface p-4 shadow-medium safe-bottom">
        <Button disabled fullWidth>Stok Habis</Button>
      </div>
    );
  }

  const addToCart = (fromEl?: HTMLElement | null) => {
    addItem({ livestockId: p.livestockId, slug: p.slug, name: p.name, type: p.type, price: p.price, image: p.image, weightKg: p.weightKg });
    if (fromEl && !flyToCart(p.image, fromEl)) pulseCartIcon();
    toast.success(`${p.name} masuk keranjang`);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-app gap-3 bg-surface p-4 shadow-medium safe-bottom">
      <Button variant="outline" fullWidth={false} className="flex-1" onClick={(e) => addToCart(e.currentTarget)}>
        + Keranjang
      </Button>
      <Button className="flex-1" onClick={(e) => { addToCart(e.currentTarget); router.push("/checkout"); }}>
        Pesan Sekarang
      </Button>
    </div>
  );
}
