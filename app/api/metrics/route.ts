import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData, getTrend, upsertMetric } from '@/lib/metrics';
import { CHANNELS, CHANNEL_METRIC_DEFS, currentYearMonth } from '@/lib/channels';
import type { Channel, MetricSource, UpsertMetricInput } from '@/types';

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

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { channel, metricKey, yearMonth, value, source } = body as UpsertMetricInput;

  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: '알 수 없는 채널입니다.' }, { status: 400 });
  }
  if (!CHANNEL_METRIC_DEFS[channel].some((def) => def.key === metricKey)) {
    return NextResponse.json({ error: '해당 채널에 없는 지표입니다.' }, { status: 400 });
  }
  if (!YEAR_MONTH_PATTERN.test(yearMonth)) {
    return NextResponse.json({ error: 'yearMonth는 YYYY-MM 형식이어야 합니다.' }, { status: 400 });
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return NextResponse.json({ error: 'value는 숫자여야 합니다.' }, { status: 400 });
  }
  const resolvedSource: MetricSource = source === 'auto' ? 'auto' : 'manual';

  const result = upsertMetric({ channel, metricKey, yearMonth, value, source: resolvedSource });
  return NextResponse.json(result);
}
