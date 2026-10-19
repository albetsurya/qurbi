"use client";

import { useCallback, useEffect, useState } from "react";
import apiClient from "@/lib/axios-client";

const QUEUE_KEY = "qbk-offline-queue";

interface QueuedOrder {
  orderNumber: string;
  payload: Record<string, unknown>;
}

function readQueue(): QueuedOrder[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedOrder[];
  } catch {
    return [];
  }
}

let isFlushing = false;

/** Antrean pesanan offline-first: simpan saat offline, kirim ulang saat online. */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);

  const flushQueue = useCallback(async () => {
    if (isFlushing) return;
    isFlushing = true;
    try {
      const queue = readQueue();
      for (const q of queue) {
        try {
          await apiClient.post("/orders", q.payload);
          const remaining = readQueue().filter((x) => x.orderNumber !== q.orderNumber);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        } catch (e: unknown) {
          // Jika error 4xx (validasi invalid / stok habis), hapus dari antrean agar tidak macet selamanya
          const status = (e as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500) {
            console.warn(`Pesanan offline ${q.orderNumber} gagal validasi (${status}), dihapus dari antrean.`);
            const remaining = readQueue().filter((x) => x.orderNumber !== q.orderNumber);
            localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
            continue;
          }
          // Masih offline / server error 5xx — hentikan dan coba lagi saat online berikutnya
          break;
        }
      }
    } finally {
      isFlushing = false;
    }
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      void flushQueue();
    };
    const goOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [flushQueue]);

  const queueOrder = useCallback(async (orderNumber: string, payload: Record<string, unknown>) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...readQueue(), { orderNumber, payload }]));
  }, []);

  return { isOnline, queueOrder };
}
