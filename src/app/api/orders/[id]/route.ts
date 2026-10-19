import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const o = await prisma.order.findUnique({
    where: { id },
    include: { livestock: { select: { name: true, images: true, type: true, cctvUrl: true } } },
  });
  if (!o) return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...o, totalAmount: String(o.totalAmount) } });
}

const patchSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "DELIVERING", "DELIVERED", "COMPLETED", "CANCELLED"]),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Status tidak valid" }, { status: 400 });
  }
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "PAID" ? { paidAt: new Date() } : {}),
    },
    include: { livestock: { select: { name: true, images: true, type: true } } },
  });
  return NextResponse.json({ success: true, data: { ...updated, totalAmount: String(updated.totalAmount) } });
}
