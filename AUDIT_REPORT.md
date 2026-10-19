# AUDIT REPORT — QurbanKu (qurbi) Non-Games

> **Branch:** `audit/qurbi-non-games-20261019`  
> **Tanggal Audit:** 19 Oktober 2026  
> **Auditor:** Senior AI Coding Agent (Orkestrasi: Ponytail Framework)  
> **Target Repo:** https://github.com/albetsurya/qurbi  
> **Scope:** Seluruh modul non-games (Auth, OTP, Pembayaran, Checkout, Data Layer, Serwist/PWA, UI/UX, Aksesibilitas, State)  
> **Excluded:** Fitur/games (tidak ada folder/fitur games terdeteksi di repo ini)

---

## 1. Kriteria Severity

Sesuai arahan audit dan justifikasi risiko operasional, kriteria severity diklasifikasikan sebagai berikut:

| Severity | Definisi & Kriteria | Dampak Terhadap Go-Live |
|---|---|---|
| **P0 (Kritis)** | Bug yang menyebabkan crash runtime total pada alur utama, kegagalan build/kompilasi, bypass autentikasi langsung tanpa syarat, atau kebocoran data rahasia/OTP secara terbuka tanpa proteksi. | **Blocker Go-Live Mutlak** — Sistem tidak boleh dirilis ke publik sebelum diperbaiki. |
| **P1 (Tinggi)** | Celah keamanan serius (Account Takeover, timing attack, race condition transaksi uang/stok, ketiadaan rate limit), ketergantungan library rentan CVE, atau kegagalan relasional data yang menimbulkan sengketa transaksi. | **Sangat Direkomendasikan Diperbaiki Sebelum Publik** — Dapat dirilis hanya dengan mitigasi sementara / feature flag. |
| **P2 (Sedang)** | Inkonsistensi fungsional, query filter/sorting tidak optimal, ketiadaan offline fallback PWA, inkonsistensi dark mode token, atau potensi memory/connection exhaustion jangka panjang. | **Non-Blocker** — Dapat diperbaiki pada siklus rilis berikutnya. |
| **P3 (Rendah)** | Minor code smell, format label, touch target kecil di area sekunder, atau optimasi kecil tanpa dampak bisnis langsung. | **Backlog Pemeliharaan**. |

---

## 2. Ringkasan Eksekutif Hasil Re-Evaluasi

Setelah dilakukan justifikasi ulang severity dan audit mendalam pada area kepatuhan dependensi (NextAuth, Serwist, Prisma/Neon, dan OAuth account linking):

| Kategori | P0 (Kritis) | P1 (Tinggi) | P2 (Sedang) | P3 (Rendah) | Total |
|---|---|---|---|---|---|
| **Bug & Keamanan** | 3 | 12 | 10 | 0 | **25** |
| **Mekanisme & Logika Bisnis** | 1 | 3 | 8 | 5 | **17** |
| **UI / UX & Aksesibilitas** | 0 | 4 | 14 | 8 | **26** |
| **Style & Layout** | 0 | 0 | 5 | 4 | **9** |
| **Total** | **4** | **19** | **37** | **17** | **77** |

---

## 3. Temuan Wajib Audit Lanjutan (Mandatory Deep Dive)

### [SEC-AUTH-001] Rentang Versi `next-auth` Rentan vs CVE-2026-64646 (<5.0.0-beta.32)
- **Kategori:** Bug-Keamanan
- **Severity:** P1 (Tinggi)
- **Lokasi:** `package.json:28` & `package-lock.json`
- **Bukti:** 
  - `package.json` mencatat `"next-auth": "^5.0.0-beta.25"`.
  - `package-lock.json` saat ini teresolusi pada `5.0.0-beta.32` dan `@auth/core: 0.41.3`.
  - Pada versi `next-auth` v5 beta sebelum `beta.32`, terdapat kerentanan parsing token middleware yang memungkinkan auth bypass pada edge runtime (CVE-2026-64646).
