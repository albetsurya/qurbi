import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <div className="container-app space-y-4 py-4">
      <h1 className="font-heading text-h1 font-semibold">Panel Penjual</h1>
      <Tabs defaultValue="">
        <TabsList>
          <Link href="/admin/dashboard" className="flex-1"><TabsTrigger value="dashboard" className="w-full">Dashboard</TabsTrigger></Link>
          <Link href="/admin/produk" className="flex-1"><TabsTrigger value="produk" className="w-full">Produk</TabsTrigger></Link>
          <Link href="/admin/pesanan" className="flex-1"><TabsTrigger value="pesanan" className="w-full">Pesanan</TabsTrigger></Link>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
