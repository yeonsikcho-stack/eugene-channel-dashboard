import Link from 'next/link';
import { PlayCircle, Camera, Rss, Newspaper, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CollectButton } from '@/components/CollectButton';
import { CollectAllButton } from '@/components/CollectAllButton';
import { Sparkline } from '@/components/Sparkline';
import { PeriodControls } from '@/components/PeriodControls';
import { getChannelTrend, getDashboardData } from '@/lib/metrics';
import { getOverviewSummary, type OverviewTile } from '@/lib/overview';
import { currentYearMonth, shiftYearMonth } from '@/lib/channels';
import type { Channel, MetricCardItem, MetricChange } from '@/types';

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  youtube: PlayCircle,
  instagram: Camera,
  naver_blog: Rss,
  online_sabo: Newspaper,
};

interface HomePageProps {
  searchParams: Promise<{ yearMonth?: string; compareMonth?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const yearMonth = params.yearMonth ?? currentYearMonth();
  const compareMonth = params.compareMonth ?? shiftYearMonth(yearMonth, -1);

  const data = getDashboardData(yearMonth, compareMonth);

  let summary: Awaited<ReturnType<typeof getOverviewSummary>> | null = null;
  try {
    summary = await getOverviewSummary(yearMonth, compareMonth);
  } catch {
    summary = null;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">채널 운영 브리핑</h1>
          <p className="text-sm text-[var(--ink-secondary)] mt-1">
            {yearMonth} · {compareMonth} 대비
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CollectAllButton />
          <Link
            href="/entry"
            className="text-sm px-3.5 py-2 rounded-md bg-[var(--ink)] text-white hover:bg-[#2a2d3d] transition-colors"
          >
            수동 입력
          </Link>
        </div>
      </div>

      <div className="mb-5">
        <PeriodControls yearMonth={yearMonth} compareMonth={compareMonth} />
      </div>

      {summary && (
        <div className="bg-[var(--ink)] text-white rounded-xl px-6 py-5 mb-6">
          <div className="text-[11px] tracking-[0.2em] uppercase text-white/40 mb-2.5">오늘의 브리핑</div>
          <ul className="space-y-1.5">
            {summary.insights.map((line, i) => (
              <li key={i} className="text-[15px] leading-snug text-balance">
                <span className="text-[#7c9bff] mr-2">●</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--success-soft)] border border-[var(--border)] rounded-xl px-5 py-4">
            <div className="text-[11px] tracking-wide uppercase text-[var(--success)] mb-2">잘한 점</div>
            <ul className="space-y-1">
              {summary.strengths.map((line, i) => (
                <li key={i} className="text-sm text-[var(--ink)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[var(--danger-soft)] border border-[var(--border)] rounded-xl px-5 py-4">
            <div className="text-[11px] tracking-wide uppercase text-[var(--danger)] mb-2">보완 필요</div>
            <ul className="space-y-1">
              {summary.improvements.map((line, i) => (
                <li key={i} className="text-sm text-[var(--ink)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiTile tile={summary.tiles.content} />
          <KpiTile tile={summary.tiles.reach} />
          <KpiTile tile={summary.tiles.engagement} />
          <KpiTile tile={summary.tiles.audience} />
        </div>
      )}

      <div className="text-[11px] text-[var(--ink-muted)] tracking-[0.15em] uppercase mb-3">채널별 현황</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {data.cards.map((card) => {
          const lastUpdated = card.metrics
            .map((metric) => metric.collectedAt)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1);
          const trend = getChannelTrend(card.channel);
          const Icon = CHANNEL_ICONS[card.channel];

          return (
            <Card key={card.channel} className="border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <Link href={`/channels/${card.channel}`} className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon size={15} />
                  </span>
                  {card.label}
                </Link>
                <Link href={`/channels/${card.channel}`} className="text-xs text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors">
                  자세히 보기 →
                </Link>
              </div>
              <div className="space-y-3">
                {card.metrics.map((metric) => (
                  <MetricRow
                    key={metric.metricKey}
                    metric={metric}
                    sparklinePoints={trend.series.find((s) => s.key === metric.metricKey)?.points.map((p) => p.value) ?? []}
                  />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--border-soft)] text-xs text-[var(--ink-muted)]">
                마지막 업데이트: {lastUpdated ?? '아직 없음'}
              </div>
              {card.channel !== 'naver_blog' && <CollectButton channel={card.channel} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function KpiTile({ tile }: { tile: OverviewTile }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)] p-5 shadow-[0_1px_2px_rgba(20,22,31,0.04)]">
      <div className="text-[11px] text-[var(--ink-muted)] tracking-wide uppercase mb-2">{tile.label}</div>
      <div className="text-[28px] font-semibold text-[var(--ink)] tabular-nums leading-none mb-2.5">
        {tile.current.toLocaleString()}
      </div>
      <ChangeBadge change={tile.change} />
      <div className="text-[11px] text-[var(--ink-muted)] mt-2.5 leading-snug">{tile.scopeNote}</div>
    </div>
  );
}

function MetricRow({ metric, sparklinePoints }: { metric: MetricCardItem; sparklinePoints: (number | null)[] }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3 last:border-0 last:pb-0">
      <div>
        <div className="text-xs text-[var(--ink-muted)]">{metric.label}</div>
        <div className="text-lg font-semibold text-[var(--ink)] tabular-nums">
          {metric.change.current !== null ? metric.change.current.toLocaleString() : '—'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Sparkline points={sparklinePoints} />
        <div className="text-right space-y-1">
          <div className="text-[10px] text-[var(--ink-muted)]">비교 대상 대비</div>
          <ChangeBadge change={metric.change} />
          {metric.source && (
            <div>
              <Badge color={metric.source === 'auto' ? 'blue' : 'gray'} size="sm">
                {metric.source === 'auto' ? '자동' : '수동'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeBadge({ change }: { change: MetricChange }) {
  if (change.diff === null) {
    return <span className="text-xs text-[var(--ink-muted)]">비교 불가</span>;
  }

  const color = change.direction === 'up' ? 'green' : change.direction === 'down' ? 'red' : 'gray';
  const arrow = change.direction === 'up' ? '▲' : change.direction === 'down' ? '▼' : '—';
  const diffText = `${change.diff > 0 ? '+' : ''}${change.diff.toLocaleString()}`;
  const pctText = change.pct !== null ? ` (${change.pct > 0 ? '+' : ''}${change.pct}%)` : '';

  return (
    <Badge color={color} size="sm">
      {arrow} {diffText}
      {pctText}
    </Badge>
  );
}
