import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTopProducts, trackProductEvent, type ProductEvent } from "@/lib/analytics";

const trackSchema = z.object({
  productId: z.string().min(1),
  event: z.enum(["view", "click"]),
});

/** Terima event view/click dari klien — publik, best-effort. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Event tidak valid" }, { status: 400 });
    }
    await trackProductEvent(parsed.data.productId, parsed.data.event as ProductEvent);
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: true, data: null });
  }
}

/** Ringkasan analitik untuk dashboard admin. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
  }
  const metric = req.nextUrl.searchParams.get("metric") === "clicks" ? "click" : "view";
  const top = (await getTopProducts(metric, 5)) ?? [];
  const ids = top.map((t) => t.productId);
  const products = ids.length > 0
    ? await prisma.livestock.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, type: true, price: true, stock: true },
      })
    : [];
  return NextResponse.json({
    success: true,
    data: top.map((t) => ({
      ...t,
      product: products.find((p) => p.id === t.productId) ?? null,
    })),
  });
}
