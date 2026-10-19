# AUDIT REPORT — QurbanKu (qurbi) Non-Games

> **Branch:** `audit/qurbi-non-games-20261019`  
> **Tanggal Audit:** 19 Oktober 2026  
> **Auditor:** Senior AI Coding Agent (Orkestrasi: Ponytail Framework)  
> **Target Repo:** https://github.com/albetsurya/qurbi  
> **Scope:** Seluruh modul non-games (Auth, OTP, Pembayaran, Checkout, Data Layer, Serwist/PWA, UI/UX, Aksesibilitas, State)  
> **Excluded:** Fitur/games (tidak ada folder/fitur games terdeteksi di repo ini)

---

## 1. Kriteria Severity & Re-evaluasi

Sesuai kriteria keputusan go-live (apakah aplikasi dapat di-deploy tanpa memicu crash server, kerugian finansial langsung, atau kehilangan data transaksi?):

| Severity | Definisi & Kriteria | Dampak Terhadap Go-Live |
|---|---|---|
| **P0 (Kritis)** | Bug yang menyebabkan crash runtime total pada alur utama, kegagalan build/kompilasi, bypass autentikasi langsung tanpa syarat, atau kebocoran data rahasia/OTP secara terbuka tanpa proteksi. | **Blocker Go-Live Mutlak** — Sistem tidak boleh dirilis ke publik sebelum diperbaiki. |
| **P1 (Tinggi)** | Celah keamanan serius (Account Takeover, timing attack, race condition transaksi uang/stok, ketiadaan rate limit), ketergantungan library rentan CVE, atau kegagalan relasional data yang menimbulkan sengketa transaksi. | **Sangat Direkomendasikan Diperbaiki Sebelum Publik** — Dapat dirilis hanya dengan mitigasi sementara / feature flag. |
| **P2 (Sedang)** | Inkonsistensi fungsional, query filter/sorting tidak optimal, ketiadaan offline fallback PWA, inkonsistensi dark mode token, atau potensi memory/connection exhaustion jangka panjang. | **Non-Blocker** — Dapat diperbaiki pada siklus rilis berikutnya. |
| **P3 (Rendah)** | Minor code smell, format label, touch target kecil di area sekunder, atau optimasi kecil tanpa dampak bisnis langsung. | **Backlog Pemeliharaan**. |

> **Catatan Re-evaluasi P0 ke P1:**  
> Tiga temuan P0 sebelumnya (`CAT-001` Prisma purpose filter, `SEC-001` OTP devCode leak, dan `PAY-003` stock race condition) telah di-reevaluasi dan disesuaikan menjadi **P1 (Tinggi)** karena:
> 1. Filter katalog `purpose` hanya berdampak jika user mengklik filter tujuan spesifik, halaman utama default tanpa filter tetap berjalan.
> 2. `devCode` hanya bocor jika `WHATSAPP_API_URL` tidak dikonfigurasi di environment production (bukan celah unconditional).
> 3. Race condition stok hanya termanifestasi pada konkurensi checkout simultan tinggi (edge case konkurensi).  
> Hanya dua temuan yang tetap **P0 (Kritis)**: `BUILD-001` (crash runtime `sha256.create()` yang melumpuhkan semua pembayaran DOKU) dan `BUILD-002` (icon `faShieldHalal` yang menggagalkan proses build `npm run build`).

---

## 2. Tabel Pemetaan Temuan P0 & P1 (Fixed in PR / Deferred / BLOCKED)

