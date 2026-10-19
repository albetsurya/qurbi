import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";
import { queryKeys } from "@/lib/queries/keys";
import type { CheckoutInput } from "@/lib/validators/checkout";

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "DELIVERING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderLivestockSnapshot {
  name: string;
  images: string[];
  type: string;
  cctvUrl?: string | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  quantity: number;
  createdAt: string;
  paidAt: string | null;
  livestock: OrderLivestockSnapshot;
}

export interface OrderDetail extends OrderListItem {
  guestName: string;
  guestPhone: string;
  deliveryType: "DELIVERY" | "PICKUP" | "SLAUGHTER";
  deliveryAddress: string | null;
  notes: string | null;
  paymentUrl: string | null;
  paymentMethod: string;
}

export interface CreateOrderResult {
  id: string;
  orderNumber: string;
  paymentUrl?: string;
}

export function useMyOrders(phone: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.mine(phone),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: OrderListItem[] }>("/orders", {
        params: { phone },
      });
      return res.data.data;
    },
    enabled: Boolean(phone),
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: OrderDetail }>(`/orders/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useAdminOrders(status?: string) {
  return useQuery({
    queryKey: queryKeys.orders.admin(status),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: OrderListItem[] }>("/orders", {
        params: { admin: true, ...(status ? { status } : {}) },
      });
      return res.data.data;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const res = await apiClient.post<{ success: boolean; data: CreateOrderResult }>("/orders", input);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiClient.patch<{ success: boolean; data: OrderDetail }>(`/orders/${id}`, {
        status: status as OrderStatus,
      });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
