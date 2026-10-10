export type Channel = 'online_sabo' | 'youtube' | 'instagram' | 'naver_blog';

export type MetricSource = 'auto' | 'manual';

export type MetricDirection = 'up' | 'down' | 'flat' | 'na';

export interface ChannelMetricRow {
  channel: Channel;
  metricKey: string;
  yearMonth: string;
  value: number;
  source: MetricSource;
  isManualOverride: boolean;
  collectedAt: string;
}

export interface MetricChange {
  current: number | null;
  previous: number | null;
  diff: number | null;
  pct: number | null;
  direction: MetricDirection;
}

export interface MetricCardItem {
  metricKey: string;
  label: string;
  change: MetricChange;
  source: MetricSource | null;
  isManualOverride: boolean;
  collectedAt: string | null;
}

export interface ChannelCard {
  channel: Channel;
  label: string;
  metrics: MetricCardItem[];
}

export interface DashboardData {
  yearMonth: string;
  previousYearMonth: string;
  cards: ChannelCard[];
}

export interface UpsertMetricInput {
  channel: Channel;
  metricKey: string;
  yearMonth: string;
  value: number;
  source: MetricSource;
}

export interface UpsertMetricResult {
  ok: boolean;
  skippedReason?: 'manual_override';
}
