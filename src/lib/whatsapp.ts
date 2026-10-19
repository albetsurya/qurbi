/** Kirim pesan WhatsApp lewat gateway generik (Fonnte, official API, dsb). */

async function sendMessage(phone: string, message: string): Promise<void> {
  const url = process.env.WHATSAPP_API_URL;
  if (!url) {
    // Mode dev: hanya log ke console supaya alur bisa diuji tanpa gateway.
    console.log(`[WA:dev] → ${phone}: ${message}`);
    return;
  }
  const token = process.env.WHATSAPP_TOKEN;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) {
    console.error(`[WA] gagal mengirim ke ${phone}:`, res.status, await res.text());
  }
}

export async function sendOtp(phone: string, code: string): Promise<void> {
  await sendMessage(
    phone,
    `QurbanKu: Kode OTP kamu adalah *${code}*. Berlaku 5 menit. Jangan berikan kode ini ke siapa pun.`
  );
}

export async function sendOrderNotification(phone: string, message: string): Promise<void> {
  await sendMessage(phone, message);
}
