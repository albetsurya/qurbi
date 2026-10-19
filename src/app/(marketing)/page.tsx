import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faHandHoldingDollar,
  faShieldAlt,
  faTruckFast,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: faShieldAlt,
    title: "Hewan Sehat & Terverifikasi",
    description: "Setiap hewan diperiksa kesehatannya dan dicatat riwayat vaksinnya secara transparan.",
  },
  {
    icon: faTruckFast,
    title: "Diantar atau Ambil di Kandang",
    description: "Pilih pengiriman ke lokasi, ambil sendiri, atau layanan sembelih & masak siap bawa.",
  },
  {
    icon: faVideo,
    title: "Pantau via Live CCTV",
    description: "Cek kondisi hewan pilihanmu kapan saja lewat siaran langsung kandang.",
  },
] as const;

const STEPS = [
  { title: "1. Pilih Hewan", description: "Telusuri katalog kambing, domba, dan sapi sesuai budget." },
  { title: "2. Checkout", description: "Bayar via VA bank, QRIS, e-wallet, atau kartu kredit." },
  { title: "3. Pantau Pesanan", description: "Ikuti timeline pesanan sampai hewan tiba di lokasimu." },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-8 pb-8">
      <section className="container-app space-y-4 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">
          Qurban & Aqiqah Online
        </p>
        <h1 className="font-heading text-display font-bold text-primary">
          Tunaikan Qurban dengan Mudah & Terpercaya
        </h1>
        <p className="mx-auto max-w-sm text-sm text-ink-muted">
          Pilih hewan qurban terbaik dari peternak terverifikasi, bayar online, dan pantau
          pengiriman sampai selesai.
        </p>
        <Link
          href="/produk"
          className="btn-press inline-flex h-12 items-center gap-2 rounded-control bg-accent px-6 font-heading font-semibold text-primary"
        >
          Pesan Kambing Sekarang
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
        </Link>
        <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs text-ink-muted">
          <span className="rounded-pill bg-surface px-3 py-1 shadow-subtle">✓ Peternak terverifikasi</span>
          <span className="rounded-pill bg-surface px-3 py-1 shadow-subtle">✓ Pembayaran aman via DOKU</span>
          <span className="rounded-pill bg-surface px-3 py-1 shadow-subtle">✓ Bisa checkout tanpa akun</span>
        </div>
      </section>

      <section className="container-app space-y-3">
        <h2 className="font-heading text-h1 font-semibold">Kenapa QurbanKu?</h2>
        {FEATURES.map((f) => (
          <Card key={f.title} className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-primary/5">
              <FontAwesomeIcon icon={f.icon} className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h3 className="font-heading text-h3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{f.description}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="container-app space-y-3">
        <h2 className="font-heading text-h1 font-semibold">Cara Pesan</h2>
        <ol className="grid gap-3">
          {STEPS.map((s) => (
            <li key={s.title} className="rounded-card bg-surface p-4 shadow-subtle">
              <h3 className="font-heading text-h3 font-semibold text-primary">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{s.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-app">
        <div className="rounded-card bg-primary p-6 text-center text-white shadow-medium">
          <FontAwesomeIcon icon={faHandHoldingDollar} className="h-8 w-8" />
          <h2 className="mt-2 font-heading text-h2 font-bold">Siap Berqurban Tahun Ini?</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-white/80">
            Stok hewan terbatas menjelang Idul Adha. Amankan pesananmu sekarang.
          </p>
          <Link
            href="/produk"
            className="btn-press mt-4 inline-flex h-12 items-center gap-2 rounded-control bg-white px-6 font-heading font-semibold text-primary"
          >
            Lihat Katalog
            <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
