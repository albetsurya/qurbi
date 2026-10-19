import { formatRupiah } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export default function CartSummary({ totalPrice }: { totalPrice: number }) {
  return (
    <Card aria-label="Ringkasan belanja">
      <div className="flex justify-between text-sm"><span className="text-ink-muted">Subtotal</span><span>{formatRupiah(totalPrice)}</span></div>
      <div className="mt-1 flex justify-between text-sm"><span className="text-ink-muted">Biaya layanan</span><span>Gratis</span></div>
      <hr className="my-2 border-black/5" />
      <div className="flex justify-between font-heading text-h3 font-bold"><span>Total</span><span className="text-primary">{formatRupiah(totalPrice)}</span></div>
    </Card>
  );
}
