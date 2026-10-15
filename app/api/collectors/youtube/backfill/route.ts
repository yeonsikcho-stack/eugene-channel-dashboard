import { NextRequest, NextResponse } from 'next/server';
import { backfillYoutubeHistory } from '@/lib/youtubeBackfill';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const startMonth: string = body.startMonth ?? '2026-01';

  try {
    const result = await backfillYoutubeHistory(startMonth);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '과거 데이터 수집에 실패했습니다.' },
      { status: 502 },
    );
  }
}
