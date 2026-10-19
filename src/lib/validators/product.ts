import { z } from "zod";

export const productSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug minimal 3 karakter")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung"),
  name: z.string().min(3, "Nama minimal 3 karakter"),
  type: z.enum(["KAMBING", "DOMBA", "SAPI"]),
  purpose: z.enum(["QURBAN", "AQIQAH", "BOTH"]),
  price: z.coerce.number().positive("Harga harus lebih dari 0"),
  weightKg: z.coerce.number().positive("Bobot harus lebih dari 0"),
  ageMonths: z.coerce.number().int().min(0, "Umur tidak valid"),
  gender: z.enum(["JANTAN", "BETINA"]),
  stock: z.coerce.number().int().min(0, "Stok tidak valid"),
  description: z.string().max(2000).optional(),
  images: z.array(z.string()).min(1, "Minimal satu URL foto"),
  videoUrl: z.string().url("URL video tidak valid").optional().or(z.literal("")),
  cctvUrl: z.string().url("URL CCTV tidak valid").optional().or(z.literal("")),
  vaccines: z.array(z.object({ name: z.string(), date: z.string() })).optional(),
  breederId: z.string().min(1, "Breeder wajib dipilih"),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productFilterSchema = z.object({
  type: z.enum(["KAMBING", "DOMBA", "SAPI"]).optional(),
  purpose: z.enum(["QURBAN", "AQIQAH", "BOTH"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minWeight: z.coerce.number().nonnegative().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  sort: z.enum(["newest", "price_asc", "price_desc", "weight_desc", "popular"]).default("newest"),
  // Khusus admin: lihat produk nonaktif + filter status ("false" string tidak boleh jadi true)
  admin: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export type ProductFilterInput = z.infer<typeof productFilterSchema>;
