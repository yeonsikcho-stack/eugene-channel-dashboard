import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData, getTrend } from '@/lib/metrics';
import { CHANNELS, currentYearMonth } from '@/lib/channels';
import type { Channel } from '@/types';

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');
  const fromMonth = searchParams.get('fromMonth');
  const toMonth = searchParams.get('toMonth');

  if (channel && fromMonth && toMonth) {
    if (!CHANNELS.includes(channel as Channel)) {
      return NextResponse.json({ error: '알 수 없는 채널입니다.' }, { status: 400 });
    }
    return NextResponse.json(getTrend(channel, fromMonth, toMonth));
  }

  const yearMonth = searchParams.get('yearMonth') ?? currentYearMonth();
  if (!YEAR_MONTH_PATTERN.test(yearMonth)) {
    return NextResponse.json({ error: 'yearMonth는 YYYY-MM 형식이어야 합니다.' }, { status: 400 });
  }

  return NextResponse.json(getDashboardData(yearMonth));
}
