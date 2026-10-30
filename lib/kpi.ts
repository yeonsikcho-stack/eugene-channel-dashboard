import { getDashboardData, getTrend } from '@/lib/metrics';
import { CHANNEL_LABELS, currentYearMonth, monthsBetween } from '@/lib/channels';
import { getRankedChanges } from '@/lib/overview';
import type { Channel } from '@/types';

export type KpiCadence = 'cumulative' | 'monthly_sum';
export type KpiRole = 'growth' | 'engagement';

export interface KpiDef {
  key: string;
  label: string;
  target: number;
  cadence: KpiCadence;
  role: KpiRole;
  note?: string;
}

export const KPI_TARGETS: Partial<Record<Channel, KpiDef[]>> = {
  youtube: [
    { key: 'subscribers', label: '구독자', target: 22360, cadence: 'cumulative', role: 'growth' },
    { key: 'views', label: '조회수', target: 234000, cadence: 'monthly_sum', role: 'engagement' },
  ],
  instagram: [
    { key: 'followers', label: '팔로워', target: 21357, cadence: 'cumulative', role: 'growth' },
    {
      key: 'pis',
      label: 'PIS',
      target: 5832,
      cadence: 'monthly_sum',
      role: 'engagement',
      note: '좋아요+댓글 합산 근사치 (저장수는 API 미제공으로 제외)',
    },
  ],
};

export interface KpiResult {
  key: string;
  label: string;
  target: number;
  cadence: KpiCadence;
  role: KpiRole;
  note?: string;
  current: number | null;
  achievementPct: number | null;
}

function withTopicParticle(word: string): string {
  const lastChar = word.charCodeAt(word.length - 1);
  const hasBatchim = lastChar >= 0xac00 && lastChar <= 0xd7a3 && (lastChar - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? '은' : '는'}`;
}

function withSubjectParticle(word: string): string {
  const lastChar = word.charCodeAt(word.length - 1);
  const hasBatchim = lastChar >= 0xac00 && lastChar <= 0xd7a3 && (lastChar - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? '이' : '가'}`;
}

function sum(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, v) => total + v, 0);
}

function monthlySum(channel: Channel, metricKey: string, fromMonth: string, toMonth: string): number | null {
  const rows = getTrend(channel, fromMonth, toMonth).filter((r) => r.metricKey === metricKey);
  return sum(rows.map((r) => r.value));
}

export function getInstagramPisByMonth(fromMonth: string, toMonth: string): Map<string, number> {
  const rows = getTrend('instagram', fromMonth, toMonth);
  const byMonth = new Map<string, number>();
  for (const row of rows) {
    if (row.metricKey !== 'likes' && row.metricKey !== 'comments') continue;
    byMonth.set(row.yearMonth, (byMonth.get(row.yearMonth) ?? 0) + row.value);
  }
  return byMonth;
}

function instagramPisMonthlySum(fromMonth: string, toMonth: string): number | null {
  return sum([...getInstagramPisByMonth(fromMonth, toMonth).values()]);
}

export function getChannelKpis(channel: Channel): KpiResult[] {
  const defs = KPI_TARGETS[channel];
  if (!defs) return [];

  const thisMonth = currentYearMonth();
  const yearStartMonth = `${thisMonth.slice(0, 4)}-01`;
  const monthsElapsed = monthsBetween(yearStartMonth, thisMonth).length;

  return defs.map((def) => {
    let current: number | null;
    let target = def.target;
    let note = def.note;

    if (def.cadence === 'monthly_sum') {
      current =
        channel === 'instagram' && def.key === 'pis'
          ? instagramPisMonthlySum(yearStartMonth, thisMonth)
          : monthlySum(channel, def.key, yearStartMonth, thisMonth);
      target = def.target * monthsElapsed;
      const scaleNote = `월 목표 ${def.target.toLocaleString()} × ${monthsElapsed}개월`;
      note = note ? `${note} · ${scaleNote}` : scaleNote;
    } else {
      const rows = getTrend(channel, thisMonth, thisMonth).filter((r) => r.metricKey === def.key);
      current = rows[0]?.value ?? null;
    }

    const achievementPct = current !== null ? Math.round((current / target) * 1000) / 10 : null;

    return {
      key: def.key,
      label: def.label,
      target,
      cadence: def.cadence,
      role: def.role,
      note,
      current,
      achievementPct,
    };
  });
}

