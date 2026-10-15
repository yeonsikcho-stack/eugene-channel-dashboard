import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeDailyTrend } from '@/lib/youtubeAnalytics';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from, to 날짜가 필요합니다.' }, { status: 400 });
  }

  try {
    const trend = await getYoutubeDailyTrend(from, to);
    return NextResponse.json(trend);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '일별 데이터를 가져오지 못했습니다.' },
      { status: 502 },
    );
  }
}
