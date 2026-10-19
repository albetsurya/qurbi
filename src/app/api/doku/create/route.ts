import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createDokuPayment, getDokuVaChannel } from "@/lib/doku";

const schema = z.object({
  orderNumber: z.string().min(4),
  paymentMethod: z.string(),
});

/** Kirim ulang link pembayaran untuk order PENDING (admin atau pemilik order). */
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
    }
    const order = await prisma.order.findUnique({ where: { orderNumber: parsed.data.orderNumber } });
    if (!order) return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    if (order.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Order sudah dibayar/dibatalkan" }, { status: 400 });
    }
    const session = await auth();
    if (session?.user && session.user.role !== "ADMIN" && session.user.phone && session.user.phone !== order.guestPhone) {
      return NextResponse.json({ success: false, error: "Tidak memiliki akses ke pesanan ini" }, { status: 403 });
    }

    const channel = getDokuVaChannel(parsed.data.paymentMethod);
    if (!channel) return NextResponse.json({ success: false, error: "Metode tidak didukung" }, { status: 400 });

    const doku = await createDokuPayment({
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      paymentMethod: channel,
      customer: { name: order.guestName, email: order.guestEmail ?? undefined, phone: order.guestPhone },
      items: [{ name: `Pesanan ${order.orderNumber}`, price: Number(order.totalAmount), quantity: 1 }],
      callbackUrl: `${process.env.APP_URL}/api/doku/webhook`,
      successUrl: `${process.env.APP_URL}/pesanan/${order.id}`,
      failedUrl: `${process.env.APP_URL}/pesanan/${order.id}`,
    });
    const paymentUrl = doku.response?.payment?.payment_url ?? doku.response?.payment?.url;
    await prisma.order.update({ where: { id: order.id }, data: { paymentUrl, paymentMethod: parsed.data.paymentMethod } });
    return NextResponse.json({ success: true, data: { paymentUrl } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Gagal membuat pembayaran" }, { status: 500 });
  }
}
