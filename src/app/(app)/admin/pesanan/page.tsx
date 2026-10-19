"use client";

import { useAdminOrders, useUpdateOrderStatus } from "@/lib/queries/orders";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";
import { useState } from "react";

const NEXT_ACTION: Record<string, { label: string; next: string } | null> = {
  PAID: { label: "Proses", next: "PROCESSING" },
  PROCESSING: { label: "Kirim", next: "DELIVERING" },
  DELIVERING: { label: "Tandai Sampai", next: "DELIVERED" },
  DELIVERED: { label: "Selesaikan", next: "COMPLETED" },
  PENDING: { label: "Batalkan", next: "CANCELLED" },
};

export default function AdminPesananPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data: orders, isLoading } = useAdminOrders(status);
  const updateStatus = useUpdateOrderStatus();

  return (
    <div className="space-y-3">
      <Tabs value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="PAID">Dibayar</TabsTrigger>
          <TabsTrigger value="PROCESSING">Proses</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <p className="py-10 text-center text-sm text-ink-muted" role="status">Memuat...</p>}

      {orders?.map((o) => {
        const action = NEXT_ACTION[o.status];
        return (
          <Card key={o.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-heading text-sm font-bold">{o.orderNumber}</p>
              <Badge variant={o.status === "PENDING" ? "warning" : o.status === "CANCELLED" ? "error" : "success"}>
                {ORDER_STATUS_LABEL[o.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm">{o.livestock.name} × {o.id.slice(0, 4) /* qty via detail API jika perlu */}</p>
            <p className="mt-1 text-xs text-ink-muted">{formatDate(o.createdAt)}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-heading text-h3 font-bold text-primary">{formatRupiah(o.totalAmount)}</p>
              {action && (
                <Button size="sm" fullWidth={false} variant={o.status === "PENDING" ? "destructive" : "primary"}
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: o.id, status: action.next })}>
                  {action.label}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
