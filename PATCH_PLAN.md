# PATCH PLAN — QurbanKu (qurbi) Non-Games Audit

> **Branch:** `audit/qurbi-non-games-20261019`  
> **Tanggal:** 19 Oktober 2026  
> **Status:** Verifikasi Final Selesai (Siap Human Review dengan Item Blocked Tertentu)

---

## 1. Strategi Pemecahan PR Berurutan (PR Decomposition)

Berdasarkan `git diff --stat` yang melebihi 300 baris non-test, perbaikan didekomposisi ke dalam 4 Pull Request berurutan dengan branch lokal yang telah disiapkan:

| PR # | Nama Branch | Scope & Fokus Perbaikan | Status |
|---|---|---|---|
| **PR 1** | `pr/01-runtime-p0-build-fix` | Bugfix crash runtime DOKU SNAP `createHash`, missing FontAwesome icon `faShieldAlt`, Decimal formatting di utils, Prisma nested purpose filter query crash, dan eksklusi `qurbanku/` di tsconfig. | **Fixed & Tested** |
| **PR 2** | `pr/02-security-auth-otp` | Penguatan keamanan Auth & OTP (Redis rate limit 60s, brute force lockout 5 attempts, pembatasan devCode hanya di development, crypto timingSafeEqual signature DOKU, updateMany atomik & safe notification di webhook, pin version next-auth/core tanpa caret). | **Fixed & Tested** |
| **PR 3** | `pr/03-checkout-atomic-stock` | Pengecekan dan pengurangan stok atomik di dalam `$transaction` Prisma, perbaikan kuantitas line items DOKU per jenis hewan, auto-populate sesi user di CheckoutForm, dan guard `isFlushing` offline sync. | **Fixed & Tested** |
| **PR 4** | `pr/04-ui-ux-a11y` | Eliminasi hydration mismatch dengan `React.useId()`, pembesaran target sentuh tombol header ke 44x44px (WCAG 2.5.5), komposisi handler `onClick` pada `DialogTrigger`, dan kelengkapan utility classes dark mode. | **Fixed & Tested** |

---

## 2. Tabel Status Temuan P0/P1 & Pemetaan PR

| ID | Severity | Deskripsi Patch | File Terdampak | Status | Fixed in PR # / Note |
|---|---|---|---|---|---|
| **P0-BUILD-001** | P0 | Crash runtime `sha256.create()` di helper DOKU | `src/lib/doku.ts` | **Fixed** | Fixed in PR #1 (`pr/01-runtime-p0-build-fix`) |
| **P0-BUILD-002** | P0 | Compile error FontAwesome missing `faShieldHalal` | `src/app/(marketing)/page.tsx` | **Fixed** | Fixed in PR #1 (`pr/01-runtime-p0-build-fix`) |
| **P1-CAT-001** | P1 | Query purpose katalog Prisma nested object crash | `src/app/api/products/route.ts` | **Fixed** | Fixed in PR #1 (`pr/01-runtime-p0-build-fix`) |
| **P1-SEC-001** | P1 | Kebocoran `devCode` OTP jika env WA kosong | `src/app/api/otp/send/route.ts` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-002** | P1 | Rate limiting 60s pengiriman OTP via Redis | `src/lib/otp.ts`, `src/app/api/otp/send/route.ts` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-003** | P1 | Proteksi percobaan salah (max 5 attempt) brute force OTP | `src/lib/otp.ts`, `src/app/api/otp/verify/route.ts` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-004** | P1 | `crypto.timingSafeEqual` verifikasi signature DOKU | `src/lib/doku.ts` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-005** | P1 | Otorisasi sesi pemesan pada generate ulang pembayaran | `src/app/api/doku/create/route.ts` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-PAY-001** | P1 | Validasi stok atomik di dalam `$transaction` pesanan | `src/app/api/orders/route.ts` | **Fixed** | Fixed in PR #3 (`pr/03-checkout-atomic-stock`) |
| **P1-PAY-002** | P1 | Resiliensi webhook DOKU via `updateMany` & safe WhatsApp | `src/app/api/doku/webhook/route.ts` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-UI-001** | P1 | Perbesar target sentuh tombol mobile ke >= 44x44px | `src/components/layout/Header.tsx`, `src/components/layout/ThemeToggle.tsx` | **Fixed** | Fixed in PR #4 (`pr/04-ui-ux-a11y`) |
| **P1-UI-002** | P1 | Ganti `Math.random()` dengan `React.useId()` pada form input | `src/components/ui/input.tsx` | **Fixed** | Fixed in PR #4 (`pr/04-ui-ux-a11y`) |
| **SEC-AUTH-001** | P1 | Pin versi `next-auth` (5.0.0-beta.32) & `@auth/core` (0.41.3) | `package.json` | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-PAY-003** | P1 | Dukungan Multi-Item Order (Model tanpa `OrderItem`) | `prisma/schema.prisma` | **BLOCKED** | **BLOCKED Sub-Issue #1** (Butuh migrasi DB) |
| **SEC-AUTH-002** | P1 | Account Takeover via `allowDangerousEmailAccountLinking` | `src/auth.ts` | **BLOCKED** | **BLOCKED Sub-Issue #2** (Butuh flow OTP email) |
| **INF-DB-001** | P1 | Prisma/Neon connection pooling di environment serverless | `src/lib/prisma.ts` | **BLOCKED** | **BLOCKED Sub-Issue #3** (Butuh setting pooler Neon) |
| **INF-PWA-001** | P2 | Serwist cache invalidation & offline navigation fallback | `src/app/sw.ts` | **Deferred** | **Deferred Sub-Issue #4** (Sprint PWA Hardening) |