| ID | Severity | Kategori | Ringkasan Temuan | Status | Fixed in PR # / Note |
|---|---|---|---|---|---|
| **P0-BUILD-001** | P0 | Bug-Keamanan | Runtime crash DOKU SNAP `sha256.create()` | **Fixed** | Fixed in PR #1 (`pr/01-runtime-p0-build-fix`) |
| **P0-BUILD-002** | P0 | Bug-Keamanan | Compile error FontAwesome missing `faShieldHalal` | **Fixed** | Fixed in PR #1 (`pr/01-runtime-p0-build-fix`) |
| **P1-CAT-001** | P1 | Bug-Keamanan | Query purpose katalog Prisma nested object crash | **Fixed** | Fixed in PR #1 (`pr/01-runtime-p0-build-fix`) |
| **P1-SEC-001** | P1 | Bug-Keamanan | Kebocoran `devCode` OTP jika env WA kosong | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-002** | P1 | Bug-Keamanan | Ketiadaan rate limiting pengiriman OTP | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-003** | P1 | Bug-Keamanan | Ketiadaan proteksi brute-force verifikasi OTP | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-004** | P1 | Bug-Keamanan | Timing attack signature verification DOKU | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-SEC-005** | P1 | Bug-Keamanan | Ketiadaan otorisasi generate ulang pembayaran | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-PAY-001** | P1 | Mekanisme | Race condition pengurangan stok saat checkout paralel | **Fixed** | Fixed in PR #3 (`pr/03-checkout-atomic-stock`) |
| **P1-PAY-002** | P1 | Mekanisme | Webhook DOKU 500 retry jika WA gateway down | **Fixed** | Fixed in PR #2 (`pr/02-security-auth-otp`) |
| **P1-PAY-003** | P1 | Mekanisme | Model `Order` tanpa `OrderItem` (Multi-Item Checkout) | **BLOCKED** | **BLOCKED** (Butuh migrasi skema tabel `OrderItem`) |
| **P1-UI-001** | P1 | UI-UX | Target sentuh mobile < 44x44px (WCAG 2.5.5) | **Fixed** | Fixed in PR #4 (`pr/04-ui-ux-a11y`) |
| **P1-UI-002** | P1 | UI-UX | Hydration mismatch form input akibat `Math.random()` | **Fixed** | Fixed in PR #4 (`pr/04-ui-ux-a11y`) |
| **SEC-AUTH-001** | P1 | Bug-Keamanan | Versi `next-auth` rentan CVE-2026-64646 (<beta.32) | **Fixed** | Fixed in PR #2 (Pin versi `5.0.0-beta.32` di package.json) |
| **SEC-AUTH-002** | P1 | Bug-Keamanan | Account Takeover via `allowDangerousEmailAccountLinking` | **BLOCKED** | **BLOCKED** (Butuh alur verifikasi dua arah OTP sebelum link) |
| **INF-DB-001** | P1 | Bug-Keamanan | Prisma/Neon connection pooling di serverless | **BLOCKED** | **BLOCKED** (Butuh konfigurasi Neon `-pooler` di deployment) |
| **INF-PWA-001** | P2 | Mekanisme | Serwist cache invalidation & missing offline fallback | **Deferred** | **Deferred** (Dijadwalkan untuk rilis PWA hardening berikutnya) |

---

## 3. Temuan Kepatuhan Dependensi & Konfigurasi Lanjutan

