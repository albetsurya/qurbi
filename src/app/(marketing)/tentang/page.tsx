import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Tentang QurbanKu" };

export default function TentangPage() {
  return (
    <div className="container-app space-y-4 py-6">
      <h1 className="font-heading text-h1 font-semibold">Tentang QurbanKu</h1>
      <Card>
        <h2 className="font-heading text-h3 font-semibold">Misi Kami</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          QurbanKu menghubungkan jamaah dengan peternak terverifikasi agar ibadah qurban dan
          aqiqah menjadi mudah, amanah, dan transparan — dari memilih hewan hingga tiba di
          lokasi.
        </p>
      </Card>
      <Card>
        <h2 className="font-heading text-h3 font-semibold">Standar Hewan</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Seluruh hewan wajib memenuhi syarat sah qurban: sehat, cukup umur, dan tidak cacat.
          Riwayat vaksin ditampilkan di halaman detail produk agar kamu bisa mengeceknya
          sendiri.
        </p>
      </Card>
      <Card>
        <h2 className="font-heading text-h3 font-semibold">Layanan</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-muted">
          <li>Antar hewan ke lokasi (dalam kota)</li>
          <li>Ambil sendiri di kandang peternak</li>
          <li>Layanan sembelih syar&apos;i dan masak</li>
          <li>Pantau kandang via live CCTV</li>
        </ul>
      </Card>
    </div>
  );
}
