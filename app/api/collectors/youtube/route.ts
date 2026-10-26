import { NextResponse } from 'next/server';
import { fetchYoutubeSnapshot } from '@/lib/youtube';
import { fetchYoutubeCurrentMonthStats } from '@/lib/youtubeAnalytics';
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

  let analyticsStats: { views: number; likes: number; comments: number } | null = null;
  let analyticsError: string | null = null;
  let viewsResult = null;
  let likesResult = null;
  let commentsResult = null;
  try {
    analyticsStats = await fetchYoutubeCurrentMonthStats();
    viewsResult = upsertMetric({ channel: 'youtube', metricKey: 'views', yearMonth, value: analyticsStats.views, source: 'auto' });
    likesResult = upsertMetric({ channel: 'youtube', metricKey: 'likes', yearMonth, value: analyticsStats.likes, source: 'auto' });
    commentsResult = upsertMetric({
      channel: 'youtube',
      metricKey: 'comments',
      yearMonth,
      value: analyticsStats.comments,
      source: 'auto',
    });
  } catch (error) {
    analyticsError = error instanceof Error ? error.message : '조회수/반응 수집에 실패했습니다. (과거 데이터 연결이 필요합니다)';
  }

  return NextResponse.json({
    ok: true,
    yearMonth,
    snapshot: { subscribers, ...analyticsStats },
    results: { subscribers: subscribersResult, views: viewsResult, likes: likesResult, comments: commentsResult },
    viewsError: analyticsError,
  });
}
