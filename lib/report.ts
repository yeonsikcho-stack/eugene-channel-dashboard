import { getChannelTrend, getDashboardData } from '@/lib/metrics';
import { CHANNELS, CHANNEL_LABELS, currentYearMonth, monthsBetween, shiftYearMonth } from '@/lib/channels';
import {
  buildKpiInsights,
  getChannelKpis,
  getInstagramPisByMonth,
  KPI_TARGETS,
  type KpiInsights,
  type KpiResult,
} from '@/lib/kpi';
import { fetchYoutubeVideosForMonth } from '@/lib/youtube';
import { fetchInstagramPostsForMonth } from '@/lib/instagramMedia';
import { analyzeInstagramPosts, analyzeYoutubeVideos, youtubeWatchUrl } from '@/lib/contentInsights';
import type { Channel, MetricDirection } from '@/types';

const CHANNELS_WITH_REAL_DATA = Object.keys(KPI_TARGETS) as Channel[];

export const REPORT_PLACEHOLDER_NOTES: Partial<Record<Channel, string>> = {
  naver_blog: '매월 데이터 파일을 업로드하는 방식으로 연동 예정입니다.',
  online_sabo: 'API key를 업체에 요청해 전달받는 대로 연동됩니다.',
};

export interface ReportMetric {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  diff: number | null;
  pct: number | null;
  direction: MetricDirection;
}

export interface ReportTopContent {
  title: string;
  url: string | null;
  thumbnailUrl: string | null;
  statsLabel: string;
}

export interface ReportTrend {
  key: string;
  label: string;
  months: string[];
  values: (number | null)[];
}

export interface ReportChannelSection {
  channel: Channel;
  label: string;
  hasData: boolean;
  metrics: ReportMetric[];
  kpis: KpiResult[];
  trends: ReportTrend[];
  topContent: ReportTopContent | null;
  insights: string[];
}

export interface MonthlyReportData {
  yearMonth: string;
  previousYearMonth: string;
  generatedAt: string;
  channels: ReportChannelSection[];
  overallInsights: KpiInsights;
}

async function getTopContent(channel: Channel, yearMonth: string): Promise<ReportTopContent | null> {
  try {
    if (channel === 'youtube') {
      const videos = await fetchYoutubeVideosForMonth(yearMonth);
      const analysis = analyzeYoutubeVideos(videos);
      if (!analysis.topByViews) return null;
      return {
        title: analysis.topByViews.title,
        url: youtubeWatchUrl(analysis.topByViews),
        thumbnailUrl: analysis.topByViews.thumbnailUrl,
        statsLabel: `조회수 ${analysis.topByViews.views?.toLocaleString() ?? '-'}회`,
      };
    }
    if (channel === 'instagram') {
      const posts = await fetchInstagramPostsForMonth(yearMonth);
      const analysis = analyzeInstagramPosts(posts);
      if (!analysis.topByEngagement) return null;
      const { post, total } = analysis.topByEngagement;
      const flatCaption = post.caption?.replace(/\s+/g, ' ').trim();
      return {
        title: flatCaption ? flatCaption.slice(0, 60) : '(제목 없음)',
        url: post.permalink,
        thumbnailUrl: post.thumbnailUrl,
        statsLabel: `참여(좋아요+댓글) ${total.toLocaleString()}건`,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function getKpiTrendSeries(channel: Channel, defKey: string, defLabel: string, yearMonth: string): ReportTrend | null {
  const fromMonth = shiftYearMonth(yearMonth, -5);
  const months = monthsBetween(fromMonth, yearMonth);

  if (channel === 'instagram' && defKey === 'pis') {
    const byMonth = getInstagramPisByMonth(fromMonth, yearMonth);
    return { key: defKey, label: defLabel, months, values: months.map((m) => byMonth.get(m) ?? null) };
  }

  const channelTrend = getChannelTrend(channel, fromMonth, yearMonth);
  const series = channelTrend.series.find((s) => s.key === defKey);
  if (!series) return null;

  return { key: defKey, label: series.label, months: channelTrend.periods, values: series.points.map((p) => p.value) };
}

function getChannelTrends(channel: Channel, yearMonth: string): ReportTrend[] {
  const defs = KPI_TARGETS[channel];
  if (!defs) return [];
  return defs
    .map((def) => getKpiTrendSeries(channel, def.key, def.label, yearMonth))
    .filter((t): t is ReportTrend => t !== null);
}

export async function getMonthlyReportData(yearMonth: string = currentYearMonth()): Promise<MonthlyReportData> {
  const previousYearMonth = shiftYearMonth(yearMonth, -1);
  const dashboard = getDashboardData(yearMonth, previousYearMonth);
  const overallInsights = buildKpiInsights();
  const allInsightLines = [...overallInsights.gaps, ...overallInsights.strengths];

  const channels: ReportChannelSection[] = await Promise.all(
    CHANNELS.map(async (channel) => {
      const hasData = CHANNELS_WITH_REAL_DATA.includes(channel);
      const label = CHANNEL_LABELS[channel];
      const card = dashboard.cards.find((c) => c.channel === channel);

      const metrics: ReportMetric[] = (card?.metrics ?? []).map((m) => ({
        key: m.metricKey,
        label: m.label,
        current: m.change.current,
        previous: m.change.previous,
        diff: m.change.diff,
        pct: m.change.pct,
        direction: m.change.direction,
      }));

      const kpis = hasData ? getChannelKpis(channel) : [];
      const trends = hasData ? getChannelTrends(channel, yearMonth) : [];
      const topContent = hasData ? await getTopContent(channel, yearMonth) : null;
      const insights = allInsightLines.filter((line) => line.startsWith(label));

      return { channel, label, hasData, metrics, kpis, trends, topContent, insights };
    }),
  );

  return { yearMonth, previousYearMonth, generatedAt: new Date().toISOString(), channels, overallInsights };
}