export function getAllKpis(): Array<KpiResult & { channel: Channel; channelLabel: string }> {
  return (Object.keys(KPI_TARGETS) as Channel[]).flatMap((channel) =>
    getChannelKpis(channel).map((kpi) => ({ ...kpi, channel, channelLabel: CHANNEL_LABELS[channel] })),
  );
}

export interface KpiInsights {
  gaps: string[];
  strengths: string[];
}

export function buildKpiInsights(): KpiInsights {
  const gaps: string[] = [];
  const strengths: string[] = [];

  const withPct = getAllKpis().filter(
    (k): k is typeof k & { achievementPct: number } => k.achievementPct !== null,
  );

  if (withPct.length > 0) {
    const sortedAsc = [...withPct].sort((a, b) => a.achievementPct - b.achievementPct);
    const weakest = sortedAsc[0];
    const strongest = sortedAsc[sortedAsc.length - 1];

    gaps.push(
      `${weakest.channelLabel} ${withSubjectParticle(weakest.label)} 목표 대비 가장 부족합니다 (달성률 ${weakest.achievementPct}%). 가장 먼저 주력이 필요한 지표입니다.`,
    );
    if (strongest.channel !== weakest.channel || strongest.key !== weakest.key) {
      strengths.push(
        `${strongest.channelLabel} ${withTopicParticle(strongest.label)} 목표 대비 가장 잘 달성하고 있습니다 (달성률 ${strongest.achievementPct}%).`,
      );
    }

    for (const channel of Object.keys(KPI_TARGETS) as Channel[]) {
      const channelKpis = withPct.filter((k) => k.channel === channel);
      const growth = channelKpis.find((k) => k.role === 'growth');
      const engagement = channelKpis.find((k) => k.role === 'engagement');
      if (!growth || !engagement) continue;

      const channelSubject = withTopicParticle(growth.channelLabel);

      if (growth.achievementPct < 100 && engagement.achievementPct >= 100) {
        gaps.push(
          `${channelSubject} ${engagement.label}(${engagement.achievementPct}%)는 목표를 초과 달성했지만 ${growth.label}(${growth.achievementPct}%)는 미달입니다. 참여·조회를 ${growth.label} 증가로 전환하는 장치(구독·팔로우 유도) 보완이 필요합니다.`,
        );
      } else if (growth.achievementPct >= 100 && engagement.achievementPct < 100) {
        gaps.push(
          `${channelSubject} ${growth.label}(${growth.achievementPct}%)는 목표를 달성했지만 ${engagement.label}(${engagement.achievementPct}%)는 미달입니다. 콘텐츠 참여도를 끌어올릴 필요가 있습니다.`,
        );
      } else if (growth.achievementPct >= 100 && engagement.achievementPct >= 100) {
        strengths.push(
          `${channelSubject} ${growth.label}·${engagement.label} 모두 목표를 달성했습니다 (${growth.achievementPct}% / ${engagement.achievementPct}%).`,
        );
      } else {
        gaps.push(
          `${channelSubject} ${growth.label}·${engagement.label} 모두 목표 미달입니다 (${growth.achievementPct}% / ${engagement.achievementPct}%). 채널 운영 전반 점검이 필요합니다.`,
        );
      }
    }
  }

  const ranked = getRankedChanges(getDashboardData());
  const topLoser = [...ranked].filter((r) => r.direction === 'down').sort((a, b) => a.pct - b.pct)[0];
  const topGainer = [...ranked].filter((r) => r.direction === 'up').sort((a, b) => b.pct - a.pct)[0];

  if (topLoser) {
    gaps.push(`${topLoser.channelLabel} ${topLoser.metricLabel}는 전월 대비 ${topLoser.pct}%로 가장 크게 줄었습니다. 원인 점검이 필요합니다.`);
  }
  if (topGainer) {
    strengths.push(`${topGainer.channelLabel} ${topGainer.metricLabel}는 전월 대비 +${topGainer.pct}%로 가장 크게 늘었습니다.`);
  }

  if (gaps.length === 0) gaps.push('뚜렷하게 부족한 지표가 없습니다.');
  if (strengths.length === 0) strengths.push('뚜렷하게 강점인 지표가 없습니다.');

  return { gaps, strengths };
}
