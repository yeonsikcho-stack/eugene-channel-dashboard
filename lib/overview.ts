import { getDashboardData } from '@/lib/metrics';
import { computeChange, shiftYearMonth } from '@/lib/channels';
import { fetchYoutubeMonthlyUploadCount } from '@/lib/youtube';
import { fetchInstagramMonthlyEngagement } from '@/lib/instagramMedia';
import type { MetricChange } from '@/types';

export interface OverviewTile {
  label: string;
  current: number;
  previous: number;
  change: MetricChange;
  scopeNote: string;
}

export interface OverviewSummary {
  yearMonth: string;
  compareMonth: string;
  tiles: {
    content: OverviewTile;
    reach: OverviewTile;
    engagement: OverviewTile;
    audience: OverviewTile;
  };
  insights: string[];
  strengths: string[];
  improvements: string[];
}

interface RankedChange {
  channelLabel: string;
  metricLabel: string;
  pct: number;
  direction: 'up' | 'down';
}

function sumMetric(
  cards: ReturnType<typeof getDashboardData>['cards'],
  picks: { channel: string; metricKey: string }[],
): { current: number; previous: number } {
  let current = 0;
  let previous = 0;
  for (const pick of picks) {
    const card = cards.find((c) => c.channel === pick.channel);
    const metric = card?.metrics.find((m) => m.metricKey === pick.metricKey);
    current += metric?.change.current ?? 0;
    previous += metric?.change.previous ?? 0;
  }
  return { current, previous };
}

async function getContentCount(month: string): Promise<{ value: number; scopeNote: string }> {
  const [youtube, instagram] = await Promise.allSettled([
    fetchYoutubeMonthlyUploadCount(month),
    fetchInstagramMonthlyEngagement(month).then((rows) => rows.find((r) => r.month === month)?.postCount ?? 0),
  ]);

  const parts: string[] = [];
  let value = 0;
  if (youtube.status === 'fulfilled') {
    value += youtube.value;
    parts.push('유튜브');
  }
  if (instagram.status === 'fulfilled') {
    value += instagram.value;
    parts.push('인스타그램');
  }

  return { value, scopeNote: parts.length > 0 ? parts.join('·') : '데이터 없음' };
}

export async function getOverviewSummary(yearMonth: string, compareMonth?: string): Promise<OverviewSummary> {
  const resolvedCompareMonth = compareMonth ?? shiftYearMonth(yearMonth, -1);
  const dashboard = getDashboardData(yearMonth, resolvedCompareMonth);

  const reachSum = sumMetric(dashboard.cards, [
    { channel: 'youtube', metricKey: 'views' },
    { channel: 'instagram', metricKey: 'reach' },
    { channel: 'online_sabo', metricKey: 'views' },
    { channel: 'naver_blog', metricKey: 'views' },
  ]);
  const engagementSum = sumMetric(dashboard.cards, [
    { channel: 'youtube', metricKey: 'likes' },
    { channel: 'youtube', metricKey: 'comments' },
    { channel: 'instagram', metricKey: 'likes' },
    { channel: 'instagram', metricKey: 'comments' },
  ]);
  const audienceSum = sumMetric(dashboard.cards, [
    { channel: 'youtube', metricKey: 'subscribers' },
    { channel: 'instagram', metricKey: 'followers' },
  ]);

  const [contentCurrent, contentPrevious] = await Promise.all([
    getContentCount(yearMonth),
    getContentCount(resolvedCompareMonth),
  ]);

  const tiles = {
    content: {
      label: '콘텐츠 발행량',
      current: contentCurrent.value,
      previous: contentPrevious.value,
      change: computeChange(contentCurrent.value, contentPrevious.value),
      scopeNote: contentCurrent.scopeNote,
    },
    reach: {
      label: '조회·도달',
      current: reachSum.current,
      previous: reachSum.previous,
      change: computeChange(reachSum.current, reachSum.previous),
      scopeNote: '유튜브·유진에버·네이버블로그 조회수 + 인스타그램 도달수',
    },
    engagement: {
      label: '참여(좋아요·댓글)',
      current: engagementSum.current,
      previous: engagementSum.previous,
      change: computeChange(engagementSum.current, engagementSum.previous),
      scopeNote: '유튜브·인스타그램',
    },
    audience: {
      label: '구독자·팔로워',
      current: audienceSum.current,
      previous: audienceSum.previous,
      change: computeChange(audienceSum.current, audienceSum.previous),
      scopeNote: '유튜브 구독자 + 인스타그램 팔로워',
    },
  };

  const ranked = getRankedChanges(dashboard);
  const insights = buildInsights(ranked, tiles);
  const strengths = buildStrengths(ranked);
  const improvements = buildImprovements(ranked);

  return { yearMonth, compareMonth: resolvedCompareMonth, tiles, insights, strengths, improvements };
}

function getRankedChanges(dashboard: ReturnType<typeof getDashboardData>): RankedChange[] {
  const ranked: RankedChange[] = [];
  for (const card of dashboard.cards) {
    for (const metric of card.metrics) {
      if (metric.change.pct !== null && (metric.change.direction === 'up' || metric.change.direction === 'down')) {
        ranked.push({
          channelLabel: card.label,
          metricLabel: metric.label,
          pct: metric.change.pct,
          direction: metric.change.direction,
        });
      }
    }
  }
  return ranked;
}

function buildInsights(ranked: RankedChange[], tiles: OverviewSummary['tiles']): string[] {
  const insights: string[] = [];

  const topGainer = [...ranked].filter((r) => r.direction === 'up').sort((a, b) => b.pct - a.pct)[0];
  const topLoser = [...ranked].filter((r) => r.direction === 'down').sort((a, b) => a.pct - b.pct)[0];

  if (topGainer) {
    insights.push(`${topGainer.channelLabel} ${topGainer.metricLabel}가 전월 대비 +${topGainer.pct}%로 가장 크게 늘었습니다.`);
  }
  if (topLoser) {
    insights.push(`${topLoser.channelLabel} ${topLoser.metricLabel}는 전월 대비 ${topLoser.pct}%로 가장 많이 줄었습니다.`);
  }

  if (tiles.content.change.diff !== null) {
    const direction = tiles.content.change.direction;
    if (direction === 'up' || direction === 'down') {
      const word = direction === 'up' ? '늘었습니다' : '줄었습니다';
      insights.push(`콘텐츠 발행량은 전월 대비 ${Math.abs(tiles.content.change.diff)}건 ${word} (${tiles.content.scopeNote}).`);
    }
  }

  if (insights.length === 0) {
    insights.push('비교할 수 있는 지난달 데이터가 아직 충분하지 않습니다.');
  }

  return insights.slice(0, 3);
}

function buildStrengths(ranked: RankedChange[]): string[] {
  const gainers = [...ranked].filter((r) => r.direction === 'up').sort((a, b) => b.pct - a.pct);
  if (gainers.length === 0) return ['뚜렷하게 오른 지표가 없습니다.'];
  return gainers.slice(0, 3).map((r) => `${r.channelLabel} ${r.metricLabel} +${r.pct}%`);
}

function buildImprovements(ranked: RankedChange[]): string[] {
  const losers = [...ranked].filter((r) => r.direction === 'down').sort((a, b) => a.pct - b.pct);
  if (losers.length === 0) return ['뚜렷하게 내린 지표가 없습니다.'];
  return losers.slice(0, 3).map((r) => `${r.channelLabel} ${r.metricLabel} ${r.pct}%`);
}