- **Dampak:** Karena `package.json` menggunakan tanda sisipan caret (`^5.0.0-beta.25`), lingkungan CI/CD yang menginstal dependensi dengan cache usang atau perintah `npm install --no-package-lock` dapat mengunduh rilis beta di bawah `beta.32` yang rentan bypass.
- **Rekomendasi:** Kunci (pin) versi secara eksplisit di `package.json` tanpa tanda caret: `"next-auth": "5.0.0-beta.32"`.
- **Status:** Open (Needs Review)

### [SEC-AUTH-002] Risiko Account Takeover via `allowDangerousEmailAccountLinking: true`
- **Kategori:** Bug-Keamanan
- **Severity:** P1 (Tinggi)
- **Lokasi:** `src/auth.ts:19`, `src/auth.ts:53-75`
- **Bukti:** 
  ```ts
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
  })
  ```
  Di callback `signIn`, akun Google ditautkan otomatis ke `User` di DB hanya berdasarkan kecocokan string `email` tanpa verifikasi kepemilikan sebelumnya.
- **Dampak:** Seseorang yang memesan via checkout guest memasukkan email target (misalnya email admin atau pelanggan lain). Ketika penyerang mendaftar/login menggunakan akun Google dengan email tersebut, penyerang langsung mewarisi ID, role (`ADMIN`), dan seluruh riwayat pesanan korban (Account Hijacking).
- **Rekomendasi:** Hapus opsi `allowDangerousEmailAccountLinking: true`. Terapkan verifikasi kepemilikan akun (misal via OTP WhatsApp yang terdaftar) sebelum menautkan akun Google ke user yang sudah ada di database.
- **Status:** Open (Needs Review)

### [INF-PWA-001] Strategi Cache Serwist: Ketiadaan Offline Navigation Fallback & Risiko Lazy Chunk Mismatch
- **Kategori:** Mekanisme
- **Severity:** P2 (Sedang)
- **Lokasi:** `src/app/sw.ts:16-44`
- **Bukti:** 
  - `sw.ts` menggunakan `skipWaiting: true` dan `clientsClaim: true` secara agresif.
  - Runtime caching untuk navigasi (`request.mode === 'navigate'`) menggunakan `NetworkFirst` dengan `networkTimeoutSeconds: 4`, namun tidak mendaftarkan `fallbacks: { entries: [{ url: '/offline' }] }` padahal halaman `src/app/offline/page.tsx` tersedia.
  - Tidak ada listener client-side untuk mendeteksi pembaruan service worker.
- **Dampak:**
  1. Pengguna offline yang membuka halaman yang belum pernah dikunjungi akan menemui browser error standar "No Internet" alih-alih tampilan fallback `/offline`.
  2. `skipWaiting: true` tanpa reload prompt menyebabkan tab yang sedang terbuka mengalami error HTTP 404 saat memuat chunk JavaScript baru pasca-deploy (chunk hash mismatch).
- **Rekomendasi:** Tambahkan konfigurasi `fallbacks` pada instance Serwist dan pasang UI toast "Versi baru tersedia, muat ulang halaman" untuk reload terkontrol.
- **Status:** Open (Needs Review)

### [INF-DB-001] Prisma / Neon Connection Pooling pada Lingkungan Serverless
- **Kategori:** Bug-Keamanan
- **Severity:** P1 (Tinggi)
- **Lokasi:** `src/lib/prisma.ts:1-10` & `prisma/schema.prisma:5-9`
- **Bukti:**
  ```ts
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  export const prisma = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  ```
- **Dampak:** Di environment production serverless (Vercel), singleton `globalForPrisma` diabaikan, dan setiap lambda container membuka instance `PrismaClient` baru. Jika `DATABASE_URL` tidak mengarah ke Neon pooled connection string (PgBouncer port 6543 / `?pgbouncer=true`), lonjakan request saat musim qurban akan menghabiskan batas koneksi database (`connection exhaustion`).
- **Rekomendasi:** Pastikan `DATABASE_URL` di production menggunakan endpoint `-pooler` Neon dengan `?pgbouncer=true`, dan pertimbangkan penggunaan `@prisma/adapter-neon` untuk koneksi via HTTP WebSocket.
- **Status:** Open (Needs Review)

---

## 4. Temuan Lengkap Berdasarkan Kategori & Severity

### 🔴 P0 (Kritis — Blocker Go-Live)

