import { db } from '@/lib/db';

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

interface CheckResult {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  details: string;
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: { db: CheckResult; tmdb: CheckResult } = {
    db: { status: 'unhealthy', responseTime: 0, details: '' },
    tmdb: { status: 'unhealthy', responseTime: 0, details: '' },
  };

  // Check database connectivity
  const dbStart = performance.now();
  try {
    await db.user.count({ take: 1 });
    const dbEnd = performance.now();
    checks.db = {
      status: 'healthy',
      responseTime: Math.round(dbEnd - dbStart),
      details: 'Database connection is active',
    };
  } catch (error) {
    const dbEnd = performance.now();
    checks.db = {
      status: 'unhealthy',
      responseTime: Math.round(dbEnd - dbStart),
      details: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // Check TMDB API connectivity
  const tmdbStart = performance.now();
  try {
    const tmdbUrl = `${TMDB_BASE_URL}/configuration?api_key=${TMDB_API_KEY}`;
    const tmdbResponse = await fetch(tmdbUrl, { signal: AbortSignal.timeout(5000) });
    const tmdbEnd = performance.now();

    if (tmdbResponse.ok) {
      checks.tmdb = {
        status: 'healthy',
        responseTime: Math.round(tmdbEnd - tmdbStart),
        details: 'TMDB API is reachable',
      };
    } else {
      checks.tmdb = {
        status: 'unhealthy',
        responseTime: Math.round(tmdbEnd - tmdbStart),
        details: `TMDB API returned status ${tmdbResponse.status}`,
      };
    }
  } catch (error) {
    const tmdbEnd = performance.now();
    checks.tmdb = {
      status: 'unhealthy',
      responseTime: Math.round(tmdbEnd - tmdbStart),
      details: error instanceof Error ? error.message : 'TMDB API unreachable',
    };
  }

  // Determine overall status
  const allHealthy = checks.db.status === 'healthy' && checks.tmdb.status === 'healthy';
  const anyHealthy = checks.db.status === 'healthy' || checks.tmdb.status === 'healthy';
  const status: 'healthy' | 'degraded' | 'unhealthy' = allHealthy
    ? 'healthy'
    : anyHealthy
      ? 'degraded'
      : 'unhealthy';

  // System info
  const memoryUsage = process.memoryUsage();
  const system = {
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
  };

  const statusCode = status === 'unhealthy' ? 503 : 200;

  return Response.json(
    {
      status,
      timestamp,
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      checks,
      system,
    },
    { status: statusCode }
  );
}
