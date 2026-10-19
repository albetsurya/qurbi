"use client";

import { useState } from "react";
import { useProducts } from "@/lib/queries/products";
import ProductGrid from "@/components/product/ProductGrid";
import ProductFilter, { type ProductFilters } from "@/components/product/ProductFilter";
import EmptyState from "@/components/shared/EmptyState";
import { ProductGridSkeleton } from "@/components/shared/LoadingSkeleton";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export default function ProdukPage() {
  const [filters, setFilters] = useState<ProductFilters>({ sort: "newest" });
  const params = {
    type: filters.type,
    purpose: filters.purpose,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minWeight: filters.minWeight,
    sort: filters.sort,
    page: 1,
    limit: 24,
  };
  const { data, isLoading, isError, refetch } = useProducts(params);

  return (
    <div className="container-app space-y-4 py-4">
      <h1 className="font-heading text-h1 font-semibold">Cari Hewan</h1>
      <ProductFilter filters={filters} onChange={setFilters} resultCount={data?.total ?? 0} />

      {isLoading && <ProductGridSkeleton count={6} />}

      {isError && (
        <EmptyState
          icon={faMagnifyingGlass}
          title="Gagal memuat katalog"
          description="Periksa koneksi internetmu, lalu coba lagi."
          actionLabel="Coba Lagi"
          onAction={() => void refetch()}
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={faMagnifyingGlass}
          title="Tidak ada hewan yang cocok"
          description="Coba longgarkan filter atau kata kunci pencarianmu."
        />
      )}

      {data && data.items.length > 0 && <ProductGrid items={data.items} />}
    </div>
  );
}
