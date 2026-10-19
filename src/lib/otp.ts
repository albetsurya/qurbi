import { randomInt } from "node:crypto";
import { redis } from "@/lib/redis";

const OTP_TTL_SECONDS = 300; // 5 menit
const VERIFIED_TTL_SECONDS = 600; // 10 menit untuk menyelesaikan signIn
const RATE_LIMIT_SECONDS = 60; // 1 menit cooldown per nomor
const MAX_VERIFY_ATTEMPTS = 5; // Maksimal percobaan salah

function otpKey(phone: string) {
  return `otp:${phone}`;
}

function verifiedKey(phone: string) {
  return `otp:verified:${phone}`;
}

function rateLimitKey(phone: string) {
  return `otp:ratelimit:${phone}`;
}

function attemptsKey(phone: string) {
  return `otp:attempts:${phone}`;
}

export async function checkOtpRateLimit(phone: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const ttl = await redis.ttl(rateLimitKey(phone));
    if (ttl > 0) {
      return { allowed: false, retryAfter: ttl };
    }
    return { allowed: true };
  } catch (e) {
    console.error("Gagal memeriksa rate limit OTP:", e);
    return { allowed: true }; // Jangan blokir pengguna jika redis gagal membaca TTL
  }
}

export async function createOtp(phone: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await Promise.all([
    redis.set(otpKey(phone), code, { ex: OTP_TTL_SECONDS }),
    redis.set(rateLimitKey(phone), "1", { ex: RATE_LIMIT_SECONDS }),
    redis.del(attemptsKey(phone)),
  ]);
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; reason?: string }> {
  const aKey = attemptsKey(phone);
  let attempts = 1;
  try {
    attempts = await redis.incr(aKey);
    if (attempts === 1) {
      await redis.expire(aKey, OTP_TTL_SECONDS);
    }
  } catch (e) {
    console.error("Gagal mencatat percobaan verifikasi:", e);
  }

  if (attempts > MAX_VERIFY_ATTEMPTS) {
    await redis.del(otpKey(phone));
    return { ok: false, reason: "Terlalu banyak percobaan salah. Silakan minta kode baru." };
  }

  const stored = await redis.get<string>(otpKey(phone));
  if (!stored || stored !== code) {
    return { ok: false, reason: "Kode OTP salah atau kedaluwarsa" };
  }

  await Promise.all([
    redis.del(otpKey(phone)),
    redis.del(aKey),
    redis.set(verifiedKey(phone), "1", { ex: VERIFIED_TTL_SECONDS }),
  ]);
  return { ok: true };
}

/** Dipanggil oleh next-auth authorize — sekali pakai. */
export async function consumeVerifiedOtp(phone: string): Promise<boolean> {
  const key = verifiedKey(phone);
  const value = await redis.get(key);
  if (value !== "1") return false;
  await redis.del(key);
  return true;
}
