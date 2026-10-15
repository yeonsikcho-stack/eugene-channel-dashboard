import { NextResponse } from 'next/server';
import { fetchYoutubeSnapshot } from '@/lib/youtube';
import { fetchYoutubeCurrentMonthViews } from '@/lib/youtubeAnalytics';
import { upsertMetric } from '@/lib/metrics';
import { currentYearMonth } from '@/lib/channels';

export async function POST() {
  const yearMonth = currentYearMonth();

  let subscribers;
  try {
    subscribers = (await fetchYoutubeSnapshot()).subscribers;
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
    value: subscribers,
    source: 'auto',
  });

  let views: number | null = null;
  let viewsError: string | null = null;
  let viewsResult = null;
  try {
    views = await fetchYoutubeCurrentMonthViews();
    viewsResult = upsertMetric({ channel: 'youtube', metricKey: 'views', yearMonth, value: views, source: 'auto' });
  } catch (error) {
    viewsError = error instanceof Error ? error.message : '조회수 수집에 실패했습니다. (과거 데이터 연결이 필요합니다)';
  }

  return NextResponse.json({
    ok: true,
    yearMonth,
    snapshot: { subscribers, views },
    results: { subscribers: subscribersResult, views: viewsResult },
    viewsError,
  });
}
