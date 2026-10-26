import { fetchInstagramSnapshot } from '@/lib/instagram';
import { fetchInstagramMonthlyInsights } from '@/lib/instagramAnalytics';
import { upsertMetric } from '@/lib/metrics';
import { currentYearMonth } from '@/lib/channels';
import type { UpsertMetricResult } from '@/types';

/**
 * 팔로워는 오늘의 실제 팔로워수에서, Instagram이 주는 "하루 팔로워 증가량"을
 * 거꾸로 빼며 과거 월말 값을 근사한다. 인스타그램은 언팔로우(감소분)를 별도로
 * 주지 않아서, 언팔로우가 있었던 달은 실제보다 낮게 나올 수 있다 (근사치).
 * 도달수는 그 달에 발생한 값(기간 합계)을 그대로 저장한다.
 */
export async function backfillInstagramHistory(startMonth: string) {
  const nowMonth = currentYearMonth();
  const startDate = `${startMonth}-01`;
  const endDate = new Date().toISOString().slice(0, 10);

  const [snapshot, rows] = await Promise.all([
    fetchInstagramSnapshot(),
    fetchInstagramMonthlyInsights(startDate, endDate),
  ]);

  const byMonthDesc = [...rows].filter((r) => r.month <= nowMonth).sort((a, b) => (a.month < b.month ? 1 : -1));

  let cumulativeFollowers = snapshot.followers;

  const results: Record<string, { followers: UpsertMetricResult; reach: UpsertMetricResult }> = {};

  for (const row of byMonthDesc) {
    results[row.month] = {
      followers: upsertMetric({
        channel: 'instagram',
        metricKey: 'followers',
        yearMonth: row.month,
        value: Math.round(cumulativeFollowers),
        source: 'auto',
      }),
      reach: upsertMetric({
        channel: 'instagram',
        metricKey: 'reach',
        yearMonth: row.month,
        value: row.reach,
        source: 'auto',
      }),
    };

    cumulativeFollowers -= row.followerGained;
  }

  return { ok: true as const, months: byMonthDesc.map((r) => r.month), results };
}
