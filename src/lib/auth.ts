import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // 4 hours session limit for exam security
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;

        // Persistent Rate Limiter Check (PostgreSQL backed, multi-instance safe)
        const rateLimitKey = `login:${email.toLowerCase()}`;
        const limitCheck = await checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000);

        if (!limitCheck.allowed) {
          throw new Error(`Too many failed attempts. Account locked. Retry in ${limitCheck.retryAfterSec} seconds.`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Successful authentication: Reset rate limit counter in DB
        await resetRateLimit(rateLimitKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          year: user.year,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.year = (user as any).year;
        token.tokenVersion = (user as any).tokenVersion ?? 0;
        token.lastCheckedVersionAt = Date.now(); // Set initial validation timestamp
      }

      // Handle updating the current active session in memory (e.g. after changing password)
      if (trigger === "update" && session) {
        if (session.tokenVersion !== undefined) {
          token.tokenVersion = session.tokenVersion;
          token.lastCheckedVersionAt = Date.now(); // Reset timestamp on active change
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.image !== undefined) {
          token.picture = session.image; // Maps to avatar image
        }
      }

      // Verify token version against database (TTL cache: 60s window to protect DB connections)
      if (token.id) {
        const now = Date.now();
        const lastChecked = (token.lastCheckedVersionAt as number) || 0;

        if (now - lastChecked > 60 * 1000) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true },
          });

          // Invalidate session immediately if token version mismatches
          if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
            return null as any; // Clears the session state and forces re-login
          }

          token.lastCheckedVersionAt = now;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).department = token.department as string | null;
        (session.user as any).year = token.year as string | null;
        (session.user as any).tokenVersion = token.tokenVersion as number;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export async function getCurrentUser() {
  const session = await auth();
  return session?.user as {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
    department?: string | null;
    year?: string | null;
  } | null;
}

export async function requireRole(allowedRoles: ("ADMIN" | "TEACHER" | "STUDENT")[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Unauthenticated user");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Role ${user.role} does not have permission`);
  }
  return user;
}
