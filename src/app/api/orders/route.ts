import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validators/checkout";
import { createDokuPayment, getDokuVaChannel } from "@/lib/doku";
import { sendOrderNotification } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Data checkout tidak valid" }, { status: 400 });
    }
    const input = parsed.data;
    const session = await auth();

    // Hitung ulang harga di server — jangan percaya client
    const livestock = await prisma.livestock.findMany({
      where: { id: { in: input.items.map((i) => i.livestockId) } },
    });
    if (livestock.length !== input.items.length) {
      return NextResponse.json({ success: false, error: "Ada produk yang tidak ditemukan" }, { status: 400 });
    }
    let total = 0;
    for (const item of input.items) {
      const l = livestock.find((x) => x.id === item.livestockId)!;
      if (l.stock < item.quantity) {
        return NextResponse.json({ success: false, error: `Stok ${l.name} tidak mencukupi` }, { status: 400 });
      }
      total += Number(l.price) * item.quantity;
    }

    const orderNumber = `QBK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${nanoid(6).toUpperCase()}`;

    // Guest checkout → shadow account
    let userId: string | undefined;
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const shadow = await prisma.user.upsert({
        where: { phone: input.guestPhone },
        update: {},
        create: { phone: input.guestPhone, name: input.guestName, email: input.guestEmail },
      });
      userId = shadow.id;
    }

    const mainItem = input.items[0];
    // Nama pequrban patungan disimpan menyatu di notes (tanpa migrasi DB).
    const participantNames = (input.participants ?? [])
      .map((p) => {
        const name = p.name.trim();
        const binOf = p.binOf?.trim();
        return binOf ? `${name} bin ${binOf}` : name;
      })
      .filter(Boolean);
    const mergedNotes = [
      input.notes?.trim() || null,
      participantNames.length > 0
        ? `Shohibul qurban (${participantNames.length} orang): ${participantNames.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;
    const order = await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const current = await tx.livestock.findUnique({
          where: { id: item.livestockId },
          select: { stock: true, name: true },
        });
        if (!current || current.stock < item.quantity) {
          throw new Error(`Stok ${current?.name ?? "hewan"} tidak mencukupi`);
        }
        await tx.livestock.update({
          where: { id: item.livestockId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const o = await tx.order.create({
        data: {
          orderNumber, userId,
          guestName: input.guestName, guestPhone: input.guestPhone, guestEmail: input.guestEmail,
          livestockId: mainItem.livestockId, quantity: mainItem.quantity,
          totalAmount: total, status: "PENDING",
          deliveryType: input.deliveryType,
          deliveryAddress: input.deliveryAddress ?? null,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
          notes: mergedNotes,
          paymentMethod: input.paymentMethod,
        },
      });
      return o;
    });

    // Buat pembayaran DOKU (server-side only)
    const channel = getDokuVaChannel(input.paymentMethod);
    let paymentUrl: string | undefined;
    if (channel) {
      try {
        const doku = await createDokuPayment({
          orderNumber,
          amount: total,
          paymentMethod: channel,
          customer: { name: input.guestName, email: input.guestEmail || undefined, phone: input.guestPhone },
          items: input.items.map((it) => {
            const l = livestock.find((x) => x.id === it.livestockId);
            return {
              name: l?.name ?? "Hewan Qurban",
              price: Number(l?.price ?? 0),
              quantity: it.quantity,
            };
          }),
          callbackUrl: `${process.env.APP_URL}/api/doku/webhook`,
          successUrl: `${process.env.APP_URL}/pesanan/${order.id}`,
          failedUrl: `${process.env.APP_URL}/pesanan/${order.id}`,
        });
        paymentUrl = doku.response?.payment?.payment_url ?? doku.response?.payment?.url;
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentRef: doku.message?.[0], paymentUrl },
        });
      } catch (e) {
        console.error("DOKU create payment failed:", e);
        // Order tetap ada, admin bisa kirim ulang link pembayaran
      }
    }

    await sendOrderNotification(
      input.guestPhone,
      `QurbanKu: Pesanan ${orderNumber} berhasil dibuat senilai Rp${total.toLocaleString("id-ID")}. Selesaikan pembayaran sebelum 24 jam.`
    );

    return NextResponse.json({ success: true, data: { id: order.id, orderNumber, paymentUrl } }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Gagal membuat pesanan" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const isAdmin = searchParams.get("admin") === "true";
    const status = searchParams.get("status");
    const phone = searchParams.get("phone");
    const session = await auth();

    if (isAdmin) {
      if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
      }
      const rows = await prisma.order.findMany({
        where: status ? { status: status as "PENDING" } : {},
        orderBy: { createdAt: "desc" }, take: 100,
        include: { livestock: { select: { name: true, images: true, type: true } } },
      });
      return NextResponse.json({ success: true, data: serialize(rows) });
    }

    if (!phone) {
      return NextResponse.json({ success: false, error: "Parameter phone wajib diisi" }, { status: 400 });
    }
    const rows = await prisma.order.findMany({
      where: { guestPhone: phone },
      orderBy: { createdAt: "desc" }, take: 50,
      include: { livestock: { select: { name: true, images: true, type: true } } },
    });
    return NextResponse.json({ success: true, data: serialize(rows) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Gagal memuat pesanan" }, { status: 500 });
  }
}

function serialize(rows: Array<Record<string, unknown>>) {
  return rows.map((o) => ({ ...o, totalAmount: String(o.totalAmount) }));
}
