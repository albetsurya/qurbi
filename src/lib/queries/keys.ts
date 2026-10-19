export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (params: Record<string, unknown>) => ["products", "list", params] as const,
    detail: (slug: string) => ["products", "detail", slug] as const,
  },
  orders: {
    all: ["orders"] as const,
    mine: (phone: string | undefined) => ["orders", "mine", phone ?? "anon"] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
    admin: (status?: string) => ["orders", "admin", status ?? "all"] as const,
  },
};