### [SEC-AUTH-001] Versi `next-auth` & `@auth/core` vs CVE-2026-64646
- **Kategori:** Bug-Keamanan
- **Severity:** P1 (Tinggi)
- **Lokasi:** `package.json:29`
- **Bukti:** `package.json` sebelumnya memuat `"next-auth": "^5.0.0-beta.25"`. Walaupun `package-lock.json` mengunci ke `5.0.0-beta.32`, penggunaan caret `^` berisiko mengunduh rilis beta di bawah `beta.32` yang memiliki kerentanan auth bypass middleware (CVE-2026-64646).
- **Dampak:** Bypass middleware auth pada edge runtime jika dependensi diinstall ulang tanpa lockfile yang sesuai.
- **Rekomendasi:** Hapus tanda caret dan pin versi persis: `"next-auth": "5.0.0-beta.32"`, `"@auth/core": "0.41.3"`.
- **Status:** Fixed (PR #2)

### [SEC-AUTH-002] Risiko Account Takeover via `allowDangerousEmailAccountLinking: true`
- **Kategori:** Bug-Keamanan
- **Severity:** P1 (Tinggi)
- **Lokasi:** `src/auth.ts:19`, `src/auth.ts:53-75`
- **Bukti:** `Google({ clientId, clientSecret, allowDangerousEmailAccountLinking: true })`. Pada callback `signIn`, pengguna yang login dengan Google otomatis ditautkan ke record `User` di DB hanya berdasarkan kecocokan string `email` tanpa verifikasi kepemilikan sebelumnya.
- **Dampak:** Jika seorang korban memasukkan email saat guest checkout tanpa mendaftar sandi/OTP, penyerang dengan akun Google ber-email sama dapat login dan mengambil alih akun serta hak akses (`ADMIN`/riwayat pesanan) korban.
- **Rekomendasi:** Matikan `allowDangerousEmailAccountLinking: true` dan wajibkan verifikasi OTP WhatsApp sebelum mengizinkan penautan akun Google.
- **Status:** **BLOCKED** (Memerlukan keputusan produk & alur UI/UX verifikasi tambahan)

### [INF-DB-001] Prisma / Neon Connection Pooling pada Lingkungan Serverless
- **Kategori:** Bug-Keamanan
- **Severity:** P1 (Tinggi)
- **Lokasi:** `src/lib/prisma.ts:1-10` & `prisma/schema.prisma:5-9`
- **Bukti:** Instance `PrismaClient` diinstansiasi dengan singleton `globalThis` yang hanya aktif di `development`. Di lingkungan serverless production (Vercel), setiap cold start membuat koneksi baru. Jika `DATABASE_URL` tidak mengarah ke port PgBouncer 6543 / endpoint `-pooler` Neon dengan `?pgbouncer=true`, batas koneksi database dapat habis saat lonjakan traffic.
- **Dampak:** `Max client connections reached` (HTTP 500) saat traffic ramai.
- **Rekomendasi:** Pastikan environment variable `DATABASE_URL` di production menggunakan Neon pooled connection string.
- **Status:** **BLOCKED** (Memerlukan verifikasi & pembaruan environment variable di dashboard hosting/Vercel)

### [INF-PWA-001] Serwist Offline Fallback & Cache Invalidation
- **Kategori:** Mekanisme
- **Severity:** P2 (Sedang)
- **Lokasi:** `src/app/sw.ts:16-44`
- **Bukti:** Serwist mengaktifkan `skipWaiting: true` dan `clientsClaim: true`, namun tidak mendaftarkan `fallbacks: { entries: [{ url: '/offline' }] }` padahal route `/offline` tersedia.
- **Dampak:** Pengguna yang offline dan membuka halaman baru mendapatkan error browser "No Internet" alih-alih UI `/offline`.
- **Rekomendasi:** Konfigurasikan fallback navigasi dan client-side reload prompt.
- **Status:** **Deferred** (Dijadwalkan untuk sprint PWA berikutnya)

---

## 4. Rincian Temuan Utama

### [P0-BUILD-001] Runtime Crash DOKU SNAP `sha256.create()`
- **Kategori:** Bug-Keamanan
- **Severity:** P0 (Kritis)
- **Lokasi:** `src/lib/doku.ts:1, 72-73`
- **Bukti:** `import { createHmac, randomUUID, sha256 } from "node:crypto";` dan `sha256.create().update(rawBody).digest("base64")`. Method `sha256.create()` tidak ada di Node.js standard library.
- **Dampak:** Transaksi pembayaran DOKU dan webhook crash total dengan runtime error `TypeError: sha256.create is not a function`.
- **Rekomendasi:** Gunakan `createHash("sha256")`.
- **Status:** Fixed (PR #1)

### [P0-BUILD-002] Compile Error FontAwesome `faShieldHalal`
- **Kategori:** Bug-Keamanan
- **Severity:** P0 (Kritis)
- **Lokasi:** `src/app/(marketing)/page.tsx:6`
- **Bukti:** `faShieldHalal` tidak terdefinisi di `@fortawesome/free-solid-svg-icons`.
- **Dampak:** `npm run build` dan `npx tsc --noEmit` gagal total (TS2724).
- **Rekomendasi:** Ganti dengan `faShieldAlt`.
- **Status:** Fixed (PR #1)

### [P1-PAY-003] Multi-Item Order Tanpa Tabel `OrderItem` (BLOCKER)
- **Kategori:** Mekanisme
- **Severity:** P1 (Tinggi / **BLOCKER FOR MULTI-ITEM CHECKOUT**)
- **Lokasi:** `src/app/api/orders/route.ts:50, 72` & `prisma/schema.prisma:98-124`
- **Bukti:** Model Prisma `Order` hanya memiliki kolom tunggal `livestockId` dan `quantity`. Keranjang belanja yang berisi > 1 jenis hewan qurban memotong stok kedua hewan dan menagih total harga keduanya, namun hanya mencatat hewan pertama di database.
- **Dampak:** Hewan kedua hilang dari faktur `/pesanan/[id]`, sertifikat kurban, dan surat jalan pengiriman daging.
- **Rekomendasi:** Batasi checkout hanya untuk 1 jenis hewan qurban per transaksi atau buat tabel relasi `OrderItem` via migrasi database.
- **Status:** **BLOCKED** (Fitur multi-item ditandai BLOCKED sampai skema database diperbarui)

---

## 5. Ringkasan Pengujian Otomatis

- **Test Suite:** 5 file, 16 unit & integration tests (`npm test` via Vitest) — **100% PASS** (240ms).
- **E2E Flow:** 1 integration test alur penuh `Guest Checkout → PENDING → DOKU Webhook → PAID` — **PASS**.
- **Typecheck:** `npx tsc --noEmit` — **0 errors**.
- **Build:** `npm run build` — **22/22 routes tergenerasi sukses**.
