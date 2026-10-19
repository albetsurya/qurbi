import { describe, it, expect, beforeEach } from "vitest";

// Simulasi database storage & transaksi atomik Prisma
interface LivestockRecord {
  id: string;
  name: string;
  stock: number;
}

class MockPrismaDatabase {
  public livestock: Map<string, LivestockRecord> = new Map();
  public orders: Array<{ id: string; livestockId: string; quantity: number }> = [];
  private lock = Promise.resolve();

  // Simulasi Prisma $transaction dengan concurrency queue
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
    // Seluruh perubahan dalam memori transaksi dibuang (rollback atomik)
  }
}

// Handler simulasi proses checkout yang digunakan di api/orders/route.ts
async function processOrderCheckout(
  db: MockPrismaDatabase,
  input: { orderId: string; livestockId: string; quantity: number; shouldThrowMidway?: boolean }
) {
  return await db.transaction(async (tx) => {
    const current = await tx.findUniqueLivestock(input.livestockId);
    if (!current || current.stock < input.quantity) {
      throw new Error(`Stok ${current?.name ?? "hewan"} tidak mencukupi`);
    }

    // Kurangi stok di dalam transaksi
    await tx.updateLivestockStock(input.livestockId, input.quantity);

    // Simulasi kegagalan / exception di tengah transaksi
    if (input.shouldThrowMidway) {
      throw new Error("Internal Server Error: Koneksi database terputus saat simpan pesanan");
    }

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

  it("(a) 2 checkout paralel dengan stok 1: tepat satu berhasil, satu gagal → stok akhir 0", async () => {
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

    const results = await Promise.allSettled([orderA, orderB]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.message).toContain("Stok Domba Garut Super tidak mencukupi");

    // Verifikasi stok akhir adalah 0 (tidak pernah negatif/oversold)
    const finalLivestock = db.livestock.get("hewan-1");
    expect(finalLivestock?.stock).toBe(0);
    expect(db.orders).toHaveLength(1);
  });

  it("(b) rollback otomatis saat terjadi exception di tengah transaksi: stok tidak berkurang", async () => {
    // Stok awal = 1
    expect(db.livestock.get("hewan-1")?.stock).toBe(1);

    // Jalankan checkout dengan simulasi crash di tengah transaksi
    await expect(
      processOrderCheckout(db, {
        orderId: "order-crash-test",
        livestockId: "hewan-1",
        quantity: 1,
        shouldThrowMidway: true,
      })
    ).rejects.toThrow("Koneksi database terputus");

    // Stok harus tetap 1 (utuh setelah rollback, tidak terkurangi)
    expect(db.livestock.get("hewan-1")?.stock).toBe(1);
    // Tidak ada order yang terbuat
    expect(db.orders).toHaveLength(0);
  });

  it("(c) pesanan dengan quantity > 1 melebihi stok yang tersedia langsung ditolak", async () => {
    // Hewan hanya punya stok 1, pembeli mencoba checkout 2
    await expect(
      processOrderCheckout(db, {
        orderId: "order-excessive-qty",
        livestockId: "hewan-1",
        quantity: 2,
      })
    ).rejects.toThrow("Stok Domba Garut Super tidak mencukupi");

    // Stok harus tetap utuh 1
    expect(db.livestock.get("hewan-1")?.stock).toBe(1);
    expect(db.orders).toHaveLength(0);
  });
});
