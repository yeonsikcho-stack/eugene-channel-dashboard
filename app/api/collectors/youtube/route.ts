import { NextResponse } from 'next/server';
import { fetchYoutubeSnapshot } from '@/lib/youtube';
import { upsertMetric } from '@/lib/metrics';
import { currentYearMonth } from '@/lib/channels';

export async function POST() {
  const yearMonth = currentYearMonth();

  let snapshot;
  try {
    snapshot = await fetchYoutubeSnapshot();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '수집에 실패했습니다.' },
      { status: 502 },
    );
  }

  const subscribersResult = upsertMetric({
    channel: 'youtube',
    metricKey: 'subscribers',
    yearMonth,
    value: snapshot.subscribers,
    source: 'auto',
  });
  const viewsResult = upsertMetric({
    channel: 'youtube',
    metricKey: 'views',
    yearMonth,
    value: snapshot.views,
    source: 'auto',
  });

  return NextResponse.json({
    ok: true,
    yearMonth,
    snapshot,
    subscribers: subscribersResult,
    views: viewsResult,
  });
}
