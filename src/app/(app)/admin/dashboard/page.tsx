import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { getTopProducts, getTotalEvents } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalProducts, pendingOrders, paidOrders, revenue] = await Promise.all([
    prisma.livestock.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING", "DELIVERING"] } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { notIn: ["PENDING", "CANCELLED"] } } }),
  ]);

  const stats = [
    { label: "Produk Aktif", value: String(totalProducts) },
    { label: "Menunggu Bayar", value: String(pendingOrders) },
    { label: "Sedang Diproses", value: String(paidOrders) },
    { label: "Total Pendapatan", value: formatRupiah(Number(revenue._sum.totalAmount ?? 0)) },
  ];

  // Analitik produk — best-effort, tidak boleh merusak dashboard
  let analytics: {
    totalViews: number | null;
    totalClicks: number | null;
    topViews: Array<{ name: string; count: number }>;
    topClicks: Array<{ name: string; count: number }>;
    bestSellers: Array<{ name: string; count: number }>;
  } | null = null;
  try {
    const [totalViews, totalClicks, topViews, topClicks, ordered] = await Promise.all([
      getTotalEvents("view"),
      getTotalEvents("click"),
      getTopProducts("view", 5),
      getTopProducts("click", 5),
      prisma.order.groupBy({
        by: ["livestockId"],
        where: { status: { notIn: ["PENDING", "CANCELLED"] } },
        _count: { livestockId: true },
        orderBy: { _count: { livestockId: "desc" } },
        take: 5,
      }),
    ]);
    const ids = [
      ...(topViews ?? []).map((t) => t.productId),
      ...(topClicks ?? []).map((t) => t.productId),
      ...ordered.map((o) => o.livestockId),
    ];
    const names = new Map(
      (await prisma.livestock.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } }))
        .map((p) => [p.id, p.name] as const)
    );
    analytics = {
      totalViews,
      totalClicks,
      topViews: (topViews ?? []).map((t) => ({ name: names.get(t.productId) ?? "Produk dihapus", count: t.count })),
      topClicks: (topClicks ?? []).map((t) => ({ name: names.get(t.productId) ?? "Produk dihapus", count: t.count })),
      bestSellers: ordered.map((o) => ({ name: names.get(o.livestockId) ?? "Produk dihapus", count: o._count.livestockId })),
    };
  } catch {
    analytics = null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-1 font-heading text-h2 font-bold text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      <section aria-label="Analitik produk">
        <h2 className="mb-2 font-heading text-h3 font-semibold">Analitik Produk</h2>
        {analytics === null ? (
          <Card>
            <p className="text-sm text-ink-muted">
              Data analitik belum tersedia. Pastikan Upstash Redis terkonfigurasi — event view/klik
              tercatat otomatis saat pengunjung membuka katalog.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-xs text-ink-muted">Total Dilihat</p>
                <p className="mt-1 font-heading text-h2 font-bold text-primary">
                  {analytics.totalViews === null ? "—" : analytics.totalViews.toLocaleString("id-ID")}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-ink-muted">Total Diklik</p>
                <p className="mt-1 font-heading text-h2 font-bold text-primary">
                  {analytics.totalClicks === null ? "—" : analytics.totalClicks.toLocaleString("id-ID")}
                </p>
              </Card>
            </div>
            <TopList title="Paling banyak dilihat" rows={analytics.topViews} unit="lihat" />
            <TopList title="Paling banyak diklik" rows={analytics.topClicks} unit="klik" />
            <TopList title="Terlaris (pesanan)" rows={analytics.bestSellers} unit="pesanan" />
          </div>
        )}
      </section>
    </div>
  );
}

function TopList({ title, rows, unit }: { title: string; rows: Array<{ name: string; count: number }>; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <h3 className="mb-2 font-heading text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-muted">Belum ada data.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium">{i + 1}. {r.name}</span>
                <span className="shrink-0 text-ink-muted">{r.count.toLocaleString("id-ID")} {unit}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10" aria-hidden="true">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
