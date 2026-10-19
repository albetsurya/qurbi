import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import CartFab from "@/components/layout/CartFab";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-app border-black/5 bg-background pb-24 transition-colors duration-300 sm:border-x sm:shadow-float dark:border-white/10">
      <Header />
      <main>{children}</main>
      <CartFab />
      <footer className="container-app py-8 text-center text-xs text-ink-muted">
        © 2026 QurbanKu — Qurban & Aqiqah Online
      </footer>
      <BottomNav />
    </div>
  );
}
