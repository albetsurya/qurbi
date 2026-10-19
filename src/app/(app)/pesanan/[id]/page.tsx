"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faClock, faCommentDots, faCopy, faDownload, faEye, faTruck, faUtensils, faHouse, faFlagCheckered, faCircleXmark, faVideo } from "@fortawesome/free-solid-svg-icons";
import { useOrderDetail } from "@/lib/queries/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildNiatText, downloadCertificate } from "@/lib/certificate";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";

const TIMELINE = [
  { status: "PENDING", label: "Pesanan dibuat", icon: faClock },
  { status: "PAID", label: "Pembayaran diterima", icon: faCircleCheck },
  { status: "PROCESSING", label: "Hewan disiapkan", icon: faUtensils },
  { status: "DELIVERING", label: "Dalam perjalanan", icon: faTruck },
  { status: "DELIVERED", label: "Tiba di lokasi", icon: faHouse },
  { status: "COMPLETED", label: "Selesai", icon: faFlagCheckered },
] as const;

const STEPPER = ["Dibuat", "Dibayar", "Disiapkan", "Diantar", "Selesai"] as const;

const STEPPER_INDEX: Record<string, number> = {
  PENDING: 1,
  PAID: 2,
  PROCESSING: 2,
  DELIVERING: 3,
  DELIVERED: 4,
  COMPLETED: 5,
};

