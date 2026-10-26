import { fetchYoutubeSnapshot } from '@/lib/youtube';
import { fetchYoutubeMonthlyAnalytics } from '@/lib/youtubeAnalytics';
import { upsertMetric } from '@/lib/metrics';
import { currentYearMonth } from '@/lib/channels';
import type { UpsertMetricResult } from '@/types';

/**
 * 구독자수는 "누적 총원"이라 YouTube Data API의 현재 값에서 Analytics API의
 * 월별 증감(subscribersGained/Lost)을 거꾸로 빼며 과거 월말 시점 값을 복원한다.
 * 조회수는 "그 달에 발생한 조회수"(기간 값)라서 Analytics API가 주는 월별
 * views를 그대로 저장하면 된다 — 되짚어 계산할 필요가 없다.
 *
 * Analytics API의 `dimensions=month` 리포트는 startDate/endDate 둘 다
 * 그 달의 1일이어야 한다.
 */
export async function backfillYoutubeHistory(startMonth: string) {
  const nowMonth = currentYearMonth();
  const startDate = `${startMonth}-01`;
  const endDate = `${nowMonth}-01`;

  const [snapshot, rows] = await Promise.all([
    fetchYoutubeSnapshot(),
    fetchYoutubeMonthlyAnalytics(startDate, endDate),
  ]);

  const byMonthDesc = [...rows].sort((a, b) => (a.month < b.month ? 1 : -1));

  let cumulativeSubscribers = snapshot.subscribers;

  const results: Record<
    string,
    { subscribers: UpsertMetricResult; views: UpsertMetricResult; likes: UpsertMetricResult; comments: UpsertMetricResult }
  > = {};

  for (const row of byMonthDesc) {
    results[row.month] = {
      subscribers: upsertMetric({
        channel: 'youtube',
        metricKey: 'subscribers',
        yearMonth: row.month,
        value: Math.round(cumulativeSubscribers),
        source: 'auto',
      }),
      views: upsertMetric({
        channel: 'youtube',
        metricKey: 'views',
        yearMonth: row.month,
        value: row.views,
        source: 'auto',
      }),
      likes: upsertMetric({
        channel: 'youtube',
        metricKey: 'likes',
        yearMonth: row.month,
        value: row.likes,
        source: 'auto',
      }),
      comments: upsertMetric({
        channel: 'youtube',
        metricKey: 'comments',
        yearMonth: row.month,
        value: row.comments,
        source: 'auto',
      }),
    };

    cumulativeSubscribers -= row.subscribersGained - row.subscribersLost;
  }

  return { ok: true as const, months: byMonthDesc.map((r) => r.month), results };
}
