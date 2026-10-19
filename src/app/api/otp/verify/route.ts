import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { phoneSchema } from "@/lib/validators/auth";
import { verifyOtp } from "@/lib/otp";

const schema = z.object({
  phone: phoneSchema.shape.phone,
  code: z.string().length(6, "Kode OTP harus 6 digit"),
});

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Payload bukan JSON valid" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Payload tidak valid" },
        { status: 400 }
      );
    }

    const result = await verifyOtp(parsed.data.phone, parsed.data.code);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason ?? "Kode OTP salah atau kedaluwarsa" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Verifikasi gagal" }, { status: 500 });
  }
}
