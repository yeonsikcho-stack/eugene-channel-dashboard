import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CollectButton } from '@/components/CollectButton';
import { getDashboardData } from '@/lib/metrics';
import { currentYearMonth, shiftYearMonth } from '@/lib/channels';
import type { MetricCardItem, MetricChange } from '@/types';

interface HomePageProps {
  searchParams: Promise<{ yearMonth?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const yearMonth = params.yearMonth ?? currentYearMonth();
  const data = getDashboardData(yearMonth);
  const prevMonth = shiftYearMonth(data.yearMonth, -1);
  const nextMonth = shiftYearMonth(data.yearMonth, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">채널 운영 지표</h1>
          <p className="text-sm text-[#555] mt-1">
            {data.yearMonth} · 전월({data.previousYearMonth}) 대비 증감
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/?yearMonth=${prevMonth}`}
            className="text-sm px-3 py-1.5 rounded-md border border-[#e5e5e5] bg-white hover:bg-gray-50"
          >
            ← {prevMonth}
          </Link>
          <Link
            href={`/?yearMonth=${nextMonth}`}
            className="text-sm px-3 py-1.5 rounded-md border border-[#e5e5e5] bg-white hover:bg-gray-50"
          >
            {nextMonth} →
          </Link>
          <Link
            href="/entry"
            className="text-sm px-3 py-1.5 rounded-md bg-[#0a0a0a] text-white hover:bg-[#333]"
          >
            수동 입력
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.cards.map((card) => {
          const lastUpdated = card.metrics
            .map((metric) => metric.collectedAt)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1);

          return (
            <Card key={card.channel}>
              <div className="flex items-center justify-between mb-3">
                <Link href={`/channels/${card.channel}`} className="text-sm font-semibold text-[#0a0a0a] hover:underline">
                  {card.label}
                </Link>
                <Link href={`/channels/${card.channel}`} className="text-xs text-[#999] hover:text-[#555]">
                  자세히 보기 →
                </Link>
              </div>
              <div className="space-y-3">
                {card.metrics.map((metric) => (
                  <MetricRow key={metric.metricKey} metric={metric} />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-[#999]">
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

function MetricRow({ metric }: { metric: MetricCardItem }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <div>
        <div className="text-xs text-[#999]">{metric.label}</div>
        <div className="text-lg font-semibold text-[#0a0a0a]">
          {metric.change.current !== null ? metric.change.current.toLocaleString() : '—'}
        </div>
      </div>
      <div className="text-right space-y-1">
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
  );
}

function ChangeBadge({ change }: { change: MetricChange }) {
  if (change.diff === null) {
    return <span className="text-xs text-[#999]">비교 불가</span>;
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
