import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

function parseUserAgent(userAgent: string) {
  let browser = 'Unknown';
  let platform = 'Unknown';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';
  
  if (userAgent.includes('Windows')) platform = 'Windows';
  else if (userAgent.includes('Mac')) platform = 'macOS';
  else if (userAgent.includes('Linux')) platform = 'Linux';
  else if (userAgent.includes('Android')) platform = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';
  
  return { browser, platform };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
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
          const remainingMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
          throw new Error(`Account is temporarily locked. Try again in ${remainingMinutes} minutes.`);
        }

        // Check if account is suspended or deleted
        if (user.status === 'suspended') {
          throw new Error("This account has been suspended.");
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
          const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
          
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              ...(lockUntil ? { lockedUntil: lockUntil } : {}),
            },
          });

          if (lockUntil) {
            throw new Error("Too many failed attempts. Account locked for 15 minutes.");
          }
          throw new Error("Invalid password");
        }

        // Successful login - reset failed attempts
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        // Create session record for device tracking
        try {
          const userAgent = req.headers?.get('user-agent') || '';
          const { browser, platform: os } = parseUserAgent(userAgent);
          const ip = req.headers?.get('x-forwarded-for') || req.headers?.get('x-real-ip') || 'unknown';
          const sessionToken = uuidv4();

          await db.userSession.create({
            data: {
              userId: user.id,
              token: sessionToken,
              deviceName: `${browser} on ${os}`,
              platform: os.toLowerCase().includes('android') || os.toLowerCase().includes('ios') ? os : 'web',
              browser,
              ipAddress: ip.split(',')[0].trim(),
              lastActiveAt: new Date(),
            },
          });
        } catch (e) {
          console.error('Failed to create session record:', e);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
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
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
