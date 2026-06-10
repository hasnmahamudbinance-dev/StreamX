import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.user.count({ take: 1 });
    return Response.json({ ready: true, timestamp: new Date().toISOString() }, { status: 200 });
  } catch {
    return Response.json({ ready: false, timestamp: new Date().toISOString() }, { status: 503 });
  }
}
