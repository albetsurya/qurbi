"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faPaw, faReceipt, faUser } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Beranda", icon: faHouse },
  { href: "/produk", label: "Katalog", icon: faPaw },
  { href: "/pesanan", label: "Pesanan", icon: faReceipt },
  { href: "/akun", label: "Akun", icon: faUser },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-app border-t border-black/5 bg-surface/95 shadow-float backdrop-blur-md safe-bottom dark:border-white/10"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-[60px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors duration-200 active:scale-95",
                active ? "text-primary" : "text-ink-muted hover:text-ink"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mb-0.5 h-1 w-1 rounded-full transition-all duration-200",
                  active ? "scale-100 bg-primary opacity-100" : "scale-0 opacity-0"
                )}
              />
              <FontAwesomeIcon
                icon={item.icon}
                className={cn(
                  "h-5 w-5 transition-transform duration-200 ease-out group-active:scale-90",
                  active ? "-translate-y-px scale-110" : "scale-100"
                )}
              />
              <span className={cn(active && "font-semibold")}>{item.label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-8 bottom-1 h-0.5 rounded-full bg-primary/20"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
