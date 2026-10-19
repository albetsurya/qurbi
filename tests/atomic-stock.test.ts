import { describe, it, expect, beforeEach } from "vitest";

// Simulasi database storage & transaksi atomik
interface LivestockRecord {
  id: string;
  name: string;
  stock: number;
}

class MockPrismaDatabase {
  public livestock: Map<string, LivestockRecord> = new Map();
  public orders: Array<{ id: string; livestockId: string; quantity: number }> = [];
  private lock = Promise.resolve();

  // Simulasi Prisma $transaction dengan pessimistic queue lock
  async transaction<T>(fn: (tx: MockTx) => Promise<T>): Promise<T> {
    const prevLock = this.lock;
    let releaseLock: () => void = () => {};
    this.lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await prevLock;
    const tx = new MockTx(this);
    try {
      const result = await fn(tx);
      tx.commit();
      return result;
    } catch (e) {
      tx.rollback();
      throw e;
    } finally {
      releaseLock();
    }
  }
}

class MockTx {
  private tempLivestock: Map<string, LivestockRecord>;
  private tempOrders: Array<{ id: string; livestockId: string; quantity: number }> = [];

  constructor(private db: MockPrismaDatabase) {
    this.tempLivestock = new Map(
      Array.from(db.livestock.entries()).map(([k, v]) => [k, { ...v }])
    );
  }

  async findUniqueLivestock(id: string) {
    const item = this.tempLivestock.get(id);
    return item ? { ...item } : null;
  }

  async updateLivestockStock(id: string, decrement: number) {
    const item = this.tempLivestock.get(id);
    if (!item) throw new Error("Livestock not found");
    item.stock -= decrement;
  }

  async createOrder(data: { id: string; livestockId: string; quantity: number }) {
    this.tempOrders.push(data);
    return data;
  }

  commit() {
    this.db.livestock = this.tempLivestock;
    this.db.orders.push(...this.tempOrders);
  }

  rollback() {
    // discarded
  }
}

// Handler simulasi proses checkout yang digunakan di api/orders/route.ts
async function processOrderCheckout(
  db: MockPrismaDatabase,
  input: { orderId: string; livestockId: string; quantity: number }
) {
  return await db.transaction(async (tx) => {
    const current = await tx.findUniqueLivestock(input.livestockId);
    if (!current || current.stock < input.quantity) {
      throw new Error(`Stok ${current?.name ?? "hewan"} tidak mencukupi`);
    }

    await tx.updateLivestockStock(input.livestockId, input.quantity);
    return await tx.createOrder({
      id: input.orderId,
      livestockId: input.livestockId,
      quantity: input.quantity,
    });
  });
}

describe("Atomic Stock Concurrency Verification", () => {
  let db: MockPrismaDatabase;

  beforeEach(() => {
    db = new MockPrismaDatabase();
    db.livestock.set("hewan-1", {
      id: "hewan-1",
      name: "Domba Garut Super",
      stock: 1, // Hanya ada 1 ekor stok
    });
  });

  it("mencegah overselling saat dua checkout berjalan paralel untuk stok terakhir", async () => {
    const orderA = processOrderCheckout(db, {
      orderId: "order-user-a",
      livestockId: "hewan-1",
      quantity: 1,
    });

    const orderB = processOrderCheckout(db, {
      orderId: "order-user-b",
      livestockId: "hewan-1",
      quantity: 1,
    });

    // Jalankan kedua checkout secara simultan
    const results = await Promise.allSettled([orderA, orderB]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // TEPAT SATU yang harus berhasil, dan TEPAT SATU yang ditolak karena kehabisan stok
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Alasan penolakan harus jelas
    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.message).toContain("Stok Domba Garut Super tidak mencukupi");

    // Verifikasi integritas stok di database: stok harus 0, BUKAN -1
    const finalLivestock = db.livestock.get("hewan-1");
    expect(finalLivestock?.stock).toBe(0);

    // Verifikasi pesanan yang tercatat hanya 1
    expect(db.orders).toHaveLength(1);
  });
});
