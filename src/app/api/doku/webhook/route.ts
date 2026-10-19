import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDokuWebhookSignature } from "@/lib/doku";
import { sendOrderNotification } from "@/lib/whatsapp";

interface DokuWebhookBody {
  order?: { invoice_number?: string; status?: string };
  transaction?: { status?: string };
  service?: { id?: string };
}

/** Verifikasi signature SEBELUM update order. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("request-timestamp") ?? "";
  const requestId = req.headers.get("request-id") ?? "";
  const requestTarget = req.headers.get("request-target") ?? "";
  const signature = req.headers.get("signature") ?? "";

  if (!verifyDokuWebhookSignature(timestamp, requestTarget, rawBody, signature, requestId)) {
    return NextResponse.json({ success: false, error: "Signature tidak valid" }, { status: 401 });
  }

  let body: DokuWebhookBody;
  try {
    body = JSON.parse(rawBody) as DokuWebhookBody;
  } catch {
    return NextResponse.json({ success: false, error: "Body bukan JSON" }, { status: 400 });
  }

  const invoice = body.order?.invoice_number;
  const status = body.transaction?.status ?? body.order?.status ?? "";
  if (!invoice || !["SUCCESS", "PAID"].includes(status.toUpperCase())) {
    return NextResponse.json({ success: true, data: null }); // abaikan status lain
  }

  const updated = await prisma.order.updateMany({
    where: { orderNumber: invoice, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), paymentRef: body.service?.id ?? null },
  });

  if (updated.count === 0) {
    // Pesanan sudah diproses sebelumnya atau tidak dalam status PENDING (idempoten)
    return NextResponse.json({ success: true, data: null });
  }

  const order = await prisma.order.findUnique({ where: { orderNumber: invoice } });
  if (order) {
    try {
      await sendOrderNotification(
        order.guestPhone,
        `QurbanKu: Alhamdulillah, pembayaran pesanan ${order.orderNumber} diterima. Pesananmu sedang disiapkan.`
      );
    } catch (e) {
      console.error("Gagal mengirim notifikasi WhatsApp untuk pesanan:", order.orderNumber, e);
    }
  }

  return NextResponse.json({ success: true, data: { orderNumber: invoice } });
}
