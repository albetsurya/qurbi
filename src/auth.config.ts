import type { NextAuthConfig } from "next-auth";

/** Konfig edge-safe untuk middleware — tanpa Prisma/providers. */
export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
} satisfies NextAuthConfig;
