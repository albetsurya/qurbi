import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac, createHash } from "node:crypto";
import { verifyDokuWebhookSignature } from "@/lib/doku";

// Simulasi Lingkungan E2E Terpadu
interface Livestock {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface Order {
  id: string;
  orderNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  livestockId: string;
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidAt?: Date;
  paymentMethod: string;
  paymentRef?: string;
  paymentUrl?: string;
}

class E2EPlatformApp {
  public livestock = new Map<string, Livestock>();
  public orders = new Map<string, Order>();
  public notifications: Array<{ phone: string; message: string }> = [];

  constructor() {
    this.livestock.set("domba-garut-01", {
      id: "domba-garut-01",
      name: "Domba Garut Kelas A",
      price: 3500000,
      stock: 1,
    });
  }

  // 1. Alur Guest Checkout (api/orders/route.ts)
  async guestCheckout(input: {
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    deliveryType: "DELIVERY" | "PICKUP";
    deliveryAddress?: string;
    paymentMethod: string;
    items: Array<{ livestockId: string; quantity: number }>;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    const item = input.items[0];
    const targetLivestock = this.livestock.get(item.livestockId);

    if (!targetLivestock || targetLivestock.stock < item.quantity) {
      return { success: false, error: "Stok hewan tidak mencukupi" };
    }

    // Atomic transaction: decrement stock & create pending order
    targetLivestock.stock -= item.quantity;
    const orderNumber = `QBK-${Date.now()}-E2E`;
    const newOrder: Order = {
      id: `order-uuid-${Date.now()}`,
      orderNumber,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
      livestockId: item.livestockId,
      quantity: item.quantity,
      totalAmount: targetLivestock.price * item.quantity,
      status: "PENDING",
      paymentMethod: input.paymentMethod,
      paymentUrl: `https://sandbox.doku.com/checkout/${orderNumber}`,
    };

    this.orders.set(orderNumber, newOrder);
    return { success: true, order: newOrder };
  }

  // 2. Alur Webhook DOKU (api/doku/webhook/route.ts)
  async receiveDokuWebhook(opts: {
    timestamp: string;
    requestTarget: string;
    requestId: string;
    signature: string;
    rawBody: string;
  }): Promise<{ status: number; body: { success: boolean; error?: string } }> {
    // A. Verifikasi HMAC Signature
    const isValidSignature = verifyDokuWebhookSignature(
      opts.timestamp,
      opts.requestTarget,
      opts.rawBody,
      opts.signature,
      opts.requestId
    );

    if (!isValidSignature) {
      return { status: 401, body: { success: false, error: "Signature tidak valid" } };
    }

    const payload = JSON.parse(opts.rawBody);
    const invoice = payload.order?.invoice_number;
    const paymentStatus = payload.transaction?.status;

    if (!invoice || paymentStatus !== "SUCCESS") {
      return { status: 200, body: { success: true } };
    }

    const order = this.orders.get(invoice);
    if (!order || order.status !== "PENDING") {
      // Idempotent: jangan proses ulang jika bukan PENDING
      return { status: 200, body: { success: true } };
    }

    // Update order menjadi PAID
    order.status = "PAID";
    order.paidAt = new Date();
    order.paymentRef = payload.service?.id || "DOKU-REF-DEFAULT";

    // Kirim notifikasi WhatsApp
    this.notifications.push({
      phone: order.guestPhone,
      message: `Alhamdulillah, pembayaran pesanan ${order.orderNumber} diterima.`,
    });

    return { status: 200, body: { success: true } };
  }
}

describe("E2E Integration Flow: Guest Checkout → PENDING → DOKU Webhook → PAID", () => {
  const originalEnv = process.env;
  let app: E2EPlatformApp;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DOKU_CLIENT_ID: "E2E-CLIENT-ID",
      DOKU_SECRET_KEY: "E2E-SECRET-KEY-ABC123456",
      DOKU_BASE_URL: "https://api-sandbox.doku.com",
    };
    app = new E2EPlatformApp();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function generateDokuSignature(rawBody: string, timestamp: string, target: string, reqId: string) {
    const digest = createHash("sha256").update(rawBody).digest("base64");
    const component = [
      `Client-Id:${process.env.DOKU_CLIENT_ID}`,
      `Request-Id:${reqId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${target}`,
      `Digest:${digest}`,
    ].join("\n");
    const hmac = createHmac("sha256", process.env.DOKU_SECRET_KEY!).update(component).digest("base64");
    return `HMACSHA256=${hmac}`;
  }

  it("menjalankan alur lengkap end-to-end dari checkout hingga pesanan lunas secara sukses", async () => {
    // LANGKAH 1: Pembeli melakukan Guest Checkout
    const checkoutResult = await app.guestCheckout({
      guestName: "Muhammad Abdullah",
      guestPhone: "081298765432",
      guestEmail: "abdullah@example.com",
      deliveryType: "DELIVERY",
      deliveryAddress: "Jl. Riau No. 45, Bandung",
      paymentMethod: "qris",
      items: [{ livestockId: "domba-garut-01", quantity: 1 }],
    });

    expect(checkoutResult.success).toBe(true);
    const order = checkoutResult.order!;
    expect(order.status).toBe("PENDING");
    expect(order.totalAmount).toBe(3500000);
    expect(order.paidAt).toBeUndefined();

    // Verifikasi stok hewan di kandang langsung berkurang (reservasi stok)
    expect(app.livestock.get("domba-garut-01")?.stock).toBe(0);

    // LANGKAH 2: Simulasi DOKU SNAP mengirimkan Webhook Notifikasi Pembayaran Berhasil
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const requestTarget = "/api/doku/webhook";
    const requestId = "doku-req-e2e-001";
    const webhookBody = JSON.stringify({
      order: { invoice_number: order.orderNumber },
      transaction: { status: "SUCCESS" },
      service: { id: "DOKU-TX-99887766" },
    });

    const validSignature = generateDokuSignature(webhookBody, timestamp, requestTarget, requestId);

    const webhookResponse = await app.receiveDokuWebhook({
      timestamp,
      requestTarget,
      requestId,
      signature: validSignature,
      rawBody: webhookBody,
    });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body.success).toBe(true);

    // LANGKAH 3: Verifikasi Status Pesanan Berubah Menjadi PAID
    const updatedOrder = app.orders.get(order.orderNumber)!;
    expect(updatedOrder.status).toBe("PAID");
    expect(updatedOrder.paidAt).toBeInstanceOf(Date);
    expect(updatedOrder.paymentRef).toBe("DOKU-TX-99887766");

    // LANGKAH 4: Verifikasi Notifikasi WhatsApp Terkirim
    expect(app.notifications).toHaveLength(1);
    expect(app.notifications[0].phone).toBe("081298765432");
    expect(app.notifications[0].message).toContain("Alhamdulillah, pembayaran pesanan");

    // LANGKAH 5: Verifikasi Idempotensi (Webhook identik kedua kali tidak memicu perubahan ganda)
    const duplicateWebhookResponse = await app.receiveDokuWebhook({
      timestamp,
      requestTarget,
      requestId,
      signature: validSignature,
      rawBody: webhookBody,
    });

    expect(duplicateWebhookResponse.status).toBe(200);
    expect(app.notifications).toHaveLength(1); // Tetap 1 notifikasi
    expect(updatedOrder.status).toBe("PAID");
  });
});
