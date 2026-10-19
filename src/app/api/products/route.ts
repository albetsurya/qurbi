import { NextRequest, NextResponse } from "next/server";
import { LivestockPurpose, type Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { productFilterSchema, productSchema } from "@/lib/validators/product";
import { getClickRanks } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  try {
    const parsed = productFilterSchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { type, purpose, minPrice, maxPrice, minWeight, search, page, limit, sort, admin, status } = parsed.data;

    // Mode admin wajib login ADMIN — publik selalu hanya melihat produk aktif
    let isActiveFilter: boolean | undefined = true;
    if (admin) {
      const session = await auth();
      if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
      }
      isActiveFilter = status === "all" ? undefined : status === "active";
    }

    const where: Prisma.LivestockWhereInput = {
      ...(isActiveFilter === undefined ? {} : { isActive: isActiveFilter }),
      ...(type ? { type } : {}),
      ...(purpose
        ? {
            purpose:
              purpose === "BOTH"
                ? { in: [LivestockPurpose.BOTH, LivestockPurpose.QURBAN, LivestockPurpose.AQIQAH] }
                : (purpose as LivestockPurpose),
          }
        : {}),
      ...(minPrice ? { price: { gte: minPrice } } : {}),
      ...(maxPrice ? { price: { ...(minPrice ? { gte: minPrice } : {}), lte: maxPrice } } : {}),
      ...(minWeight ? { weightKg: { gte: minWeight } } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const orderBy =
      sort === "price_asc" ? { price: "asc" as const } :
      sort === "price_desc" ? { price: "desc" as const } :
      sort === "weight_desc" ? { weightKg: "desc" as const } :
      { createdAt: "desc" as const };

    const [total, rows] = await Promise.all([
      prisma.livestock.count({ where }),
      prisma.livestock.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        include: { breeder: { select: { name: true, location: true, isVerified: true } } },
      }),
    ]);

    // Sort "popular": susun ulang hasil halaman berdasarkan peringkat klik Redis.
    // Produk tanpa data klik tetap tampil di belakang — paginasi tidak berubah.
    if (sort === "popular") {
      const ranks = await getClickRanks();
      if (ranks) {
        rows.sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id, slug: r.slug, name: r.name, type: r.type, purpose: r.purpose,
          weightKg: String(r.weightKg), price: String(r.price), stock: r.stock,
          images: r.images as string[], isVerified: r.isVerified,
          isActive: r.isActive, breeder: r.breeder,
        })),
        total, page, totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Gagal memuat produk" }, { status: 500 });
  }
}

/** Tambah produk — POST /products (admin only). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { vaccines, ...d } = parsed.data;
  const created = await prisma.livestock.create({
    data: { ...d, videoUrl: d.videoUrl || null, cctvUrl: d.cctvUrl || null, vaccines: vaccines ?? undefined },
  });
  return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
}
