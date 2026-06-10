import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
  secret: process.env.NEXTAUTH_SECRET,
};