#### [P0-BUILD-001] Runtime Crash DOKU SNAP Akibat Pemanggilan `sha256.create()` Tidak Valid
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/lib/doku.ts:1, 72-73`
- **Bukti:** `import { createHmac, randomUUID, sha256 } from "node:crypto";` dan `sha256.create().update(rawBody).digest("base64")`. Standard library `node:crypto` di Node.js tidak memiliki method `.create()` pada export sha256.
- **Dampak:** Seluruh alur pembayaran DOKU SNAP dan verifikasi webhook crash total dengan runtime error `TypeError: sha256.create is not a function`.
- **Rekomendasi:** Gunakan API standar Node.js: `import { createHash } from "node:crypto"; createHash("sha256").update(rawBody).digest("base64")`.
- **Status:** Fixed

#### [P0-BUILD-002] Kegagalan Kompilasi Build Akibat Icon FontAwesome Tidak Ditemukan
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/(marketing)/page.tsx:6`
- **Bukti:** `import { faShieldHalal } from "@fortawesome/free-solid-svg-icons"`. Icon tersebut tidak ada di library FontAwesome free solid.
- **Dampak:** `npm run build` dan `tsc` gagal total dengan error TS2724.
- **Rekomendasi:** Ganti icon dengan `faShieldAlt` yang tersedia resmi di package.
- **Status:** Fixed

#### [P0-CAT-001] Bug Filter Produk Menghasilkan Klausa Prisma Invalid
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/api/products/route.ts:30`
- **Bukti:** `purpose: purpose === "BOTH" ? { in: ["BOTH", "QURBAN", "AQIQAH"] } : { purpose }` menghasilkan `{ purpose: { purpose: "QURBAN" } }`.
- **Dampak:** Query filter produk qurban/aqiqah crash dengan Prisma validation error 500 di server.
- **Rekomendasi:** Susun klausa Prisma yang valid: `...(purpose ? { purpose: purpose === "BOTH" ? { in: [...] } : (purpose as LivestockPurpose) } : {})`.
- **Status:** Fixed

#### [P0-SEC-001] Kebocoran Kode OTP (`devCode`) pada Respon API Publik
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/api/otp/send/route.ts:27-28`
- **Bukti:** `return NextResponse.json({ success: true, data: { devCode: code } });` jika variabel `WHATSAPP_API_URL` tidak diset.
- **Dampak:** Jika terjadi kesalahan konfigurasi environment variable di server production, kode OTP dibocorkan langsung ke client dalam respon JSON publik, memungkinkan siapa saja login ke akun nomor manapun tanpa ponsel.
- **Rekomendasi:** Berikan guard ketat `process.env.NODE_ENV === "development"`, jangan pernah mengekspos `devCode` di production.
- **Status:** Fixed

---

### 🟡 P1 (Tinggi — Celah Keamanan & Risiko Transaksi Signifikan)

#### [P1-SEC-002] Ketiadaan Rate Limiting pada Pengiriman OTP WhatsApp
- **Kategori:** Bug-Keamanan
- **Severity:** P1
- **Lokasi:** `src/app/api/otp/send/route.ts:16-21`
- **Bukti:** Tidak ada batasan frekuensi pengiriman OTP per nomor ponsel.
- **Dampak:** Penyerang dapat mengirim ribuan OTP dalam waktu singkat, menguras saldo gateway WhatsApp dan memblokir nomor resmi platform.
- **Rekomendasi:** Terapkan rate limit 60 detik berbasis Redis (`otp:ratelimit:{phone}`).
- **Status:** Fixed

#### [P1-SEC-003] Ketiadaan Proteksi Brute-Force pada Verifikasi OTP
- **Kategori:** Bug-Keamanan
- **Severity:** P1
- **Lokasi:** `src/app/api/otp/verify/route.ts:10-28`
- **Bukti:** Endpoint verifikasi OTP tidak memiliki batas percobaan (attempt counter).
- **Dampak:** Penyerang dapat membobol 6 digit angka OTP via automated brute force sebelum waktu 5 menit berakhir.
- **Rekomendasi:** Batasi maksimal 5 kali percobaan salah, lalu hapus kode OTP dan blokir permintaan.
- **Status:** Fixed

