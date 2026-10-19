import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { consumeVerifiedOtp } from "@/lib/otp";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      id: "whatsapp-otp",
      name: "WhatsApp OTP",
      credentials: {
        phone: { label: "Nomor WhatsApp", type: "text" },
      },
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? "").trim();
        if (!phone) return null;

        // Hanya lanjut kalau OTP terverifikasi via /api/otp/verify (flag sekali pakai di Redis)
        const verified = await consumeVerifiedOtp(phone);
        if (!verified) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Google OAuth: pastikan ada baris User di DB (email sebagai kunci),
    // lalu petakan ke format sesi internal (id DB + role).
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;
      try {
        let dbUser = await prisma.user.findFirst({ where: { email } });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              phone: `google:${account.providerAccountId}`,
              name: user.name ?? email.split("@")[0],
              email,
            },
          });
        }
        user.id = dbUser.id;
        user.role = dbUser.role;
        user.phone = dbUser.phone.startsWith("google:") ? undefined : dbUser.phone;
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
        session.user.phone = token.phone as string | undefined;
      }
      return session;
    },
  },
});
