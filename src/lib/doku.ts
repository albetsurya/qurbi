import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Integrasi DOKU SNAP (server-side only).
 * Jangan pernah import file ini dari komponen client.
 */

export interface DokuCustomer {
  name: string;
  email?: string;
  phone?: string;
}

export interface DokuLineItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateDokuPaymentInput {
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  customer: DokuCustomer;
  items: DokuLineItem[];
  callbackUrl: string;
  successUrl?: string;
  failedUrl?: string;
}

export interface DokuPaymentResult {
  message?: string[];
  response?: {
    order?: { invoice_number?: string; amount?: number };
    payment?: {
      url?: string;
      payment_url?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/** Petakan metode checkout internal → channel DOKU SNAP. */
export function getDokuVaChannel(method: string): string | undefined {
  const map: Record<string, string> = {
    va_bca: "VIRTUAL_ACCOUNT_BCA",
    va_bri: "VIRTUAL_ACCOUNT_BRI",
    va_mandiri: "VIRTUAL_ACCOUNT_BANK_MANDIRI",
    qris: "QRIS",
    dana: "EMONEY_DANA",
    ovo: "EMONEY_OVO",
    shopeepay: "EMONEY_SHOPEEPAY",
    credit_card: "CREDIT_CARD",
  };
  return map[method];
}

function dokuConfig() {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error("DOKU_CLIENT_ID / DOKU_SECRET_KEY belum diisi di environment");
  }
  return {
    clientId,
    secretKey,
    baseUrl: process.env.DOKU_BASE_URL ?? "https://api-sandbox.doku.com",
  };
}

function digestBody(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("base64");
}

function computeSignature(opts: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest: string;
  secretKey: string;
}): string {
  const component = [
    `Client-Id:${opts.clientId}`,
    `Request-Id:${opts.requestId}`,
    `Request-Timestamp:${opts.timestamp}`,
    `Request-Target:${opts.requestTarget}`,
    `Digest:${opts.digest}`,
  ].join("\n");
  const hmac = createHmac("sha256", opts.secretKey).update(component).digest("base64");
  return `HMACSHA256=${hmac}`;
}

export async function createDokuPayment(input: CreateDokuPaymentInput): Promise<DokuPaymentResult> {
  const { clientId, secretKey, baseUrl } = dokuConfig();
  const requestTarget = "/orders/v1/payment";
  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const payload = {
    order: {
      amount: input.amount,
      invoice_number: input.orderNumber,
      callback_url: input.callbackUrl,
      line_items: input.items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    },
    payment: {
      payment_method_types: [input.paymentMethod],
      payment_due_date: 1440,
    },
    customer: {
      name: input.customer.name,
      ...(input.customer.email ? { email: input.customer.email } : {}),
      ...(input.customer.phone ? { phone: input.customer.phone } : {}),
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = computeSignature({
    clientId,
    requestId,
    timestamp,
    requestTarget,
    digest: digestBody(rawBody),
    secretKey,
  });

  const res = await fetch(`${baseUrl}${requestTarget}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body: rawBody,
  });

  const json = (await res.json()) as DokuPaymentResult;
  if (!res.ok) {
    throw new Error(`DOKU error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

/** Verifikasi signature webhook DOKU sebelum memproses pembayaran. */
export function verifyDokuWebhookSignature(
  timestamp: string,
  requestTarget: string,
  rawBody: string,
  signature: string,
  requestId = ""
): boolean {
  try {
    const { clientId, secretKey } = dokuConfig();
    const expected = computeSignature({
      clientId,
      requestId,
      timestamp,
      requestTarget,
      digest: digestBody(rawBody),
      secretKey,
    });
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
