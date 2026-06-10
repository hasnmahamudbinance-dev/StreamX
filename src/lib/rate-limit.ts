import { db } from '@/lib/db';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  endpoint: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  ipAddress: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / options.windowMs) * options.windowMs
  );

  // Find or create rate limit record
  const existing = await db.rateLimitLog.findUnique({
    where: {
      ipAddress_endpoint_windowStart: {
        ipAddress,
        endpoint: options.endpoint,
        windowStart,
      },
    },
  });

  if (!existing) {
    await db.rateLimitLog.create({
      data: {
        ipAddress,
        endpoint: options.endpoint,
        requests: 1,
        windowStart,
      },
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: new Date(windowStart.getTime() + options.windowMs),
    };
  }

  if (existing.requests >= options.maxRequests) {
    if (!existing.blocked) {
      await db.rateLimitLog.update({
        where: { id: existing.id },
        data: { blocked: true },
      });
    }
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(windowStart.getTime() + options.windowMs),
    };
  }

  await db.rateLimitLog.update({
    where: { id: existing.id },
    data: { requests: existing.requests + 1 },
  });

  return {
    allowed: true,
    remaining: options.maxRequests - existing.requests - 1,
    resetAt: new Date(windowStart.getTime() + options.windowMs),
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
