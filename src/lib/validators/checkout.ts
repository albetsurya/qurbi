import { z } from "zod";

export const PAYMENT_METHODS = [
  "va_bca",
  "va_bri",
  "va_mandiri",
  "qris",
  "dana",
  "ovo",
  "shopeepay",
  "credit_card",
] as const;

export const checkoutSchema = z
  .object({
    guestName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
    guestPhone: z
      .string()
      .regex(/^08\d{8,11}$/, "Nomor WhatsApp tidak valid"),
    guestEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
    deliveryType: z.enum(["DELIVERY", "PICKUP", "SLAUGHTER"]),
    deliveryAddress: z.string().max(500).optional(),
    deliveryDate: z.string().optional(),
    notes: z.string().max(500).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    // Nama-nama shohibul qurban — wajib diisi manual saat patungan sapi (maks 7 orang).
    participants: z
      .array(
        z.object({
          name: z.string().min(3, "Nama pequrban minimal 3 karakter").max(100),
          binOf: z.string().max(100, "Nama ayah maksimal 100 karakter").optional(),
        })
      )
      .max(7, "Maksimal 7 pequrban (1 ekor sapi)")
      .optional(),
    items: z
      .array(
        z.object({
          livestockId: z.string().min(1),
          quantity: z.coerce.number().int().min(1, "Minimal 1 ekor").max(10, "Maksimal 10 per jenis"),
        })
      )
      .min(1, "Keranjang masih kosong"),
  })
  .refine(
    (data) => data.deliveryType !== "DELIVERY" || (data.deliveryAddress && data.deliveryAddress.length >= 10),
    { message: "Alamat lengkap wajib diisi (minimal 10 karakter)", path: ["deliveryAddress"] }
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;
