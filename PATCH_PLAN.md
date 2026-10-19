# PATCH PLAN — QurbanKu (qurbi) Non-Games Audit

> **Branch:** `audit/qurbi-non-games-20261019`  
> **Tanggal:** 19 Oktober 2026  
> **Status:** Selesai & Terverifikasi

---

## Prinsip Eksekusi (Ponytail Decision Ladder)
1. **YAGNI & Minimalis:** Hindari abstraksi berlebihan. Manfaatkan React 19 standard hooks (`useId`), standard library `node:crypto` (`createHash`, `timingSafeEqual`), dan mekanisme native.
2. **Keamanan Tanpa Regresi:** Selesaikan akar penyebab crash runtime dan celah keamanan secara deterministik.
3. **Pemisahan Risiko:**
   - **Fixed (Aman):** Bug crash TypeScript/runtime, rate limiting OTP, brute-force lockout, devCode protection, crypto timing-safe check, touch target WCAG, hydration mismatch, dark mode tokens, offline sync guard.
   - **Fixed (Perlu Review Manual):** Validasi stok atomik di dalam `$transaction` pada `src/app/api/orders/route.ts`.
4. **Zero Impact on Games:** Modul games tidak disentuh sama sekali.

---

## Status Eksekusi Patch

| # | ID | Severity | Deskripsi Patch | File Terdampak | Status | Hasil Verifikasi |
|---|---|---|---|---|---|---|
| 1 | **BUILD-001** | P0 | Perbaiki crash runtime import `sha256` dari `node:crypto` → `createHash` | `src/lib/doku.ts` | **Fixed** | Lolos compile & build |
| 2 | **BUILD-002** | P0 | Perbaiki icon FontAwesome `faShieldHalal` → `faShieldAlt` | `src/app/(marketing)/page.tsx` | **Fixed** | Lolos compile & build |
| 3 | **BUILD-003** | P0 | Dukungan tipe Decimal pada `formatRupiah` & `formatWeight` | `src/lib/utils.ts`, `src/app/(marketing)/produk/[slug]/page.tsx` | **Fixed** | Lolos compile & build |
| 4 | **BUILD-004** | P0 | Sinkronisasi tipe zodResolver pada CheckoutForm & checkout validator | `src/lib/validators/checkout.ts`, `src/components/checkout/CheckoutForm.tsx` | **Fixed** | Lolos compile & build |
| 5 | **BUILD-005** | P0 | Perbaiki form array gambar di admin produk menggunakan watch/setValue | `src/app/(app)/admin/produk/page.tsx` | **Fixed** | Lolos compile & build |
| 6 | **BUILD-006** | P1 | Tangani `null` phone pada `useMyOrders` & DOKU create email | `src/app/(app)/pesanan/page.tsx`, `src/app/api/doku/create/route.ts` | **Fixed** | Lolos compile & build |
| 7 | **CAT-001** | P0 | Perbaiki klausa filter Prisma untuk `purpose` produk (QURBAN/AQIQAH/BOTH) | `src/app/api/products/route.ts` | **Fixed** | Lolos compile & build |
| 8 | **SEC-001** | P0 | Implementasikan rate limiting 60s pada pengiriman OTP via Redis | `src/lib/otp.ts`, `src/app/api/otp/send/route.ts` | **Fixed** | Lolos compile & build |
| 9 | **SEC-002** | P0 | Tambahkan proteksi percobaan (max 5 attempt) brute force OTP | `src/lib/otp.ts`, `src/app/api/otp/verify/route.ts` | **Fixed** | Lolos compile & build |
| 10 | **SEC-003** | P0 | Amankan `devCode` agar tidak bocor di production environment | `src/app/api/otp/send/route.ts` | **Fixed** | Lolos compile & build |
| 11 | **PAY-002** | P0 | Gunakan `crypto.timingSafeEqual` untuk verifikasi signature webhook DOKU | `src/lib/doku.ts` | **Fixed** | Lolos compile & build |
| 12 | **SEC-006** | P1 | Bersihkan OTP dan attempt counter saat verifikasi berhasil | `src/lib/otp.ts` | **Fixed** | Lolos compile & build |
| 13 | **UI-002** | P1 | Ganti `Math.random()` dengan `React.useId()` pada form input | `src/components/ui/input.tsx` | **Fixed** | Lolos compile & build |
| 14 | **UI-001** | P1 | Perbesar touch target tombol mobile menjadi minimal 44x44px | `src/components/layout/Header.tsx`, `src/components/layout/ThemeToggle.tsx` | **Fixed** | Lolos compile & build |
| 15 | **A11Y-001** | P1 | Komposisi `onClick` pada `DialogTrigger` dan atribut aksesibilitas | `src/components/ui/dialog.tsx` | **Fixed** | Lolos compile & build |
| 16 | **PWA-001** | P1 | Tambahkan guard `isFlushing` dan penanganan error 4xx pada offline sync | `src/hooks/useOfflineSync.ts` | **Fixed** | Lolos compile & build |
| 17 | **PAY-004** | P1 | Tambahkan try/catch pada notifikasi webhook DOKU & updateMany atomik | `src/app/api/doku/webhook/route.ts` | **Fixed** | Lolos compile & build |
| 18 | **SEC-007** | P1 | Error handling parsing JSON pada API endpoints | `src/app/api/otp/send/route.ts`, `src/app/api/otp/verify/route.ts` | **Fixed** | Lolos compile & build |
| 19 | **UI-003** | P2 | Lengkapi dark mode token untuk `badge neutral`, `tabs list`, dan filter | `src/components/ui/badge.tsx`, `src/components/ui/tabs.tsx`, `src/components/shared/LoadingSkeleton.tsx` | **Fixed** | Lolos compile & build |
| 20 | **PAY-003** | P0 | Validasi stok atomik di dalam `$transaction` pesanan + perbaikan kuantitas DOKU | `src/app/api/orders/route.ts` | **Fixed (Perlu Review Manual)** | Lolos compile & build |

---

## Verifikasi Baseline
- **Typecheck:** `npx tsc --noEmit` → **0 errors** (lulus tanpa error)
- **Production Build:** `npm run build` → **22/22 routes tergenerasi sukses** (lulus tanpa error)
