"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation, faLock, faPlus, faShieldHalved, faSpinner, faTrash, faWifi } from "@fortawesome/free-solid-svg-icons";
import { checkoutSchema, type CheckoutInput } from "@/lib/validators/checkout";
import { useCreateOrder } from "@/lib/queries/orders";
import { useUIStore } from "@/stores/ui-store";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import type { CartItem } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import PaymentMethodSelector from "./PaymentMethodSelector";

const DELIVERY_OPTIONS = [
  { value: "DELIVERY", label: "Diantar ke lokasi" },
  { value: "PICKUP", label: "Ambil di kandang" },
  { value: "SLAUGHTER", label: "Sembelih & masak, ambil daging" },
] as const;

export default function CheckoutForm({ items, totalPrice, onSuccess }: {
  items: CartItem[]; totalPrice: number; onSuccess: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const setLastOrderPhone = useUIStore((s) => s.setLastOrderPhone);
  const { isOnline, queueOrder } = useOfflineSync();
  const createOrder = useCreateOrder();

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      guestName: session?.user?.name ?? "",
      guestPhone: session?.user?.phone ?? "",
      guestEmail: session?.user?.email ?? "",
      deliveryType: "DELIVERY",
      participants: [],
      items: items.map((i) => ({ livestockId: i.livestockId, quantity: i.quantity })),
    },
  });

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setValue("guestName", session.user.name);
      if (session.user.phone) setValue("guestPhone", session.user.phone);
      if (session.user.email) setValue("guestEmail", session.user.email);
    }
  }, [session, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "participants" });
  const hasSapi = items.some((i) => i.type === "SAPI");

  const deliveryType = watch("deliveryType");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmitting = createOrder.isPending;

  const onSubmit = async (values: CheckoutInput) => {
    setSubmitError(null);
    try {
      const result = await createOrder.mutateAsync(values);
      setLastOrderPhone(values.guestPhone);
      onSuccess();
      toast.success("Pesanan dibuat! Lanjutkan pembayaran.");
      router.push(`/pesanan/${result.id}`);
    } catch (e) {
      if (!isOnline && e instanceof Error && e.message.includes("jaringan")) {
        const orderNumber = `QBK-OFF-${Date.now()}`;
        await queueOrder(orderNumber, { ...values, orderNumber });
        onSuccess();
        toast.warning("Offline — pesanan disimpan & akan dikirim otomatis.");
        router.push("/pesanan");
      } else {
        const message = e instanceof Error ? e.message : "Checkout gagal. Coba lagi.";
        setSubmitError(message);
        toast.error(message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {!isOnline && (
        <div role="alert" className="flex items-center gap-2 rounded-card bg-warning/10 p-3 text-xs font-medium text-warning">
          <FontAwesomeIcon icon={faWifi} className="h-4 w-4 shrink-0" />
          Kamu sedang offline. Pesanan akan diantrekan dan dikirim otomatis saat online.
        </div>
      )}

      {submitError && (
        <div role="alert" className="flex items-start gap-2 rounded-card bg-error/10 p-3 text-xs font-medium text-error">
          <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Pembayaran gagal dimulai</p>
            <p className="mt-0.5 opacity-90">{submitError}</p>
          </div>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {isSubmitting ? "Sedang memproses pesanan..." : ""}
      </div>
      <div className="space-y-3 rounded-card bg-surface p-4 shadow-subtle">
        <h2 className="font-heading text-h3 font-semibold">Data Pemesan</h2>
        <Input label="Nama lengkap" placeholder="cth. Ahmad Fauzi" error={errors.guestName?.message} {...register("guestName")} />
        <Input label="Nomor WhatsApp" placeholder="08xxxxxxxxxx" error={errors.guestPhone?.message} {...register("guestPhone")} />
        <Input label="Email" type="email" placeholder="kamu@email.com" error={errors.guestEmail?.message} {...register("guestEmail")} />
      </div>

      {hasSapi && (
        <div className="space-y-3 rounded-card bg-surface p-4 shadow-subtle">
          <div>
            <h2 className="font-heading text-h3 font-semibold">Shohibul Qurban</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Patungan 1 ekor sapi untuk maksimal 7 orang. Tambahkan nama tiap pequrban —
              namanya akan tercantum di laporan distribusi.
            </p>
          </div>
          {fields.length === 0 && (
            <p className="rounded-control bg-black/5 p-3 text-center text-xs text-ink-muted dark:bg-white/5">
              Belum ada nama pequrban. Tekan tombol di bawah untuk menambah.
            </p>
          )}
          <ol className="space-y-3">
            {fields.map((field, index) => (
              <li key={field.id} className="space-y-2 rounded-control border border-black/10 p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px]">
                      {index + 1}
                    </span>
                    Pequrban {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Hapus pequrban ${index + 1}`}
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-control text-error hover:bg-error/10"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  label="Nama lengkap"
                  placeholder="cth. Budi Santoso"
                  error={errors.participants?.[index]?.name?.message}
                  {...register(`participants.${index}.name` as const)}
                />
                <Input
                  label="Bin/Binti — nama ayah (opsional)"
                  placeholder="cth. H. Ahmad (jadi: Budi Santoso bin H. Ahmad)"
                  error={errors.participants?.[index]?.binOf?.message}
                  {...register(`participants.${index}.binOf` as const)}
                />
              </li>
            ))}
          </ol>
          {typeof errors.participants?.message === "string" && (
            <p role="alert" className="text-xs text-error">{errors.participants.message}</p>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              fullWidth={false}
              onClick={() => append({ name: "" })}
              disabled={fields.length >= 7}
            >
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
              Tambah Nama
            </Button>
            <p className="text-xs font-medium text-ink-muted" role="status">
              {fields.length >= 7
                ? "Kuota penuh (7/7)"
                : `Tersisa ${7 - fields.length} dari 7 nama`}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-card bg-surface p-4 shadow-subtle">
        <h2 className="font-heading text-h3 font-semibold">Pengiriman</h2>
        <div className="grid gap-2">
          {DELIVERY_OPTIONS.map((o) => (
            <label key={o.value} className="flex h-11 cursor-pointer items-center gap-2 rounded-control border border-black/10 px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" value={o.value} className="accent-primary" {...register("deliveryType")} />
              {o.label}
            </label>
          ))}
        </div>
        {deliveryType === "DELIVERY" && (
          <Textarea label="Alamat lengkap" placeholder="Jalan, nomor rumah, kelurahan, kota" error={errors.deliveryAddress?.message} {...register("deliveryAddress")} />
        )}
        <Input label="Tanggal pengiriman (opsional)" type="date" {...register("deliveryDate")} />
        <Textarea label="Catatan (opsional)" placeholder="cth. titip di satpam" {...register("notes")} />
      </div>

      <PaymentMethodSelector value={watch("paymentMethod")} onChange={(v) => setValue("paymentMethod", v)} error={errors.paymentMethod?.message} />

      <Button type="submit" disabled={createOrder.isPending} aria-busy={createOrder.isPending}>
        {createOrder.isPending ? (
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />
            Membuat pesanan & menyiapkan pembayaran...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faLock} className="h-4 w-4" aria-hidden="true" />
            {`Bayar ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalPrice)}`}
          </span>
        )}
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-ink-muted">
        <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2.5 py-1 shadow-subtle">
          <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-success" />
          256-bit SSL Encrypted
        </span>
        <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2.5 py-1 shadow-subtle">
          <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-secondary" />
          Partner DOKU Terverifikasi
        </span>
      </div>
      <p className="text-center text-[11px] leading-relaxed text-ink-muted">
        Dengan menekan Bayar, kamu akan diarahkan ke halaman pembayaran aman DOKU.
        Status pesanan diperbarui otomatis via webhook.
      </p>
    </form>
  );
}
