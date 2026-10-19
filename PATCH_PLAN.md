# PATCH PLAN — QurbanKu (qurbi) Non-Games Audit

> **Branch:** `audit/qurbi-non-games-20261019`  
> **Tanggal:** 19 Oktober 2026  
> **Status:** Review Ulang & Siap Uji (PR Ditandai: BLOCKED untuk Multi-Item Checkout)

---

## 1. Prinsip Eksekusi (Ponytail Decision Ladder)
1. **YAGNI & Minimalis:** Manfaatkan standard library (`node:crypto` `createHash`, `timingSafeEqual`), standard React 19 hooks (`useId`), dan helper native tanpa dependensi berlebih.
2. **Pencegahan Regresi:** Setiap fix diverifikasi dengan `tsc --noEmit`, `vitest run`, dan `next build`.
3. **Pemisahan Risiko:**
   - **Fixed (Aman):** Runtime crash P0, rate limiting OTP, brute force attempt guard, secure devCode, DOKU timingSafeEqual signature check, WCAG touch target, hydration mismatch, dark mode token, offline sync lock.
   - **Needs Review (Blocker Fitur):** Pesanan multi-item pada model `Order` tanpa `OrderItem`.
4. **Modul Games:** Tidak tersentuh sama sekali.

---

## 2. Status Item Patch

| # | ID | Severity | Deskripsi Patch | File Terdampak | Status | Estimasi Risiko |
|---|---|---|---|---|---|---|
| 1 | **P0-BUILD-001** | P0 | Perbaiki crash runtime `sha256.create()` di helper DOKU | `src/lib/doku.ts` | **Fixed** | Sangat Rendah |
| 2 | **P0-BUILD-002** | P0 | Perbaiki icon FontAwesome `faShieldHalal` → `faShieldAlt` | `src/app/(marketing)/page.tsx` | **Fixed** | Nol |
| 3 | **P0-BUILD-003** | P0 | Dukungan Decimal pada `formatRupiah` & `formatWeight` | `src/lib/utils.ts`, `src/app/(marketing)/produk/[slug]/page.tsx` | **Fixed** | Sangat Rendah |
| 4 | **P0-CAT-001** | P0 | Perbaiki klausa filter Prisma untuk `purpose` katalog | `src/app/api/products/route.ts` | **Fixed** | Rendah |
| 5 | **P0-SEC-001** | P0 | Amankan `devCode` OTP agar tidak bocor di environment non-development | `src/app/api/otp/send/route.ts` | **Fixed** | Sangat Rendah |
| 6 | **P1-SEC-002** | P1 | Implementasikan rate limiting 60s pada pengiriman OTP via Redis | `src/lib/otp.ts`, `src/app/api/otp/send/route.ts` | **Fixed** | Rendah |
| 7 | **P1-SEC-003** | P1 | Tambahkan proteksi percobaan (max 5 attempt) brute force OTP | `src/lib/otp.ts`, `src/app/api/otp/verify/route.ts` | **Fixed** | Rendah |
| 8 | **P1-SEC-004** | P1 | Gunakan `crypto.timingSafeEqual` untuk signature webhook DOKU | `src/lib/doku.ts` | **Fixed** | Sangat Rendah |
| 9 | **P1-PAY-001** | P1 | Validasi stok atomik di dalam `$transaction` pada pembuatan pesanan | `src/app/api/orders/route.ts` | **Fixed** | Sedang |
| 10 | **P1-PAY-002** | P1 | Resiliensi webhook DOKU via `updateMany` atomik & try/catch WA notification | `src/app/api/doku/webhook/route.ts` | **Fixed** | Rendah |
| 11 | **P1-PAY-003** | P1 | Dukungan Multi-Item Order pada skema DB | `prisma/schema.prisma`, `src/app/api/orders/route.ts` | **BLOCKED** | Tinggi |
| 12 | **P1-SEC-005** | P1 | Verifikasi otorisasi sesi pada generate ulang pembayaran DOKU | `src/app/api/doku/create/route.ts` | **Fixed** | Rendah |
| 13 | **P1-UI-001** | P1 | Perbesar target sentuh tombol mobile ke standar WCAG (minimal 44x44px) | `src/components/layout/Header.tsx`, `src/components/layout/ThemeToggle.tsx` | **Fixed** | Sangat Rendah |
| 14 | **P1-UI-002** | P1 | Ganti `Math.random()` dengan `React.useId()` untuk mencegah hydration mismatch | `src/components/ui/input.tsx` | **Fixed** | Sangat Rendah |
| 15 | **P2-PWA-001** | P2 | Tambahkan guard `isFlushing` dan eliminasi 4xx pada offline sync | `src/hooks/useOfflineSync.ts` | **Fixed** | Rendah |
| 16 | **P2-UI-003** | P2 | Lengkapi dark mode utility classes pada badge, tabs list, dan skeleton | `src/components/ui/badge.tsx`, `src/components/ui/tabs.tsx`, `src/components/shared/LoadingSkeleton.tsx` | **Fixed** | Nol |

