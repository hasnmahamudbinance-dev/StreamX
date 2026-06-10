import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Validate NEXTAUTH_SECRET at module load time — block startup if missing in production
if (!process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: NEXTAUTH_SECRET is not set. Authentication cannot work without it. " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  console.warn(
    "WARNING: NEXTAUTH_SECRET is not set. Using insecure default for development only. " +
    "Set NEXTAUTH_SECRET before deploying to production."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
          const remainingMins = Math.ceil(remainingMs / 60000);
          throw new Error(`Account is temporarily locked. Try again in ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}.`);
        }

        // Check if account is suspended or deleted
        if (user.status === 'suspended') {
          throw new Error("Your account has been suspended. Please contact support.");
        }
        if (user.status === 'deleted') {
          throw new Error("This account has been deleted.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          // Increment failed login attempts
          const newAttempts = user.failedLoginAttempts + 1;

          // Lock account after 5 failed attempts for 15 minutes
          if (newAttempts >= 5) {
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newAttempts,
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
              },
            });
            throw new Error("Too many failed attempts. Your account has been locked for 15 minutes.");
          }

          await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newAttempts },
          });

          const remainingAttempts = 5 - newAttempts;
          throw new Error(`Invalid password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before account lock.`);
        }

        // Check email verification status (allow login but flag it)
        // Reset failed login attempts on successful password check
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          status: user.status,
        };
      },
    }),
    // Google OAuth — only enabled when env vars are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign-in — auto-create user if not exists
      if (account?.provider === 'google' && user.email) {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Auto-create user from Google profile
            const newUser = await db.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split('@')[0],
                password: await bcrypt.hash(Math.random().toString(36), 12), // random password for OAuth users
                role: 'user',
                emailVerified: true, // Google emails are pre-verified
                status: 'active',
              },
            });
            (user as any).id = newUser.id;
            (user as any).role = newUser.role;
            (user as any).emailVerified = newUser.emailVerified;
            (user as any).status = newUser.status;
          } else {
            // Check if account is suspended/deleted
            if (existingUser.status === 'suspended' || existingUser.status === 'deleted') {
              return false;
            }
            (user as any).id = existingUser.id;
            (user as any).role = existingUser.role;
            (user as any).emailVerified = existingUser.emailVerified;
            (user as any).status = existingUser.status;

            // Mark email as verified if it wasn't already
            if (!existingUser.emailVerified) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: true },
              });
            }
          }
        } catch (error) {
          console.error('Google OAuth sign-in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id || user.id;
        token.role = (user as any).role;
        token.emailVerified = (user as any).emailVerified;
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).emailVerified = token.emailVerified;
        (session.user as any).status = token.status;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== "production" ? "insecure-dev-only-secret-do-not-use-in-prod" : undefined),
};
