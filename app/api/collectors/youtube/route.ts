import { NextResponse } from 'next/server';
import { runCollector } from '@/lib/collectors';
import { fetchYoutubeSnapshot } from '@/lib/youtube';

export async function POST() {
  const result = await runCollector('youtube', fetchYoutubeSnapshot);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
