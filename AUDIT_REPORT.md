# AUDIT REPORT — QurbanKu (qurbi) Non-Games

> **Branch:** `audit/qurbi-non-games-20261019`  
> **Tanggal Audit:** 19 Oktober 2026  
> **Auditor:** Senior AI Coding Agent (Orkestrasi: Ponytail Framework)  
> **Target Repo:** https://github.com/albetsurya/qurbi  
> **Scope:** Semua fitur non-games (Mekanisme, Auth, Pembayaran, Checkout, Data Layer, UI/UX, Style, Aksesibilitas, PWA, Keamanan)  
> **Excluded:** Fitur/games (tidak ada modul game di repo ini)

---

## 1. Ringkasan Eksekutif

Audit menyeluruh telah dilakukan pada seluruh modul non-games dengan prinsip **Ponytail** (mengutamakan kesederhanaan, kode native/standar, pencegahan bloat, dan mitigasi risiko tinggi). Sebanyak **88 temuan** berhasil dipetakan ke dalam 5 tingkatan risiko dan kategori:

| Kategori | P0 (Kritis) | P1 (Tinggi) | P2 (Sedang) | P3 (Rendah) | Total |
|---|---|---|---|---|---|
| **Bug & Keamanan** | 7 | 14 | 12 | 0 | **33** |
| **Mekanisme & Logika Bisnis** | 1 | 2 | 10 | 6 | **19** |
| **UI / UX & Aksesibilitas** | 0 | 5 | 13 | 9 | **27** |
| **Style & Layout** | 0 | 0 | 5 | 4 | **9** |
| **Total Temuan** | **8** | **21** | **40** | **19** | **88** |

---

## 2. Temuan P0 (Critical) & P1 (High) Terpenting

### 🔴 P0 — Kritis

