"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Suspense, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    if (code.length !== 6) { toast.error("Masukkan 6 digit kode OTP"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error);

      const result = await signIn("whatsapp-otp", { phone, redirect: false });
      if (result?.error) throw new Error("Sesi OTP kedaluwarsa, silakan login ulang");
      toast.success("Berhasil masuk!");
      router.push("/akun");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verifikasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Kode OTP 6 digit"
        placeholder="______"
        className="w-full rounded-control border border-black/10 bg-surface py-4 text-center font-heading text-2xl font-bold tracking-[0.5em] transition-colors focus:border-primary focus:outline-none dark:border-white/10"
      />
      <Button onClick={submit} disabled={loading || code.length !== 6} aria-busy={loading}>
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />
            Memverifikasi...
          </span>
        ) : (
          "Verifikasi & Masuk"
        )}
      </Button>
      <p className="text-center text-xs text-ink-muted">Kode dikirim ke {phone}. Berlaku 5 menit.</p>
      <button
        type="button"
        disabled={resending || cooldown > 0}
        onClick={async () => {
          setResending(true);
          try {
            const res = await fetch("/api/otp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone }),
            });
            const json = (await res.json()) as { success: boolean; error?: string };
            if (!json.success) throw new Error(json.error ?? "Gagal mengirim ulang");
            toast.success("Kode baru terkirim via WhatsApp!");
            setCooldown(30);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal mengirim ulang OTP");
          } finally {
            setResending(false);
          }
        }}
        className="mx-auto block text-xs font-semibold text-secondary disabled:opacity-50"
      >
        {resending ? "Mengirim ulang..." : cooldown > 0 ? `Kirim ulang dalam ${cooldown}d` : "Tidak terima kode? Kirim ulang"}
      </button>
    </div>
  );
}

export default function OtpPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-app flex-col justify-center gap-6 border-black/5 bg-background px-6 py-8 sm:border-x sm:shadow-float dark:border-white/10">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-h1 font-bold">Masukkan Kode OTP</h1>
        <p className="text-sm text-ink-muted">Cek pesan WhatsApp kamu untuk kode verifikasi.</p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-ink-muted">Memuat...</p>}>
        <OtpForm />
      </Suspense>
    </div>
  );
}