/** Extraksi nama shohibul qurban dari notes (format yang ditulis API saat checkout). */
function parseParticipants(notes: string | null): { names: string[]; cleanNotes: string | null } {
  if (!notes) return { names: [], cleanNotes: null };
  const match = notes.match(/Shohibul qurban \(\d+ orang\): (.+)/);
  const names = match ? match[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  const cleanNotes = notes.replace(/\n*\s*Shohibul qurban \(\d+ orang\): .+/, "").trim() || null;
  return { names, cleanNotes };
}

export default function PesananDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading, isFetching, refetch } = useOrderDetail(id);

  useEffect(() => { document.title = "Detail Pesanan | QurbanKu"; }, []);

  if (isLoading) return <p className="py-16 text-center text-sm text-ink-muted" role="status">Memuat detail pesanan...</p>;
  if (!order) return <p className="py-16 text-center text-sm text-error">Pesanan tidak ditemukan.</p>;

  const activeIndex = TIMELINE.findIndex((t) => t.status === order.status);
  const cancelled = order.status === "CANCELLED";
  const pending = order.status === "PENDING";
  const { names: participantNames, cleanNotes } = parseParticipants(order.notes ?? null);
  const livestockImages = Array.isArray(order.livestock.images) ? order.livestock.images : [];
  const showDocs = !cancelled && ["PAID", "PROCESSING", "DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status);
  const adminWa = process.env.NEXT_PUBLIC_ADMIN_WA;

  return (
    <div className="container-app space-y-4 py-4">
      <div className="rounded-card bg-surface p-4 shadow-subtle">
        <div className="flex items-center justify-between">
          <p className="font-heading text-h3 font-bold">{order.orderNumber}</p>
          <Badge variant={cancelled ? "error" : order.status === "PENDING" ? "warning" : "success"}>
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm">{order.livestock.name} × {order.quantity}</p>
        <p className="mt-1 text-xs text-ink-muted">{formatDate(order.createdAt)}</p>
        <p className="mt-2 font-heading text-h2 font-bold text-primary">{formatRupiah(order.totalAmount)}</p>
      </div>

      {!cancelled && (
        <ol aria-label="Progres pesanan" className="flex items-start rounded-card bg-surface px-2 py-4 shadow-subtle">
          {STEPPER.map((label, i) => {
            const current = STEPPER_INDEX[order.status] ?? 0;
            const done = i < current;
            const isCurrent = i === current;
            return (
              <li key={label} className="flex min-w-0 flex-1 flex-col items-center" aria-current={isCurrent ? "step" : undefined}>
                <span className="flex w-full items-center" aria-hidden="true">
                  <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done || isCurrent ? "bg-primary" : "bg-black/10 dark:bg-white/10"}`} />
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done ? "bg-primary text-white" : isCurrent ? "animate-dot-pulse bg-warning text-white" : "bg-black/10 text-ink-muted dark:bg-white/10"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`h-0.5 flex-1 ${i === STEPPER.length - 1 ? "opacity-0" : done ? "bg-primary" : "bg-black/10 dark:bg-white/10"}`} />
                </span>
                <span className={`mt-1 text-center text-[10px] leading-tight ${done || isCurrent ? "font-semibold text-ink" : "text-ink-muted"}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {cancelled ? (
        <div className="flex items-center gap-2 rounded-card bg-error/10 p-4 text-sm text-error">
          <FontAwesomeIcon icon={faCircleXmark} className="h-5 w-5" /> Pesanan ini telah dibatalkan.
        </div>
      ) : (
        <ol className="space-y-0 rounded-card bg-surface p-4 shadow-subtle" aria-label="Timeline pesanan">
          {TIMELINE.map((step, i) => {
            const done = i < activeIndex || (activeIndex === -1 && order.status === "COMPLETED") || i <= (order.status === "COMPLETED" ? TIMELINE.length : activeIndex);
            const isDone = order.status === "COMPLETED" ? true : i <= activeIndex;
            const isCurrent = i === activeIndex && order.status !== "COMPLETED";
            return (
              <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0">
                {i < TIMELINE.length - 1 && (
                  <span className={`absolute left-[15px] top-8 h-full w-0.5 ${isDone ? "bg-primary" : "bg-black/10"}`} aria-hidden="true" />
                )}
                <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${isDone ? "bg-primary text-white" : "bg-black/5 text-ink-muted"} ${isCurrent ? "animate-dot-pulse" : ""}`}>
                  <FontAwesomeIcon icon={step.icon} className="h-3.5 w-3.5" />
                </span>
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${isDone ? "text-ink" : "text-ink-muted"}`}>{step.label}</p>
                  {isCurrent && <p className="text-xs text-secondary">Sedang berjalan</p>}
                  {step.status === "PAID" && order.paidAt && isDone && (
                    <p className="text-xs text-ink-muted">{formatDate(order.paidAt)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-1 rounded-card bg-surface p-4 text-sm shadow-subtle">
        <h2 className="mb-2 font-heading text-h3 font-semibold">Info Pengiriman</h2>
        <p><span className="text-ink-muted">Nama:</span> {order.guestName}</p>
        <p><span className="text-ink-muted">WhatsApp:</span> {order.guestPhone}</p>
        <p><span className="text-ink-muted">Metode:</span> {order.deliveryType}</p>
        {order.deliveryAddress && <p><span className="text-ink-muted">Alamat:</span> {order.deliveryAddress}</p>}
        {cleanNotes && <p><span className="text-ink-muted">Catatan:</span> {cleanNotes}</p>}
      </div>

      {participantNames.length > 0 && (
        <div className="rounded-card bg-surface p-4 shadow-subtle">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold">Shohibul Qurban</h2>
            <Badge variant="primary">{participantNames.length}/7 orang</Badge>
          </div>
          <ol className="divide-y divide-black/5 dark:divide-white/10">
            {participantNames.map((name, i) => (
              <li key={`${name}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="font-medium">{name}</span>
              </li>
            ))}
          </ol>
          <NiatActions names={participantNames} orderNumber={order.orderNumber} date={formatDate(order.createdAt)} />
        </div>
      )}

      {showDocs && (livestockImages.length > 0 || order.livestock.cctvUrl) && (
        <div className="space-y-2 rounded-card bg-surface p-4 shadow-subtle">
          <h2 className="font-heading text-h3 font-semibold">Dokumentasi Hewan</h2>
          <p className="text-xs text-ink-muted">Pantau kondisi hewan qurbanmu secara transparan.</p>
          <div className="flex gap-2">
            {livestockImages[0] && (
              <a href={livestockImages[0]} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" fullWidth={false} className="w-full">
                  <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
                  Lihat Foto Hewan
                </Button>
              </a>
            )}
            {order.livestock.cctvUrl && (
              <a href={order.livestock.cctvUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" fullWidth={false} className="w-full">
                  <FontAwesomeIcon icon={faVideo} className="h-3.5 w-3.5" />
                  Live CCTV
                </Button>
              </a>
            )}
          </div>
        </div>
      )}

      {pending && (
        <div className="space-y-3 rounded-card bg-warning/10 p-4 text-sm" role="status" aria-live="polite">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faClock} className="mt-0.5 h-4 w-4 shrink-0 animate-dot-pulse text-warning" />
            <div>
              <p className="font-semibold">Menunggu pembayaran via DOKU</p>
              <p className="mt-0.5 text-xs opacity-90">
                Selesaikan pembayaran sebelum kedaluwarsa. Status diperbarui otomatis
                setelah webhook DOKU diterima — tidak perlu refresh manual, tapi kamu
                bisa cek ulang di bawah.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {order.paymentUrl && (
              <a href={order.paymentUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button fullWidth={false} className="w-full">Bayar Sekarang</Button>
              </a>
            )}
            <Button
              variant="outline"
              fullWidth={false}
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Mengecek..." : "Cek Status"}
            </Button>
          </div>
        </div>
      )}
      <Link href="/pesanan" className="block text-center text-xs font-semibold text-secondary">← Kembali ke Daftar Pesanan</Link>

      {adminWa && (
        <a
          href={`https://wa.me/${adminWa}?text=${encodeURIComponent(`Halo Admin QurbanKu, saya ingin menanyakan status pesanan ${order.orderNumber}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp admin tentang pesanan ini"
          className="btn-press fixed inset-x-0 bottom-36 z-40 mx-auto w-full max-w-app pointer-events-none"
        >
          <span className="container-app flex justify-end">
            <span className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white shadow-float">
              <FontAwesomeIcon icon={faCommentDots} className="h-5 w-5" />
            </span>
          </span>
        </a>
      )}
    </div>
  );
}

function NiatActions({ names, orderNumber, date }: { names: string[]; orderNumber: string; date: string }) {
  const [copied, setCopied] = useState(false);

  const copyNiat = async () => {
    try {
      await navigator.clipboard.writeText(buildNiatText(names, orderNumber));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia
    }
  };

  return (
    <div className="mt-3 flex gap-2">
      <Button variant="outline" fullWidth={false} className="flex-1" onClick={copyNiat}>
        <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
        {copied ? "Niat Tersalin!" : "Salin Niat Qurban"}
      </Button>
      <Button
        variant="outline"
        fullWidth={false}
        className="flex-1"
        onClick={() => downloadCertificate({ names, orderNumber, date })}
      >
        <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
        Unduh Sertifikat
      </Button>
    </div>
  );
}
