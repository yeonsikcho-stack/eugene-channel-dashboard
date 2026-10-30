import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CHANNELS, CHANNEL_LABELS } from '@/lib/channels';
import { buildKpiInsights, getChannelKpis, KPI_TARGETS } from '@/lib/kpi';
import type { Channel } from '@/types';

interface KpiChannelPageProps {
  params: Promise<{ channel: string }>;
}

export default async function KpiChannelPage({ params }: KpiChannelPageProps) {
  const { channel: channelParam } = await params;
  if (!CHANNELS.includes(channelParam as Channel)) notFound();
  const channel = channelParam as Channel;

  const hasKpis = Boolean(KPI_TARGETS[channel]);
  const kpis = hasKpis ? getChannelKpis(channel) : [];
  const channelLabel = CHANNEL_LABELS[channel];
  const insights = buildKpiInsights();
  const relatedInsights = hasKpis
    ? [...insights.gaps, ...insights.strengths].filter((line) => line.startsWith(channelLabel))
    : [];

  return (
    <div className="max-w-lg">
      <Link href="/kpi" className="text-xs text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors">
        ← KPI
      </Link>
      <h1 className="text-xl font-semibold text-[var(--ink)] mt-1 mb-2">{CHANNEL_LABELS[channel]} KPI</h1>

      {!hasKpis ? (
        <>
          <p className="text-sm text-[var(--ink-secondary)] mb-6">준비 중입니다.</p>
          <Card>
            <p className="text-sm text-[var(--ink-secondary)]">콘텐츠가 곧 추가됩니다.</p>
          </Card>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--ink-secondary)] mb-6">
            연간 목표 대비 현재 달성 현황입니다. (누적 지표는 당월 값, 합계 지표는 연초~당월 합계 vs 월 목표 × 경과월)
          </p>

          {relatedInsights.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 mb-6">
              <div className="text-[11px] tracking-wide uppercase text-[var(--ink-muted)] mb-2">인사이트</div>
              <ul className="space-y-1.5">
                {relatedInsights.map((line, i) => (
                  <li key={i} className="text-sm text-[var(--ink)] leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {kpis.map((kpi) => (
              <Card key={kpi.key}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{kpi.label}</div>
                    {kpi.note && <div className="text-xs text-[var(--ink-muted)] mt-0.5">{kpi.note}</div>}
                  </div>
                  {kpi.achievementPct !== null && (
                    <Badge color={kpi.achievementPct >= 100 ? 'green' : 'orange'} size="sm">
                      달성률 {kpi.achievementPct}%
                    </Badge>
                  )}
                </div>
                <div className="text-lg font-semibold text-[var(--ink)]">
                  {kpi.current !== null ? kpi.current.toLocaleString() : '데이터 없음'}
                  <span className="text-sm text-[var(--ink-muted)] font-normal"> / {kpi.target.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full"
                    style={{ width: `${Math.min(100, kpi.achievementPct ?? 0)}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
