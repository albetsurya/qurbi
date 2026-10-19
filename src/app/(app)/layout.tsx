import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import CartFab from "@/components/layout/CartFab";
import InstallPrompt from "@/components/layout/InstallPrompt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-app border-black/5 bg-background pb-24 sm:border-x sm:shadow-float dark:border-white/10">
      <Header back />
      <main>{children}</main>
      <CartFab />
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
