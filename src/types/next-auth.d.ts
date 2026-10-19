import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      phone?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "ADMIN";
    phone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ADMIN";
    phone?: string;
  }
}
