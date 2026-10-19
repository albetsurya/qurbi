"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { phoneSchema, type PhoneInput } from "@/lib/validators/auth";
import apiClient from "@/lib/axios-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PhoneInput>({
    resolver: zodResolver(phoneSchema),
  });

  const onSubmit = async (values: PhoneInput) => {
    setLoading(true);
    try {
      await apiClient.post("/otp/send", { phone: values.phone });
      toast.success("Kode OTP terkirim via WhatsApp!");
      router.push(`/otp?phone=${encodeURIComponent(values.phone)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-app flex-col justify-center gap-6 border-black/5 bg-background px-6 py-8 sm:border-x sm:shadow-float dark:border-white/10">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-display font-bold text-primary">QurbanKu</h1>
        <p className="text-sm text-ink-muted">Masuk tanpa password — kode OTP dikirim ke WhatsApp kamu.</p>
      </div>
      <div className="space-y-3">
        <Button variant="outline" onClick={() => void signIn("google", { callbackUrl: "/akun" })}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.7 3.5 2.7.2.1c2.2-2 3.6-5 3.6-9.5z" />
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.7.1-3 2.4v.7C3.6 21.5 7.5 24 12 24z" />
            <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.8-3-2.3-.7.4C.5 8.8 0 10.3 0 12s.5 3.2 1.4 4.6l3.8-2.2z" />
            <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.6 2.5 1.4 6.6l3.8 3.1c1-2.9 3.7-5 6.8-5z" />
          </svg>
          Masuk dengan Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-ink-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          atau via WhatsApp
          <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Nomor WhatsApp" placeholder="08xxxxxxxxxx" inputMode="tel"
          error={errors.phone?.message} {...register("phone")} />
        <Button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />
              Mengirim kode...
            </span>
          ) : (
            "Kirim Kode OTP"
          )}
        </Button>
      </form>
      <p aria-live="polite" className="text-center text-xs text-ink-muted">
        {loading ? "Menghubungi server WhatsApp, mohon tunggu..." : "Dengan melanjutkan, kamu menyetujui Syarat & Ketentuan QurbanKu."}
      </p>
    </div>
  );
}
