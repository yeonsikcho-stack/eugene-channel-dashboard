import { upsertMetric } from '@/lib/metrics';
import { currentYearMonth } from '@/lib/channels';
import type { Channel, MetricSource, UpsertMetricResult } from '@/types';

export type CollectorResult =
  | { ok: true; yearMonth: string; snapshot: Record<string, number>; results: Record<string, UpsertMetricResult> }
  | { ok: false; error: string };

export async function runCollector(
  channel: Channel,
  fetchSnapshot: () => Promise<Record<string, number>>,
  source: MetricSource = 'auto',
): Promise<CollectorResult> {
  const yearMonth = currentYearMonth();

  let snapshot: Record<string, number>;
  try {
    snapshot = await fetchSnapshot();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '수집에 실패했습니다.' };
  }

  const results: Record<string, UpsertMetricResult> = {};
  for (const [metricKey, value] of Object.entries(snapshot)) {
    results[metricKey] = upsertMetric({ channel, metricKey, yearMonth, value, source });
  }

  return { ok: true, yearMonth, snapshot, results };
}