---

## 3. Justifikasi Status BLOCKER: Multi-Item Order (P1-PAY-003)

### Alasan Blocker:
1. **Ketiadaan Tabel Relasional `OrderItem`:** Skema database `Order` saat ini hanya menyimpan 1 baris `livestockId` dan `quantity`.
2. **Kehilangan Data Transaksi:** Jika pengguna memasukkan lebih dari satu jenis hewan qurban (misal 1 Sapi dan 1 Kambing) ke keranjang:
   - Total harga menjumlahkan kedua hewan (pengguna membayar penuh).
   - Kedua stok hewan berkurang di tabel `Livestock`.
   - Namun, hanya hewan pertama (`mainItem = input.items[0]`) yang tercatat di tabel `Order`.
   - Hewan kedua tidak tersimpan di database, tidak muncul di invoice `/pesanan/[id]`, tidak tercetak di sertifikat kurban, dan hilang dari manifes pengiriman kandang.
3. **Keputusan Rekomendasi:** 
   - Tandai PR sebagai **BLOCKED** untuk fitur multi-item checkout sampai migrasi database tabel `OrderItem` disetujui.
   - Alternatif mitigasi aman sementara: Aktifkan validasi penolakan checkout jika `input.items.length > 1` dengan pesan ramah agar pengguna memesan per ekor secara terpisah.

---

## 4. Strategi Pemecahan PR Berurutan (PR Decomposition)

Mengingat total baris modifikasi non-test > 300 baris, branch ini disarankan dipecah menjadi 4 Pull Request berurutan:

1. **PR 1: (a) Bugfix Runtime P0 & Build Stabilizers**
   - Perbaikan method `createHash` DOKU SNAP ([`src/lib/doku.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/lib/doku.ts))
   - Perbaikan icon `faShieldAlt` ([`src/app/(marketing)/page.tsx`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/app/(marketing)/page.tsx))
   - Penanganan Decimal Prisma pada formatRupiah ([`src/lib/utils.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/lib/utils.ts))
   - Perbaikan query purpose katalog ([`src/app/api/products/route.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/app/api/products/route.ts))
   - Eksklusi direktori usang `qurbanku/` di `tsconfig.json` & `.gitignore`

2. **PR 2: (b) Security & Resiliensi Auth/OTP/Payment**
   - Rate limiting Redis 60s & brute force protection 5 attempts ([`src/lib/otp.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/lib/otp.ts), [`src/app/api/otp/send/route.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/app/api/otp/send/route.ts), [`src/app/api/otp/verify/route.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/app/api/otp/verify/route.ts))
   - Proteksi devCode hanya di development mode
   - `crypto.timingSafeEqual` pada signature DOKU ([`src/lib/doku.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/lib/doku.ts))
   - Idempotensi webhook updateMany & try/catch WhatsApp notification ([`src/app/api/doku/webhook/route.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/app/api/doku/webhook/route.ts))

3. **PR 3: (c) Transaksi Checkout, Stok Atomik & Offline Sync**
   - Pengecekan stok atomik di dalam `$transaction` Prisma ([`src/app/api/orders/route.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/app/api/orders/route.ts))
   - Koreksi kuantitas line items DOKU per jenis hewan
   - Sinkronisasi tipe form checkout & auto-populate sesi user ([`src/components/checkout/CheckoutForm.tsx`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/components/checkout/CheckoutForm.tsx))
   - Guard `isFlushing` dan penanganan error 4xx pada offline sync ([`src/hooks/useOfflineSync.ts`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/hooks/useOfflineSync.ts))

4. **PR 4: (d) UI/UX, Aksesibilitas WCAG & Desain Dark Mode**
   - `React.useId()` pada form input ([`src/components/ui/input.tsx`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/components/ui/input.tsx))
   - Peningkatan target sentuh 44x44px pada header dan theme toggle ([`src/components/layout/Header.tsx`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/components/layout/Header.tsx), [`src/components/layout/ThemeToggle.tsx`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/components/layout/ThemeToggle.tsx))
   - Komposisi handler `onClick` pada `DialogTrigger` ([`src/components/ui/dialog.tsx`](file:///home/albet-surya-kembara/Documents/productivity/projects/qurbi/src/components/ui/dialog.tsx))
   - Penambahan dark mode utility tokens pada badge, tabs list, dan skeleton loader
