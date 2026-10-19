import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";
import { queryKeys } from "@/lib/queries/keys";

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  type: "KAMBING" | "DOMBA" | "SAPI";
  purpose: "QURBAN" | "AQIQAH" | "BOTH";
  weightKg: string;
  price: string;
  stock: number;
  images: string[];
  isVerified: boolean;
  breeder: { name: string; location: string; isVerified: boolean };
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductDetail extends Omit<ProductListItem, "breeder"> {
  ageMonths: number;
  gender: string;
  description: string | null;
  videoUrl: string | null;
  cctvUrl: string | null;
  vaccines: { name: string; date: string }[] | null;
  breeder: {
    name: string;
    location: string;
    isVerified: boolean;
    rating: number;
    reviewCount: number;
  };
}

export interface ProductQueryParams {
  type?: string;
  purpose?: string;
  minPrice?: number;
  maxPrice?: number;
  minWeight?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: ProductListResponse }>("/products", {
        params,
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useProductDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(slug),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: ProductDetail }>(`/products/${slug}`);
      return res.data.data;
    },
    enabled: Boolean(slug),
  });
}
