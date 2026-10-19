import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWifi } from "@fortawesome/free-solid-svg-icons";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-app flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-primary/5">
        <FontAwesomeIcon icon={faWifi} className="h-7 w-7 text-primary" />
      </span>
      <h1 className="font-heading text-h1 font-semibold">Kamu Sedang Offline</h1>
      <p className="max-w-xs text-sm text-ink-muted">
        Katalog yang sudah kamu buka tetap bisa dilihat. Pesanan akan terkirim otomatis saat koneksi kembali.
      </p>
      <Link href="/" className="rounded-control bg-primary px-6 py-3 text-sm font-semibold text-white">
        Coba Lagi
      </Link>
    </div>
  );
}
