import { redis } from "@/lib/redis";

export type ProductEvent = "view" | "click";

const key = (event: ProductEvent, id: string) => `qbk:pa:${event}:${id}`;
const board = (event: ProductEvent) => `qbk:pa:top:${event}`;
const totalKey = (event: ProductEvent) => `qbk:pa:total:${event}`;

/** Catat 1 event view/click. Gagal diam-diam bila Redis tidak tersedia. */
export async function trackProductEvent(productId: string, event: ProductEvent): Promise<void> {
  try {
    await Promise.all([
      redis.incr(key(event, productId)),
      redis.zincrby(board(event), 1, productId),
      redis.incr(totalKey(event)),
    ]);
  } catch {
    // Analitik bersifat best-effort — jangan ganggu UX
  }
}

export interface TopProduct {
  productId: string;
  count: number;
}

/** Ambil produk teratas per event. Return null bila Redis tidak tersedia. */
export async function getTopProducts(event: ProductEvent, limit = 5): Promise<TopProduct[] | null> {
  try {
    const rows = await redis.zrange(board(event), 0, limit - 1, { rev: true, withScores: true });
    const out: TopProduct[] = [];
    // Upstash: withScores → [member, score, member, score, ...] (string[])
    const flat = rows as unknown as string[];
    for (let i = 0; i < flat.length; i += 2) {
      out.push({ productId: String(flat[i]), count: Math.round(Number(flat[i + 1] ?? 0)) });
    }
    return out;
  } catch {
    return null;
  }
}

export async function getTotalEvents(event: ProductEvent): Promise<number | null> {
  try {
    const v = await redis.get<number | string>(totalKey(event));
    return v === null || v === undefined ? 0 : Number(v);
  } catch {
    return null;
  }
}

/** Peta peringkat klik (productId → rank, 0 = teratas). Null bila Redis tak tersedia. */
export async function getClickRanks(limit = 200): Promise<Map<string, number> | null> {
  try {
    const rows = (await redis.zrange(board("click"), 0, limit - 1, { rev: true })) as unknown as string[];
    return new Map(rows.map((id, i) => [String(id), i]));
  } catch {
    return null;
  }
}
