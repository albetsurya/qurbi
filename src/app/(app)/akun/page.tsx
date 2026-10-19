"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faUser, faCircleInfo, faGauge } from "@fortawesome/free-solid-svg-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AkunPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p className="py-16 text-center text-sm text-ink-muted" role="status">Memuat...</p>;
  }

  if (!session?.user) {
    return (
      <div className="container-app flex min-h-[60vh] flex-col items-center justify-center gap-4 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-primary/5">
          <FontAwesomeIcon icon={faUser} className="h-7 w-7 text-primary" />
        </span>
        <h1 className="font-heading text-h1 font-semibold">Masuk ke Akunmu</h1>
        <p className="max-w-xs text-sm text-ink-muted">
          Login tanpa password menggunakan kode OTP yang dikirim ke WhatsApp kamu.
        </p>
        <div className="w-full max-w-xs space-y-2">
          <Button onClick={() => void signIn("google", { callbackUrl: "/akun" })} variant="outline">Masuk dengan Google</Button>
          <Button onClick={() => void signIn("whatsapp-otp")}>Masuk via WhatsApp OTP</Button>
        </div>
      </div>
    );
  }

  const u = session.user;
  const isAdmin = u.role === "ADMIN";
  const menuItems = [
    { href: "/pesanan", label: "Pesanan Saya" },
    { href: "/keranjang", label: "Keranjang" },
    ...(isAdmin
      ? [{ href: "/admin/dashboard", label: "Panel Admin — Dashboard" }]
      : []),
    { href: "/tentang", label: "Tentang QurbanKu" },
  ];

  return (
    <div className="container-app space-y-4 py-4">
      <Card className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-primary/10 font-heading text-lg font-bold text-primary">
          {(u.name ?? "Q")[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-h3 font-semibold">{u.name ?? "Jamaah QurbanKu"}</p>
          <p className="truncate text-xs text-ink-muted">{u.phone ?? u.email}</p>
        </div>
        {isAdmin && <Badge variant="verified">Admin</Badge>}
      </Card>

      {isAdmin && (
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 rounded-card bg-primary p-4 text-white shadow-medium transition-transform active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-white/15">
            <FontAwesomeIcon icon={faGauge} className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-heading text-sm font-bold">Buka Panel Admin</span>
            <span className="block text-xs text-white/80">Kelola produk, pesanan & stok</span>
          </span>
          <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 text-white/70" />
        </Link>
      )}

      <Card>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex h-12 items-center justify-between text-sm font-medium">
                {item.label}
                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-start gap-2 rounded-card bg-accent/10 p-3 text-xs text-ink-muted">
        <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Kamu bisa checkout sebagai tamu tanpa login — pesanan tetap bisa dilacak di menu Pesanan.
      </div>

      <Button variant="outline" onClick={() => void signOut({ callbackUrl: "/" })}>Keluar</Button>
    </div>
  );
}
