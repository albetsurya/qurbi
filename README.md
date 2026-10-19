# QurbanKu — Qurban & Aqiqah Online

Aplikasi web mobile-first (PWA) untuk pemesanan hewan qurban/aqiqah: katalog, keranjang,
checkout dengan DOKU (VA, QRIS, e-wallet, kartu kredit), login OTP via WhatsApp, pelacakan
pesanan, panel admin, dan dukungan offline.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (design token di `src/app/globals.css`)
- Prisma + PostgreSQL (Neon)
- NextAuth v5 (JWT + Credentials provider OTP WhatsApp)
- Upstash Redis (penyimpanan OTP)
- TanStack Query, Zustand, react-hook-form + zod
- DOKU SNAP (pembayaran), Serwist (service worker PWA)

## Setup Lokal

```bash
npm install
cp .env.example .env   # isi semua variabel
npm run db:push        # prisma db push
npm run db:seed        # data dummy + akun admin
npm run dev            # http://localhost:3000
```

Akun admin hasil seed: nomor `081234567890` (role ADMIN). Login memakai kode OTP —
tanpa gateway WhatsApp, kode OTP muncul sebagai `devCode` di respons `/api/otp/send`
(lihat Network tab browser) dan tercatat di console server.

## Environment Variables

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Koneksi PostgreSQL (Neon) |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | URL app & secret NextAuth |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis untuk OTP |
| `DOKU_CLIENT_ID` / `DOKU_SECRET_KEY` / `DOKU_BASE_URL` | Integrasi DOKU |
| `WHATSAPP_API_URL` / `WHATSAPP_TOKEN` | Gateway WhatsApp (opsional di dev) |
| `APP_URL` | URL publik app (callback DOKU) |

## Deploy ke Vercel

1. Push repo ke GitHub, import di Vercel.
2. Isi semua environment variables.
3. Deploy, lalu jalankan migrasi & seed terhadap DB production:
   `npx prisma db push` dan `npx prisma db seed` (dengan env production).
4. Set callback URL DOKU: `https://<domain>/api/doku/webhook`.

## Catatan

- Foto produk default memakai `picsum.photos` (sudah di-allow di `next.config.ts`).
  Untuk host gambar lain, tambahkan ke `images.remotePatterns`.
- Webhook DOKU memverifikasi signature sebelum mengubah status order.
# qurbi