#### [SEC-001] Ketiadaan Rate Limiting pada Pengiriman OTP
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/api/otp/send/route.ts:16-21`
- **Bukti:** Endpoint `/api/otp/send` tidak menerapkan pembatasan frekuensi (cooldown per nomor WhatsApp / per IP). Setiap panggilan langsung membuat OTP baru di Redis dan memanggil gateway WhatsApp.
- **Dampak:** Penyerang dapat melakukan flooding ke gateway WhatsApp (menimbulkan biaya/pemblokiran akun WhatsApp gateway), serta melakukan DoS terhadap pengguna yang sah (OTP lama selalu tertimpa sebelum sempat dimasukkan).
- **Rekomendasi:** Terapkan rate limiter berbasis Redis (e.g. `otp:ratelimit:{phone}` dengan TTL 60 detik). Tolak permintaan jika cooldown masih aktif.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [SEC-002] Ketiadaan Proteksi Brute-Force pada Verifikasi OTP
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/api/otp/verify/route.ts:10-28`
- **Bukti:** Tidak ada batasan percobaan (attempt counter) pada verifikasi kode 6-digit OTP.
- **Dampak:** Penyerang dapat melakukan brute-force otomatis terhadap 1.000.000 kombinasi dalam hitungan menit sebelum TTL habis.
- **Rekomendasi:** Tambahkan counter percobaan per nomor di Redis (maksimal 5 kali salah). Jika melebihi batas, hapus OTP dan blokir selama 15 menit.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [SEC-003] Kebocoran Kode OTP (devCode) di Respon API
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/api/otp/send/route.ts:27-28`
- **Bukti:** `return NextResponse.json({ success: true, data: { devCode: code } });` jika `WHATSAPP_API_URL` tidak diatur di environment.
- **Dampak:** Jika terjadi kesalahan konfigurasi environment variable di server production (misal nama variabel typo atau belum diset), kode OTP langsung dibocorkan ke client dalam respon JSON publik, memungkinkan siapa saja login ke akun nomor manapun.
- **Rekomendasi:** Berikan guard ketat `process.env.NODE_ENV !== "production"` dan cegah pembocoran devCode di production environment.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [PAY-001] Crash Runtime pada DOKU Helper Karena Import `sha256` Tidak Valid
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/lib/doku.ts:1, 72-73`
- **Bukti:** `import { createHmac, randomUUID, sha256 } from "node:crypto";` dan `sha256.create().update(rawBody).digest("base64")`. Modul `node:crypto` bawaan Node.js tidak mengekspor `sha256` dengan method `.create()`.
- **Dampak:** Setiap proses pembuatan pembayaran DOKU SNAP dan verifikasi signature webhook DOKU crash total dengan runtime error `TypeError: sha256.create is not a function`, menyebabkan seluruh alur pembayaran lumpuh.
- **Rekomendasi:** Gunakan API standar Node.js: `import { createHash } from "node:crypto"; createHash("sha256").update(rawBody).digest("base64")`.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [PAY-002] Verifikasi Signature Webhook DOKU Rentan Timing Side-Channel Attack
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/lib/doku.ts:170` & `src/app/api/doku/webhook/route.ts:20`
- **Bukti:** Menggunakan perbandingan string biasa: `expected === signature`.
- **Dampak:** Penyerang dapat melakukan timing attack untuk merekonstruksi signature HMAC yang valid byte-demi-byte.
- **Rekomendasi:** Gunakan `crypto.timingSafeEqual` dengan buffer length check.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [PAY-003] Race Condition Stok pada Pembuatan Pesanan
- **Kategori:** Bug-Keamanan / Mekanisme
- **Severity:** P0
- **Lokasi:** `src/app/api/orders/route.ts:20-33, 82-85`
- **Bukti:** Pengecekan ketersediaan stok (`findMany` lalu `l.stock < item.quantity`) dilakukan di luar blok transaksi `$transaction` yang melakukan decrement.
- **Dampak:** Overselling. Dua pembeli dapat bersamaan memesan 1 hewan qurban terakhir, keduanya lolos pengecekan stok, dan stok menjadi negatif atau terjadi alokasi ganda untuk hewan yang sama.
- **Rekomendasi:** Lakukan pengecekan dan decrement secara atomik di dalam `$transaction` menggunakan conditional update (`stock: { gte: item.quantity }`) atau pessimistic locking.
- **Status:** Open (Perlu Review Manual / Safe Refactor)

#### [CAT-001] Bug Filter Produk Menghasilkan Klausa Prisma Invalid
- **Kategori:** Bug-Keamanan
- **Severity:** P0
- **Lokasi:** `src/app/api/products/route.ts:30`
- **Bukti:** `purpose: purpose === "BOTH" ? { in: ["BOTH", "QURBAN", "AQIQAH"] } : { purpose }` menghasilkan `{ purpose: { purpose: "QURBAN" } }`.
- **Dampak:** Filter katalog produk berdasarkan tujuan (Qurban atau Aqiqah) mengalami crash Prisma query error atau hasil kosong pada aplikasi.
- **Rekomendasi:** Perbaiki ke klausa Prisma yang valid: `...(purpose ? (purpose === "BOTH" ? { purpose: { in: ["BOTH", "QURBAN", "AQIQAH"] } } : { purpose }) : {})`.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [A11Y-001] Dialog Modal Kehilangan Focus Trap & Accessible Role
- **Kategori:** UI-UX / Aksesibilitas
- **Severity:** P1
- **Lokasi:** `src/components/ui/dialog.tsx:86-106`
- **Bukti:** Tidak ada focus trap, tidak ada `aria-labelledby`, dan tidak mengembalikan fokus saat ditutup.
- **Dampak:** Pengguna keyboard dan screen reader terjebak atau fokus lolos ke elemen di belakang backdrop modal.
- **Rekomendasi:** Tambahkan keyboard Escape listener, aria attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), dan tombol close 'X' yang jelas.
- **Status:** Open (Dijadwalkan untuk Fix)

---

### 🟡 P1 — Tingkat Tinggi

#### [SEC-004] Ketiadaan Autentikasi / Otorisasi pada Endpoint Generate Ulang Pembayaran DOKU
- **Lokasi:** `src/app/api/doku/create/route.ts:13-44`
- **Bukti:** Endpoint `POST /api/doku/create` mengimpor `auth` tetapi tidak pernah memanggilnya.
- **Dampak:** Siapapun dapat meng-generate ulang link pembayaran untuk sembarang nomor pesanan.
- **Rekomendasi:** Validasi sesi pengguna (cocokkan nomor telepon pemesan atau role ADMIN).
- **Status:** Open (Dijadwalkan untuk Fix)

#### [SEC-005] Kebocoran Data Pribadi (PII) pada Detail Pesanan Publik
- **Lokasi:** `src/app/api/orders/[id]/route.ts:8-15` & `src/app/api/orders/route.ts:148-156`
- **Bukti:** Endpoint `GET /api/orders/[id]` dan `GET /api/orders?phone=...` tidak memverifikasi kepemilikan data.
- **Dampak:** Siapapun dapat mengambil nama pemesan, nomor telepon, alamat pengiriman, dan email pelanggan lain.
- **Rekomendasi:** Terapkan sanitasi field data untuk akses unauthenticated atau batasi query hanya untuk pemilik sesi / verifikasi nomor telepon.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [SEC-006] Race Condition pada Verifikasi OTP (`verifyOtp`)
- **Lokasi:** `src/lib/otp.ts:21-26`
- **Bukti:** `redis.get` diikuti oleh `redis.del` secara terpisah (non-atomik).
- **Dampak:** TOCTOU race: dua permintaan verifikasi simultan dengan OTP yang sama dapat keduanya lolos sebelum del tereksekusi.
- **Rekomendasi:** Gunakan perintah atomik `GETDEL` (didukung oleh Upstash Redis).
- **Status:** Open (Dijadwalkan untuk Fix)

#### [INF-001] Pengurutan "Popular" Dilakukan Setelah Paginasi Database
- **Lokasi:** `src/app/api/products/route.ts:52-57`
- **Bukti:** Pengambilan produk menggunakan `skip/take` dengan `orderBy: { createdAt: "desc" }`, baru kemudian di-sort ulang di memory aplikasi berdasarkan ranking Redis.
- **Dampak:** Hasil sort popularitas tidak konsisten karena hanya me-resort item dalam satu halaman, bukan seluruh katalog.
- **Rekomendasi:** Dokumentasikan perilakunya atau urutkan berbasis ranking Redis sebelum paginasi.
- **Status:** Open

#### [PWA-001] Offline Sync Queue Berisiko Mengirim Pesanan Ganda & Terhenti pada Error 4xx
- **Lokasi:** `src/hooks/useOfflineSync.ts:26-36`
- **Bukti:** `flushQueue` tidak memiliki flag `isFlushing`, dan `break` pada error apapun tanpa membuang payload yang gagal validasi 4xx.
- **Dampak:** Jika koneksi berfluktuasi cepat, pesanan bisa terkirim ganda. Jika ada 1 payload invalid (400), antrean akan macet selamanya.
- **Rekomendasi:** Tambahkan flag guard `isFlushing` dan hapus entri dengan error 4xx dari antrean.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [UI-001] Target Sentuh Mobile di Bawah Standar 44x44px (WCAG 2.5.5)
- **Lokasi:** `src/components/layout/Header.tsx:30, 44`, `src/components/layout/ThemeToggle.tsx:36`, `src/components/product/ProductImageCarousel.tsx:31, 39`
- **Bukti:** Berbagai tombol navigasi, cart icon, theme toggle, dan carousel kontrol berukuran `h-9 w-9` (36×36px).
- **Dampak:** Kesulitan tap bagi pengguna mobile atau pengguna dengan keterbatasan motorik.
- **Rekomendasi:** Naikkan ukuran minimum target sentuh menjadi `min-h-[44px] min-w-[44px]` atau `h-11 w-11`.
- **Status:** Open (Dijadwalkan untuk Fix)

#### [UI-002] Hydration Mismatch pada `src/components/ui/input.tsx` Karena `Math.random()`
- **Lokasi:** `src/components/ui/input.tsx:15, 53`
- **Bukti:** `const inputId = id ?? props.name ?? Math.random().toString(36).slice(2);`
- **Dampak:** ID yang berbeda antara server render (SSR) dan client hydration menghasilkan hydration warning serta rusaknya relasi `label` dan `input`.
- **Rekomendasi:** Gunakan hook native React 19 `useId()`.
- **Status:** Open (Dijadwalkan untuk Fix)

---

## 3. Temuan P2 & P3 (Rangkuman Area Terpilih)

1. **State Machine Pesanan:** `PATCH /api/orders/[id]` dapat mengubah status secara bebas tanpa validasi transisi (e.g. COMPLETED -> PENDING).
2. **Ketiadaan Pembatalan Otomatis Pesanan Kedaluwarsa:** Pesanan PENDING yang tidak dibayar dalam 24 jam tidak me-restore stok hewan qurban.
3. **Multi-Item Order Schema:** Pesanan di tabel database `Order` hanya menyimpan single `livestockId`, sedangkan cart mendukung multi-item (item ke-2 dst hanya terkurangi stoknya tapi tidak tercatat terpisah). *(Catatan: Perlu Keputusan Produk / Skema DB)*.
4. **Dark Mode Gaps:** Elemen seperti `badge neutral`, `tabs list`, dan filter inputs menggunakan `bg-black/5` tanpa varian dark mode `dark:bg-white/10`.
5. **Katalog Pagination:** Halaman katalog produk di frontend meng-hardcode `page: 1` tanpa kontrol paginasi/infinite scroll.
6. **Iframe CCTV Sanitasi:** Komponen CCTV di detail produk perlu ditambahkan atribut `sandbox` dan pengamanan origin.

---

## 4. Status Eksekusi Perbaikan

Seluruh perbaikan aman dan prioritas tinggi (P0/P1) sedang dieksekusi secara terisolasi tanpa mengubah arsitektur destruktif atau modul game.
