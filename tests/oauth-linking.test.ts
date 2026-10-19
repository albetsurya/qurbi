import { describe, it, expect, beforeEach } from "vitest";

interface UserRecord {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

// Kebijakan penanganan OAuth SignIn
async function handleOAuthSignIn(opts: {
  account: { provider: string; providerAccountId: string };
  oauthUser: { email: string; name?: string };
  allowDangerousAutoLinking: boolean;
  dbUsers: UserRecord[];
}): Promise<{ allowSignIn: boolean; error?: string; linkedUserId?: string }> {
  if (opts.account.provider !== "google") return { allowSignIn: true };

  const email = opts.oauthUser.email.toLowerCase().trim();
  const existingUser = opts.dbUsers.find((u) => u.email.toLowerCase() === email);

  if (existingUser) {
    // Jika proteksi aktif (allowDangerousAutoLinking = false):
    // DILARANG langsung auto-link akun OAuth baru ke akun user yang sudah ada tanpa verifikasi
    if (!opts.allowDangerousAutoLinking) {
      return {
        allowSignIn: false,
        error: "AccountTakeoverRisk: Email sudah terdaftar sebelumnya. Silakan login via WhatsApp OTP untuk menautkan akun.",
      };
    }

    // Jika allowDangerousAutoLinking = true (perilaku tidak aman sebelumnya)
    return {
      allowSignIn: true,
      linkedUserId: existingUser.id,
    };
  }

  // Pengguna baru mendaftar via Google
  const newUser: UserRecord = {
    id: `user-${Date.now()}`,
    phone: `google:${opts.account.providerAccountId}`,
    email,
    name: opts.oauthUser.name || email.split("@")[0],
    role: "USER",
  };
  opts.dbUsers.push(newUser);
  return { allowSignIn: true, linkedUserId: newUser.id };
}

describe("OAuth Account Linking Security", () => {
  let dbUsers: UserRecord[];

  beforeEach(() => {
    // Pengguna yang sah mendaftar via nomor WhatsApp dan memasukkan email manual saat checkout
    dbUsers = [
      {
        id: "user-victim-001",
        phone: "081234567890",
        email: "ahmad@example.com",
        name: "Ahmad Shohibul",
        role: "ADMIN", // Memiliki hak akses admin
      },
    ];
  });

  it("menolak auto-link berbahaya saat pengguna Google login dengan email yang sama dengan user manual", async () => {
    // Penyerang memiliki akun Google dengan email yang sama (ahmad@example.com)
    const attackSignIn = await handleOAuthSignIn({
      account: { provider: "google", providerAccountId: "google-attacker-999" },
      oauthUser: { email: "ahmad@example.com", name: "Attacker Account" },
      allowDangerousAutoLinking: false, // Kebijakan aman yang direkomendasikan
      dbUsers,
    });

    // Harus ditolak dan TIDAK ditautkan otomatis ke akun korban
    expect(attackSignIn.allowSignIn).toBe(false);
    expect(attackSignIn.error).toContain("AccountTakeoverRisk");
    expect(attackSignIn.linkedUserId).toBeUndefined();
  });

  it("mencatat risiko eksploitasi jika allowDangerousAutoLinking diaktifkan", async () => {
    // Simulasi jika allowDangerousEmailAccountLinking: true
    const vulnerableSignIn = await handleOAuthSignIn({
      account: { provider: "google", providerAccountId: "google-attacker-999" },
      oauthUser: { email: "ahmad@example.com", name: "Attacker Account" },
      allowDangerousAutoLinking: true,
      dbUsers,
    });

    // Menunjukkan bahwa tanpa mitigasi, penyerang langsung mengambil alih akun korban
    expect(vulnerableSignIn.allowSignIn).toBe(true);
    expect(vulnerableSignIn.linkedUserId).toBe("user-victim-001");
  });
});
