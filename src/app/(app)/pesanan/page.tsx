"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { faReceipt } from "@fortawesome/free-solid-svg-icons";
import { useMyOrders } from "@/lib/queries/orders";
import { useUIStore } from "@/stores/ui-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";
import { useState } from "react";

export default function PesananPage() {
  const { data: session } = useSession();
  const { lastOrderPhone, setLastOrderPhone } = useUIStore();
  const [phoneInput, setPhoneInput] = useState(lastOrderPhone ?? "");
  const phone = session?.user?.phone ?? lastOrderPhone ?? undefined;
  const { data: orders, isLoading } = useMyOrders(phone);

  if (!phone) {
    return (
      <div className="container-app space-y-4 py-6">
        <h1 className="font-heading text-h1 font-semibold">Pesanan Saya</h1>
        <p className="text-sm text-ink-muted">
          Masukkan nomor WhatsApp yang kamu pakai saat checkout untuk melacak pesanan.
        </p>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setLastOrderPhone(phoneInput); }}>
          <Input label="Nomor WhatsApp" placeholder="08xxxxxxxxxx" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
          <Button type="submit">Lacak Pesanan</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="container-app space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-h1 font-semibold">Pesanan Saya</h1>
        {!session?.user && (
          <button className="text-xs font-semibold text-secondary" onClick={() => setLastOrderPhone(null)}>
            Ganti Nomor
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3" role="status" aria-label="Memuat pesanan">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-card bg-surface p-4 shadow-subtle">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-5 w-24 rounded-pill bg-black/10 dark:bg-white/10" />
              </div>
              <div className="mt-3 h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
              <div className="mt-2 h-3 w-1/2 rounded bg-black/10 dark:bg-white/10" />
            </div>
          ))}
          <p className="sr-only">Memuat pesanan...</p>
        </div>
      )}

      {orders && orders.length === 0 && (
        <EmptyState icon={faReceipt} title="Belum ada pesanan"
          description="Pesanan yang kamu buat akan muncul di sini."
          actionLabel="Mulai Belanja" onAction={() => (window.location.href = "/produk")} />
      )}

      {orders?.map((o) => (
        <Link key={o.id} href={`/pesanan/${o.id}`} aria-label={`Pesanan ${o.orderNumber}`}>
          <Card className="transition-shadow hover:shadow-medium">
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold">{o.orderNumber}</p>
              <Badge variant={o.status === "PENDING" ? "warning" : o.status === "CANCELLED" ? "error" : "success"}>
                {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm">{o.livestock.name}</p>
            <p className="mt-1 flex justify-between text-xs text-ink-muted">
              <span>{formatDate(o.createdAt)}</span>
              <span className="font-heading text-sm font-bold text-primary">{formatRupiah(o.totalAmount)}</span>
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
