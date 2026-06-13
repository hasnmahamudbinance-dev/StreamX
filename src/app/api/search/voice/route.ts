import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/search/voice - Voice search with ASR
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { audio } = body;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      );
    }

    // Use z-ai-web-dev-sdk ASR to transcribe
    const zai = await ZAI.create();
    const asrResponse = await zai.audio.asr.create({ file_base64: audio });
    const transcription = asrResponse.text || '';

    if (!transcription.trim()) {
      return NextResponse.json(
        { error: 'Could not transcribe audio' },
        { status: 422 }
      );
    }

    // Record search in SearchHistory
    try {
      await db.searchHistory.create({
        data: {
          userId,
          query: transcription,
          type: 'multi',
          results: 0,
        },
      });
    } catch (historyError) {
      console.warn('Failed to record voice search history:', historyError);
    }

    // Update TrendingSearch
    try {
      await db.trendingSearch.upsert({
        where: { query: transcription },
        update: { count: { increment: 1 } },
        create: { query: transcription, count: 1 },
      });
    } catch (trendingError) {
      console.warn('Failed to update trending search for voice:', trendingError);
    }

    // Generate search URL (hash-based navigation)
    const searchUrl = `#search?query=${encodeURIComponent(transcription)}`;

    return NextResponse.json({
      text: transcription,
      searchUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Voice search error:', message);
    return NextResponse.json(
      { error: 'Failed to process voice search', details: message },
      { status: 500 }
    );
  }
}