---

## 3. Rincian Sub-Issue BLOCKED & Deferred

### [BLOCKED Sub-Issue #1] Multi-Item Checkout (P1-PAY-003)
- **Status:** **BLOCKED**
- **Alasan:** Model `Order` di Prisma hanya menyimpan satu `livestockId`. Keranjang belanja yang berisi lebih dari satu hewan yang berbeda jenis akan memotong stok kedua hewan dan menagih totalnya, namun hanya mencatat hewan pertama di database. Hewan kedua hilang dari faktur, sertifikat, dan pengiriman.
- **Tindakan yang Diperlukan:** Buat migrasi Prisma untuk menambahkan relasi `model OrderItem { id String @id, orderId String, livestockId String, quantity Int, price Decimal }`. Sebelum migrasi ini dilakukan, checkout multi-hewan berbeda harus dibatasi.

### [BLOCKED Sub-Issue #2] OAuth Unverified Email Account Takeover (SEC-AUTH-002)
- **Status:** **BLOCKED**
- **Alasan:** `allowDangerousEmailAccountLinking: true` pada Google provider di `src/auth.ts:19` memungkinkan penyerang dengan akun Google ber-email sama mengambil alih akun pengguna yang memasukkan email secara manual saat guest checkout.
- **Tindakan yang Diperlukan:** Matikan opsi dangerous linking dan buat alur verifikasi dua arah (konfirmasi OTP WhatsApp terdaftar sebelum menautkan akun Google).

### [BLOCKED Sub-Issue #3] Neon Connection Pooling di Serverless (INF-DB-001)
- **Status:** **BLOCKED**
- **Alasan:** Singleton `globalThis` diabaikan pada mode production (`src/lib/prisma.ts`), sehingga lambda serverless dapat membuka koneksi baru setiap cold start.
- **Tindakan yang Diperlukan:** Konfigurasikan environment variable `DATABASE_URL` di dashboard hosting/Vercel agar mengarah ke endpoint PgBouncer Neon (port 6543 dengan `?pgbouncer=true`).

### [Deferred Sub-Issue #4] Serwist Offline Fallback & Client Reload Banner (INF-PWA-001)
- **Status:** **Deferred**
- **Alasan:** Rute `/offline` belum didaftarkan sebagai navigation fallback di `src/app/sw.ts`, dan reload prompt client-side belum dipasang.
- **Tindakan yang Diperlukan:** Jadwalkan pada sprint PWA hardening berikutnya agar tidak mengganggu precache manifest yang sudah aktif.