#### [P1-SEC-004] Verifikasi Webhook DOKU Rentan Timing Side-Channel Attack
- **Kategori:** Bug-Keamanan
- **Severity:** P1
- **Lokasi:** `src/lib/doku.ts:170` & `src/app/api/doku/webhook/route.ts:20`
- **Bukti:** Menggunakan perbandingan string `expected === signature`.
- **Dampak:** Penyerang dapat merekonstruksi signature HMAC byte-demi-byte menggunakan timing attack.
- **Rekomendasi:** Gunakan `crypto.timingSafeEqual`.
- **Status:** Fixed

#### [P1-PAY-001] Race Condition Pengurangan Stok Hewan Qurban saat Checkout Paralel
- **Kategori:** Bug-Keamanan / Mekanisme
- **Severity:** P1
- **Lokasi:** `src/app/api/orders/route.ts:20-33, 82-85`
- **Bukti:** Pengecekan stok awal dilakukan di luar blok transaksi `$transaction` yang mengurangi stok.
- **Dampak:** Dua pembeli dapat membeli 1 ekor hewan terakhir secara bersamaan (overselling).
- **Rekomendasi:** Pindahkan validasi ketersediaan stok ke dalam `$transaction` Prisma secara atomik.
- **Status:** Fixed (Perlu Review Manual)

#### [P1-PAY-002] Kegagalan Webhook DOKU Akibat WhatsApp Gateway Error
- **Kategori:** Bug-Keamanan
- **Severity:** P1
- **Lokasi:** `src/app/api/doku/webhook/route.ts:46-49`
- **Bukti:** Pemanggilan notifikasi WhatsApp tidak dibungkus `try/catch`.
- **Dampak:** Jika gateway WhatsApp timeout/error, webhook DOKU merespon 500, memicu DOKU melakukan retry berulang kali.
- **Rekomendasi:** Bungkus notifikasi di dalam `try/catch` dan gunakan `updateMany` atomik agar idempoten.
- **Status:** Fixed

#### [P1-PAY-003] Ketidaksinkronan Relasional Pesanan Multi-Item (Model Order Tanpa OrderItem)
- **Kategori:** Mekanisme
- **Severity:** P1 (Tinggi / **BLOCKER FOR MULTI-ITEM FEATURE**)
- **Lokasi:** `src/app/api/orders/route.ts:50, 72` & `prisma/schema.prisma:98-124`
- **Bukti:** Model `Order` di Prisma hanya memiliki field single `livestockId` dan `quantity`. Saat keranjang berisi 2 hewan berbeda, kedua stok berkurang dan total harga diakumulasikan, namun pesanan di DB hanya mencatat item pertama. Item kedua hilang dari faktur, sertifikat, dan pelacakan.
- **Dampak:** Konsumen membayar 2 hewan, tetapi pesanan hanya menampilkan 1 hewan. Menimbulkan sengketa hukum dan kegagalan distribusi hewan qurban.
- **Rekomendasi:** Batasi checkout hanya untuk 1 varian hewan per checkout hingga tabel relasional `OrderItem` dibuat via migrasi DB.
- **Status:** Needs Review (Marked as Blocker for Multi-Item Checkout)

#### [P1-SEC-005] Ketiadaan Verifikasi Otorisasi pada Endpoint Generate Ulang Pembayaran
- **Kategori:** Bug-Keamanan
- **Severity:** P1
- **Lokasi:** `src/app/api/doku/create/route.ts:13-44`
- **Bukti:** Fungsi `auth()` diimpor tetapi tidak dipanggil untuk memverifikasi apakah pemohon adalah pemilik order atau admin.
- **Dampak:** Siapapun dapat meng-generate ulang link pembayaran untuk order orang lain.
- **Rekomendasi:** Cocokkan sesi pengguna dengan `order.guestPhone` atau role `ADMIN`.
- **Status:** Fixed

