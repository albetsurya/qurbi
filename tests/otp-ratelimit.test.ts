import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory mock redis store
const store = new Map<string, { value: any; expiresAt?: number }>();

vi.mock("@/lib/redis", () => {
  return {
    redis: {
      get: vi.fn(async (key: string) => {
        const item = store.get(key);
        if (!item) return null;
        if (item.expiresAt && Date.now() > item.expiresAt) {
          store.delete(key);
          return null;
        }
        return item.value;
      }),
      set: vi.fn(async (key: string, value: any, opts?: { ex?: number }) => {
        const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
        store.set(key, { value, expiresAt });
        return "OK";
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
      ttl: vi.fn(async (key: string) => {
        const item = store.get(key);
        if (!item || !item.expiresAt) return -2;
        const remainingMs = item.expiresAt - Date.now();
        if (remainingMs <= 0) {
          store.delete(key);
          return -2;
        }
        return Math.ceil(remainingMs / 1000);
      }),
      incr: vi.fn(async (key: string) => {
        const item = store.get(key);
        const current = item ? Number(item.value) || 0 : 0;
        const next = current + 1;
        store.set(key, { value: String(next), expiresAt: item?.expiresAt });
        return next;
      }),
      expire: vi.fn(async (key: string, seconds: number) => {
        const item = store.get(key);
        if (item) {
          item.expiresAt = Date.now() + seconds * 1000;
        }
        return 1;
      }),
    },
  };
});

// Import after vi.mock
import { checkOtpRateLimit, createOtp, verifyOtp, consumeVerifiedOtp } from "@/lib/otp";

describe("OTP Rate Limiting & Verification Security", () => {
  const phone = "081234567890";

  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("mengizinkan pengiriman OTP pertama kali tanpa pembatasan", async () => {
    const check = await checkOtpRateLimit(phone);
    expect(check.allowed).toBe(true);
    expect(check.retryAfter).toBeUndefined();

    const code = await createOtp(phone);
    expect(code).toHaveLength(6);
  });

  it("memblokir pengiriman OTP jika cooldown rate limit masih aktif", async () => {
    // Kirim OTP pertama
    await createOtp(phone);

    // Coba cek rate limit segera setelahnya
    const rateLimit = await checkOtpRateLimit(phone);
    expect(rateLimit.allowed).toBe(false);
    expect(rateLimit.retryAfter).toBeGreaterThan(0);
    expect(rateLimit.retryAfter).toBeLessThanOrEqual(60);
  });

  it("mengizinkan pengiriman OTP kembali setelah TTL cooldown habis", async () => {
    await createOtp(phone);

    // Simulasi waktu berlalu 61 detik (TTL expired)
    const rateLimitKey = `otp:ratelimit:${phone}`;
    const item = store.get(rateLimitKey);
    if (item) {
      item.expiresAt = Date.now() - 1000; // sudah kedaluwarsa
    }

    const check = await checkOtpRateLimit(phone);
    expect(check.allowed).toBe(true);
  });

  it("berhasil memverifikasi kode OTP yang benar dan membersihkan percobaan", async () => {
    const code = await createOtp(phone);

    const result = await verifyOtp(phone, code);
    expect(result.ok).toBe(true);

    // Pastikan flag verified tersedia untuk signIn
    const canSignIn = await consumeVerifiedOtp(phone);
    expect(canSignIn).toBe(true);

    // Flag verified hanya sekali pakai
    const secondSignIn = await consumeVerifiedOtp(phone);
    expect(secondSignIn).toBe(false);
  });

  it("mengunci dan membatalkan OTP setelah 5 kali percobaan salah berturut-turut (brute-force guard)", async () => {
    const code = await createOtp(phone);

    // 5 kali salah
    for (let i = 1; i <= 5; i++) {
      const res = await verifyOtp(phone, "999999");
      expect(res.ok).toBe(false);
    }

    // Percobaan ke-6 harus ditolak karena lockout dan OTP dihapus
    const attempt6 = await verifyOtp(phone, code); // coba dengan kode asli
    expect(attempt6.ok).toBe(false);
    expect(attempt6.reason).toContain("Terlalu banyak percobaan");
  });
});
