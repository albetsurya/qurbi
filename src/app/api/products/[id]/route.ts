import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators/product";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const p = await prisma.livestock.findUnique({
    where: { slug: id },
    include: { breeder: { select: { name: true, location: true, isVerified: true, rating: true, reviewCount: true } } },
  });
  if (!p) return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json({
    success: true,
    data: {
      id: p.id, slug: p.slug, name: p.name, type: p.type, purpose: p.purpose,
      weightKg: String(p.weightKg), price: String(p.price), stock: p.stock,
      ageMonths: p.ageMonths, gender: p.gender, description: p.description,
      images: p.images as string[], videoUrl: p.videoUrl, cctvUrl: p.cctvUrl,
      vaccines: p.vaccines as { name: string; date: string }[] | null,
      isVerified: p.isVerified, breeder: p.breeder,
    },
  });
}

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const updated = await prisma.livestock.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: { id: updated.id } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await prisma.livestock.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true, data: null });
}
