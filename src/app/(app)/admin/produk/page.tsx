"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxesStacked, faPen, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import apiClient from "@/lib/axios-client";
import { productSchema, type ProductInput } from "@/lib/validators/product";
import type { ProductDetail, ProductListItem } from "@/lib/queries/products";
import { queryKeys } from "@/lib/queries/keys";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";

type AdminListItem = ProductListItem & { isActive: boolean };
type StatusFilter = "all" | "active" | "inactive";

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

export default function AdminProdukPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; slug: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.products.all, "admin", { search, status }],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: { items: AdminListItem[]; total: number } }>("/products", {
        params: { admin: "true", status, search: search || undefined, limit: 50 },
      });
      return res.data.data;
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: queryKeys.products.all });

  const toggleActive = async (p: AdminListItem) => {
    try {
      await apiClient.patch(`/products/${p.id}`, { isActive: !p.isActive });
      toast.success(p.isActive ? "Produk dinonaktifkan" : "Produk diaktifkan kembali");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status produk");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            placeholder="Cari nama hewan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari produk"
            className="flex-1"
          />
          <Button size="md" fullWidth={false} onClick={() => setDialog({ mode: "create" })}>
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            Tambah
          </Button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter status produk">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              aria-pressed={status === t.value}
              className={cn(
                "btn-press h-9 flex-1 rounded-pill text-xs font-semibold transition-colors",
                status === t.value ? "bg-primary text-white" : "bg-surface text-ink-muted shadow-subtle"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2" role="status" aria-label="Memuat produk">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-surface shadow-subtle" />
          ))}
        </div>
      )}

      {!isLoading && !data?.items.length && (
        <EmptyState
          icon={faBoxesStacked}
          title="Belum ada produk"
          description={search ? "Tidak ada produk yang cocok dengan pencarian." : "Tambahkan hewan pertamamu sekarang."}
        />
      )}

      {data?.items.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 rounded-card bg-surface p-3 shadow-subtle">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="text-xs text-ink-muted">
              {p.type} · {formatRupiah(p.price)} · stok {p.stock}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {p.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="neutral">Nonaktif</Badge>}
              {p.isVerified ? <Badge variant="verified">Terverifikasi</Badge> : <Badge variant="neutral">Belum verif</Badge>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => setDialog({ mode: "edit", slug: p.slug })}>
              <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
              Edit
            </Button>
            <Button
              variant={p.isActive ? "destructive" : "primary"}
              size="sm"
              fullWidth={false}
              onClick={() => void toggleActive(p)}
            >
              {p.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={dialog !== null} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent aria-describedby={undefined} className="max-h-[85vh] overflow-y-auto">
          <DialogTitle>{dialog?.mode === "edit" ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          {dialog?.mode === "edit" ? (
            <EditForm slug={dialog.slug} onDone={() => { setDialog(null); refresh(); }} />
          ) : (
            <ProductForm
              onSubmit={async (values) => {
                await apiClient.post("/products", values);
                toast.success("Produk ditambahkan");
                setDialog(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "product-detail", slug],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ProductDetail }>(`/products/${slug}`);
      return res.data.data;
    },
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-ink-muted" role="status">Memuat data produk...</p>;
  if (isError || !data) return <p className="py-8 text-center text-sm text-error">Gagal memuat produk.</p>;

  return (
    <ProductForm
      initial={{
        slug: data.slug, name: data.name, type: data.type, purpose: data.purpose,
        price: Number(data.price), weightKg: Number(data.weightKg), ageMonths: data.ageMonths,
        gender: data.gender as "JANTAN" | "BETINA", stock: data.stock,
        description: data.description ?? "", images: data.images.length > 0 ? data.images : [""],
        videoUrl: data.videoUrl ?? "", cctvUrl: data.cctvUrl ?? "",
      }}
      showStatus
      onSubmit={async (values) => {
        await apiClient.patch(`/products/${data.id}`, values);
        toast.success("Produk diperbarui");
        onDone();
      }}
    />
  );
}

function ProductForm({
  initial, showStatus = false, onSubmit,
}: {
  initial?: Partial<ProductInput>;
  showStatus?: boolean;
  onSubmit: (values: ProductInput) => Promise<void>;
}) {
  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      images: [""], stock: 1, isActive: true, isVerified: false, ...initial,
    } as ProductInput,
  });

  useEffect(() => {
    if (initial) reset({ images: [""], stock: 1, isActive: true, isVerified: false, ...initial } as ProductInput);
  }, [initial, reset]);

  const images = watch("images") || [""];
  const addImage = () => setValue("images", [...images, ""]);
  const removeImage = (idx: number) => setValue("images", images.filter((_, i) => i !== idx));

  const submit = async (values: ProductInput) => {
    const cleanedImages = values.images.map((s) => s.trim()).filter(Boolean);
    if (cleanedImages.length === 0) {
      setError("images", { message: "Minimal satu URL foto" });
      return;
    }
    try {
      await onSubmit({ ...values, images: cleanedImages });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan produk");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3" noValidate>
      <Input label="Nama" {...register("name")} error={errors.name?.message} />
      <Input label="Slug" placeholder="kambing-jawa-25kg" {...register("slug")} error={errors.slug?.message} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm"><span className="mb-1 block font-medium">Jenis</span>
          <select className="h-12 w-full rounded-control border border-black/10 bg-surface px-3 dark:border-white/10" {...register("type")}>
            <option>KAMBING</option><option>DOMBA</option><option>SAPI</option>
          </select></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Tujuan</span>
          <select className="h-12 w-full rounded-control border border-black/10 bg-surface px-3 dark:border-white/10" {...register("purpose")}>
            <option>QURBAN</option><option>AQIQAH</option><option>BOTH</option>
          </select></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Bobot (kg)" inputMode="decimal" {...register("weightKg")} error={errors.weightKg?.message} />
        <Input label="Umur (bulan)" inputMode="numeric" {...register("ageMonths")} error={errors.ageMonths?.message} />
        <Input label="Harga (Rp)" inputMode="numeric" {...register("price")} error={errors.price?.message} />
        <Input label="Stok" inputMode="numeric" {...register("stock")} error={errors.stock?.message} />
      </div>
      <label className="text-sm"><span className="mb-1 block font-medium">Kelamin</span>
        <select className="h-12 w-full rounded-control border border-black/10 bg-surface px-3 dark:border-white/10" {...register("gender")}>
          <option>JANTAN</option><option>BETINA</option>
        </select></label>
      <Textarea label="Deskripsi" {...register("description")} />

      <div className="space-y-2">
        <span className="block text-sm font-medium">Foto Produk (bisa banyak)</span>
        {images.map((img, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                placeholder={`https://...foto-${i + 1}.jpg`}
                {...register(`images.${i}` as const)}
                aria-label={`URL foto ${i + 1}`}
              />
            </div>
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label={`Hapus foto ${i + 1}`}
                className="btn-press flex h-12 w-12 shrink-0 items-center justify-center rounded-control text-error hover:bg-error/10"
              >
                <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {typeof errors.images?.message === "string" && (
          <p role="alert" className="text-xs text-error">{errors.images.message}</p>
        )}
        <Button type="button" variant="outline" fullWidth={false} onClick={addImage}>
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          Tambah Foto
        </Button>
      </div>

      <Input label="URL Video (opsional)" {...register("videoUrl")} error={errors.videoUrl?.message} />
      <Input label="URL CCTV (opsional)" {...register("cctvUrl")} error={errors.cctvUrl?.message} />
      <Input label="Breeder ID" {...register("breederId")} error={errors.breederId?.message} />

      {showStatus && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex h-12 cursor-pointer items-center gap-2 rounded-control border border-black/10 px-3 text-sm dark:border-white/10">
            <input type="checkbox" className="accent-primary" {...register("isActive")} /> Aktif dijual
          </label>
          <label className="flex h-12 cursor-pointer items-center gap-2 rounded-control border border-black/10 px-3 text-sm dark:border-white/10">
            <input type="checkbox" className="accent-primary" {...register("isVerified")} /> Terverifikasi
          </label>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan Produk"}</Button>
    </form>
  );
}
