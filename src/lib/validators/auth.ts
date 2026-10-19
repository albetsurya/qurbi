import { z } from "zod";

export const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^08\d{8,11}$/, "Nomor WhatsApp tidak valid (awali dengan 08, 10-13 digit)"),
});

export type PhoneInput = z.infer<typeof phoneSchema>;
