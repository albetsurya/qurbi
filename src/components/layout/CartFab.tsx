"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "@/hooks/useCart";

const HIDDEN_ROUTES = ["/keranjang", "/checkout"];

export default function CartFab() {
  const pathname = usePathname();
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  if (count === 0) return null;
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto w-full max-w-app">
      <div className="container-app flex justify-end">
        <Link
          href="/keranjang"
          aria-label={`Buka keranjang, ${count} item`}
          className="btn-press pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-float transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <FontAwesomeIcon icon={faCartShopping} className="h-5 w-5" />
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold text-white ring-2 ring-background"
          >
            {count > 99 ? "99+" : count}
          </span>
        </Link>
      </div>
    </div>
  );
}
