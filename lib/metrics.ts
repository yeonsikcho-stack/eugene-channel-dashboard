import { getDB } from '@/lib/db';
import {
  CHANNELS,
  CHANNEL_LABELS,
  CHANNEL_METRIC_DEFS,
  computeChange,
  currentYearMonth,
  monthsBetween,
  shiftYearMonth,
} from '@/lib/channels';
import type {
  Channel,
  ChannelCard,
  ChannelMetricRow,
  ChannelTrend,
  DashboardData,
  MetricSource,
  UpsertMetricInput,
  UpsertMetricResult,
} from '@/types';

interface MetricRecord {
  channel: string;
  metric_key: string;
  year_month: string;
  value: number;
  source: MetricSource;
  is_manual_override: number;
  collected_at: string;
}

export function getDashboardData(yearMonth: string = currentYearMonth(), compareMonth?: string): DashboardData {
  const db = getDB();
  const stmt = db.prepare(
    `SELECT * FROM channel_metrics WHERE channel = ? AND metric_key = ? AND year_month = ?`,
  );
  const previousYearMonth = compareMonth ?? shiftYearMonth(yearMonth, -1);

  const cards: ChannelCard[] = CHANNELS.map((channel) => ({
    channel,
    label: CHANNEL_LABELS[channel],
    metrics: CHANNEL_METRIC_DEFS[channel].map((def) => {
      const currentRow = stmt.get(channel, def.key, yearMonth) as MetricRecord | undefined;
      const previousRow = stmt.get(channel, def.key, previousYearMonth) as MetricRecord | undefined;
      const change = computeChange(
        currentRow ? currentRow.value : null,
        previousRow ? previousRow.value : null,
      );

      return {
        metricKey: def.key,
        label: def.label,
        change,
        source: currentRow ? currentRow.source : null,
        isManualOverride: currentRow ? Boolean(currentRow.is_manual_override) : false,
        collectedAt: currentRow ? currentRow.collected_at : null,
      };
    }),
  }));

  return { yearMonth, previousYearMonth, cards };
}

export function getChannelTrend(channel: Channel, fromMonth?: string, toMonth?: string): ChannelTrend {
  const end = toMonth ?? currentYearMonth();
  const start = fromMonth ?? shiftYearMonth(end, -5);
  const rows = getTrend(channel, start, end);
  const periods = monthsBetween(start, end);

  const byMetric = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!byMetric.has(row.metricKey)) byMetric.set(row.metricKey, new Map());
    byMetric.get(row.metricKey)!.set(row.yearMonth, row.value);
  }

  const series = CHANNEL_METRIC_DEFS[channel].map((def) => ({
    key: def.key,
    label: def.label,
    points: periods.map((period) => ({ key: period, value: byMetric.get(def.key)?.get(period) ?? null })),
  }));

  return { channel, label: CHANNEL_LABELS[channel], granularity: 'month', periods, series };
}

export function getTrend(channel: string, fromMonth: string, toMonth: string): ChannelMetricRow[] {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT * FROM channel_metrics WHERE channel = ? AND year_month BETWEEN ? AND ? ORDER BY year_month ASC`,
    )
    .all(channel, fromMonth, toMonth) as MetricRecord[];

  return rows.map(toChannelMetricRow);
}

export function upsertMetric(input: UpsertMetricInput): UpsertMetricResult {
  const db = getDB();
  const existing = db
    .prepare(
      `SELECT is_manual_override FROM channel_metrics WHERE channel = ? AND metric_key = ? AND year_month = ?`,
    )
    .get(input.channel, input.metricKey, input.yearMonth) as { is_manual_override: number } | undefined;

  if (existing?.is_manual_override && input.source === 'auto') {
    return { ok: false, skippedReason: 'manual_override' };
  }

  db.prepare(
    `INSERT INTO channel_metrics (channel, metric_key, year_month, value, source, is_manual_override, collected_at)
     VALUES (@channel, @metric_key, @year_month, @value, @source, @is_manual_override, datetime('now', 'localtime'))
     ON CONFLICT (channel, metric_key, year_month) DO UPDATE SET
       value = excluded.value,
       source = excluded.source,
       is_manual_override = excluded.is_manual_override,
       collected_at = excluded.collected_at`,
  ).run({
    channel: input.channel,
    metric_key: input.metricKey,
    year_month: input.yearMonth,
    value: input.value,
    source: input.source,
    is_manual_override: input.source === 'manual' ? 1 : 0,
  });

  return { ok: true };
}

function toChannelMetricRow(record: MetricRecord): ChannelMetricRow {
  return {
    channel: record.channel as ChannelMetricRow['channel'],
    metricKey: record.metric_key,
    yearMonth: record.year_month,
    value: record.value,
    source: record.source,
    isManualOverride: Boolean(record.is_manual_override),
    collectedAt: record.collected_at,
  };
}
