"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCartShopping } from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "./ThemeToggle";
import { useCart } from "@/hooks/useCart";

export default function Header({ back = false }: { back?: boolean }) {
  const router = useRouter();
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const onPulse = () => setPulse((p) => p + 1);
    window.addEventListener("qbk:cart-pulse", onPulse);
    return () => window.removeEventListener("qbk:cart-pulse", onPulse);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-background/90 backdrop-blur transition-colors duration-300 dark:border-white/10">
      <div className="container-app flex h-14 items-center gap-1">
        {back && (
          <button
            type="button"
            aria-label="Kembali"
            onClick={() => router.back()}
            className="btn-press flex h-11 w-11 items-center justify-center rounded-control text-ink"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          </button>
        )}
        <Link href="/" className="font-heading text-lg font-bold text-primary">
          Qurban<span className="text-secondary">Ku</span>
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
        <Link
          href="/keranjang"
          aria-label={count > 0 ? `Keranjang, ${count} item` : "Keranjang"}
          data-cart-icon="true"
          className="btn-press relative flex h-11 w-11 items-center justify-center rounded-control text-ink"
        >
          <span key={pulse} className={pulse > 0 ? "animate-badge-pop" : undefined} aria-hidden="true">
            <FontAwesomeIcon icon={faCartShopping} className="h-4 w-4" />
          </span>
          {count > 0 && (
            <span
              key={count}
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-badge-pop items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white ring-2 ring-background"
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
