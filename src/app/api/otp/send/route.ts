import { NextRequest, NextResponse } from "next/server";
import { phoneSchema } from "@/lib/validators/auth";
import { createOtp, checkOtpRateLimit } from "@/lib/otp";
import { sendOtp } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Payload bukan JSON valid" }, { status: 400 });
    }

    const parsed = phoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nomor tidak valid" },
        { status: 400 }
      );
    }

    const rateLimit = await checkOtpRateLimit(parsed.data.phone);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Mohon tunggu ${rateLimit.retryAfter ?? 60} detik sebelum meminta kode baru` },
        { status: 429 }
      );
    }

    const code = await createOtp(parsed.data.phone);
    try {
      await sendOtp(parsed.data.phone, code);
    } catch (e) {
      console.error("Gagal mengirim OTP via WhatsApp:", e);
    }

    if (process.env.WHATSAPP_API_URL) {
      return NextResponse.json({ success: true, data: null });
    }

    // Mode dev tanpa gateway: HANYA kembalikan kode jika environment development
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ success: true, data: { devCode: code } });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Gagal mengirim kode OTP" }, { status: 500 });
  }
}