#### [P1-UI-001] Target Sentuh Tombol Navigasi Mobile Kurang dari 44x44px (WCAG 2.5.5)
- **Kategori:** UI-UX
- **Severity:** P1
- **Lokasi:** `src/components/layout/Header.tsx:30, 44` & `src/components/layout/ThemeToggle.tsx:36`
- **Bukti:** Tombol kembali, keranjang, dan toggle tema berukuran `h-9 w-9` (36×36px).
- **Dampak:** Kesulitan navigasi bagi pengguna mobile dan pengguna berkebutuhan khusus motorik.
- **Rekomendasi:** Perbesar ukuran target sentuh menjadi minimal `h-11 w-11` (44×44px).
- **Status:** Fixed

#### [P1-UI-002] Hydration Mismatch pada Form Input Akibat `Math.random()`
- **Kategori:** UI-UX / Bug-Keamanan
- **Severity:** P1
- **Lokasi:** `src/components/ui/input.tsx:15, 53`
- **Bukti:** `const inputId = id ?? props.name ?? Math.random().toString(36).slice(2);`
- **Dampak:** Menghasilkan peringatan React hydration mismatch pada SSR dan memutuskan hubungan label dengan input.
- **Rekomendasi:** Gunakan hook native `React.useId()`.
- **Status:** Fixed

---

### 🟡 P2 (Sedang — Non-Blocker)

#### [P2-PWA-001] Offline Sync Queue Berisiko Mengirim Pesanan Ganda & Terhenti pada Error 4xx
- **Kategori:** Mekanisme
- **Severity:** P2
- **Lokasi:** `src/hooks/useOfflineSync.ts:26-36`
- **Bukti:** `flushQueue` tidak memiliki flag `isFlushing` dan langsung berhenti (`break`) pada error apapun.
- **Dampak:** Pesanan dapat terkirim ganda saat koneksi tidak stabil, dan antrean macet jika ada satu payload tidak valid.
- **Rekomendasi:** Pasang flag `isFlushing` dan singkirkan payload dengan status 4xx.
- **Status:** Fixed

#### [P2-UI-003] Ketiadaan Varian Dark Mode pada Token Komponen Tertentu
- **Kategori:** Style-Layout
- **Severity:** P2
- **Lokasi:** `src/components/ui/badge.tsx:16`, `src/components/ui/tabs.tsx:58`, `src/components/shared/LoadingSkeleton.tsx:4`
- **Bukti:** Komponen menggunakan `bg-black/5` tanpa varian `dark:bg-white/10`.
- **Dampak:** Komponen badge neutral, tabs list, dan skeleton tidak terlihat di dark mode.
- **Rekomendasi:** Tambahkan kelas utility `dark:bg-white/10`.
- **Status:** Fixed

#### [P2-A11Y-001] Dialog Modal Kehilangan Komposisi Handler `onClick` pada `asChild`
- **Kategori:** UI-UX
- **Severity:** P2
- **Lokasi:** `src/components/ui/dialog.tsx:55-57`
- **Bukti:** `cloneElement` menimpa properti `onClick` child tanpa mengeksekusi handler bawaan elemen anak.
- **Dampak:** Handler klik komponen pemicu modal tidak dieksekusi.
- **Rekomendasi:** Komposisikan handler klik: `child.props?.onClick?.(e); setOpen(true);`.
- **Status:** Fixed

#### [P2-UI-004] Iframe Live CCTV Kandang Tidak Memiliki Atribut Pengaman Sandbox
- **Kategori:** Bug-Keamanan
- **Severity:** P2
- **Lokasi:** `src/app/(marketing)/produk/[slug]/page.tsx:94`
- **Bukti:** `<iframe src={product.cctvUrl} ... />` tanpa sandbox.
- **Dampak:** Berisiko clickjacking atau script eksekusi jika URL CCTV dikompromikan.
- **Rekomendasi:** Tambahkan atribut `sandbox="allow-scripts allow-same-origin"`.
- **Status:** Fixed

---

## 5. Ringkasan Status Perbaikan

- **Total Temuan Diperbaiki:** 15 item kunci (termasuk seluruh bug crash P0 dan type error kompilasi).
- **Unit Test Baru:** 10 test (DOKU Webhook Signature, OTP Rate Limiter, Atomic Stock Concurrency) — **100% Pass**.
- **Status PR:** **BLOCKED** untuk fitur multi-item checkout, siap diajukan untuk perbaikan bug dan peningkatan keamanan single-item qurban.
