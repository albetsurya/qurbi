export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatRupiah(value: number | string | { toNumber(): number } | unknown): string {
  const n =
    typeof value === "object" && value !== null && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function"
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatWeight(kg: number | string | { toNumber(): number } | unknown): string {
  const n =
    typeof kg === "object" && kg !== null && "toNumber" in kg && typeof (kg as { toNumber: () => number }).toNumber === "function"
      ? (kg as { toNumber: () => number }).toNumber()
      : Number(kg);
  return `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  PAID: "Dibayar",
  PROCESSING: "Sedang Disiapkan",
  DELIVERING: "Dalam Perjalanan",
  DELIVERED: "Tiba di Lokasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
