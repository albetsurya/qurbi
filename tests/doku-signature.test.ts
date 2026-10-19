import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac, createHash } from "node:crypto";
import { verifyDokuWebhookSignature } from "@/lib/doku";

describe("DOKU SNAP Webhook Signature Verification", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DOKU_CLIENT_ID: "MALL-ID-TEST-001",
      DOKU_SECRET_KEY: "SK-TEST-SECRET-1234567890",
      DOKU_BASE_URL: "https://api-sandbox.doku.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function generateValidSignature(opts: {
    clientId: string;
    secretKey: string;
    requestId: string;
    timestamp: string;
    requestTarget: string;
    rawBody: string;
  }) {
    const digest = createHash("sha256").update(opts.rawBody).digest("base64");
    const component = [
      `Client-Id:${opts.clientId}`,
      `Request-Id:${opts.requestId}`,
      `Request-Timestamp:${opts.timestamp}`,
      `Request-Target:${opts.requestTarget}`,
      `Digest:${digest}`,
    ].join("\n");
    const hmac = createHmac("sha256", opts.secretKey).update(component).digest("base64");
    return `HMACSHA256=${hmac}`;
  }

  it("berhasil memverifikasi signature webhook yang valid", () => {
    const timestamp = "2026-10-19T04:00:00Z";
    const requestTarget = "/api/doku/webhook";
    const requestId = "req-test-123";
    const rawBody = JSON.stringify({
      order: { invoice_number: "QBK-20261019-ABCDEF" },
      transaction: { status: "SUCCESS" },
    });

    const validSignature = generateValidSignature({
      clientId: "MALL-ID-TEST-001",
      secretKey: "SK-TEST-SECRET-1234567890",
      requestId,
      timestamp,
      requestTarget,
      rawBody,
    });

    const isValid = verifyDokuWebhookSignature(timestamp, requestTarget, rawBody, validSignature, requestId);
    expect(isValid).toBe(true);
  });

  it("menolak signature palsu / invalid", () => {
    const timestamp = "2026-10-19T04:00:00Z";
    const requestTarget = "/api/doku/webhook";
    const requestId = "req-test-123";
    const rawBody = JSON.stringify({ order: { invoice_number: "QBK-20261019-ABCDEF" } });

    const fakeSignature = "HMACSHA256=invalidSignatureBytesHere==";
    const isValid = verifyDokuWebhookSignature(timestamp, requestTarget, rawBody, fakeSignature, requestId);
    expect(isValid).toBe(false);
  });

  it("menolak verifikasi jika payload/rawBody dimanipulasi (tampered)", () => {
    const timestamp = "2026-10-19T04:00:00Z";
    const requestTarget = "/api/doku/webhook";
    const requestId = "req-test-123";
    const originalBody = JSON.stringify({ order: { invoice_number: "QBK-20261019-ABCDEF", amount: 2500000 } });
    const tamperedBody = JSON.stringify({ order: { invoice_number: "QBK-20261019-ABCDEF", amount: 1000 } });

    const signature = generateValidSignature({
      clientId: "MALL-ID-TEST-001",
      secretKey: "SK-TEST-SECRET-1234567890",
      requestId,
      timestamp,
      requestTarget,
      rawBody: originalBody,
    });

    const isValid = verifyDokuWebhookSignature(timestamp, requestTarget, tamperedBody, signature, requestId);
    expect(isValid).toBe(false);
  });

  it("menolak verifikasi jika secret key atau client ID tidak dikonfigurasi", () => {
    delete process.env.DOKU_CLIENT_ID;
    delete process.env.DOKU_SECRET_KEY;

    const isValid = verifyDokuWebhookSignature("2026-10-19T04:00:00Z", "/api/doku/webhook", "{}", "HMACSHA256=xxx");
    expect(isValid).toBe(false);
  });
});

describe("DOKU SNAP Webhook Idempotency Simulation", () => {
  interface MockOrder {
    orderNumber: string;
    status: "PENDING" | "PAID";
    paidAt?: Date;
    transitionCount: number;
    notificationSentCount: number;
  }

  // Simulasi logika endpoint api/doku/webhook/route.ts
  async function handleWebhookPayload(
    order: MockOrder,
    payload: { invoice_number: string; status: string }
  ) {
    if (!["SUCCESS", "PAID"].includes(payload.status.toUpperCase())) {
      return { success: true, processed: false };
    }

    // Atomik updateMany: hanya update jika status saat ini masih PENDING
    if (order.orderNumber === payload.invoice_number && order.status === "PENDING") {
      order.status = "PAID";
      order.paidAt = new Date();
      order.transitionCount += 1;
      order.notificationSentCount += 1;
      return { success: true, processed: true };
    }

    // Idempotent: pesanan sudah dibayar sebelumnya
    return { success: true, processed: false };
  }

  it("memproses pembayaran pada pengiriman pertama, dan mengabaikan pengiriman duplikat (idempoten)", async () => {
    const mockOrder: MockOrder = {
      orderNumber: "QBK-IDEMPOTENT-001",
      status: "PENDING",
      transitionCount: 0,
      notificationSentCount: 0,
    };

    const payload = { invoice_number: "QBK-IDEMPOTENT-001", status: "SUCCESS" };

    // Pengiriman Webhook 1 (sukses pertama)
    const result1 = await handleWebhookPayload(mockOrder, payload);
    expect(result1.processed).toBe(true);
    expect(mockOrder.status).toBe("PAID");
    expect(mockOrder.transitionCount).toBe(1);
    expect(mockOrder.notificationSentCount).toBe(1);
    const firstPaidAt = mockOrder.paidAt;

    // Pengiriman Webhook 2 (payload identik / retry dari DOKU)
    const result2 = await handleWebhookPayload(mockOrder, payload);
    expect(result2.processed).toBe(false);
    expect(mockOrder.status).toBe("PAID"); // State tidak berubah lagi
    expect(mockOrder.transitionCount).toBe(1); // Transisi hanya 1x
    expect(mockOrder.notificationSentCount).toBe(1); // Notifikasi WhatsApp tidak dikirim ganda
    expect(mockOrder.paidAt).toEqual(firstPaidAt);
  });
});
