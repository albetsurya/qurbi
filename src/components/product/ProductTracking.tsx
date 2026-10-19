"use client";

import { useEffect, type ReactNode } from "react";

function sendEvent(productId: string, event: "view" | "click") {
  try {
    const payload = JSON.stringify({ productId, event });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics", blob)) return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

/** Kirim 1 event view per sesi saat halaman detail produk dibuka. */
export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    const flag = `qbk-viewed-${productId}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    sendEvent(productId, "view");
  }, [productId]);
  return null;
}

/** Bungkus kartu produk — catat klik (throttle 5 detik per produk). */
export function TrackProductClick({ productId, children }: { productId: string; children: ReactNode }) {
  const onClick = () => {
    try {
      const flag = `qbk-clicked-${productId}`;
      const last = Number(sessionStorage.getItem(flag) ?? 0);
      if (Date.now() - last < 5000) return;
      sessionStorage.setItem(flag, String(Date.now()));
      sendEvent(productId, "click");
    } catch {
      // abaikan
    }
  };
  return (
    <span onClickCapture={onClick} className="contents">
      {children}
    </span>
  );
}
