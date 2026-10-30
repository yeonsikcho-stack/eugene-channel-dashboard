import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CHANNELS, CHANNEL_LABELS } from '@/lib/channels';
import { buildKpiInsights, getChannelKpis, KPI_TARGETS } from '@/lib/kpi';
import type { Channel } from '@/types';

export default function KpiPage() {
  const insights = buildKpiInsights();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">KPI</h1>
      <p className="text-sm text-[var(--ink-secondary)] mb-6">채널별 연간 목표 대비 달성 현황입니다.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--danger-soft)] border border-[var(--border)] rounded-xl px-5 py-4">
          <div className="text-[11px] tracking-wide uppercase text-[var(--danger)] mb-2">부족한 지표 · 주력 필요</div>
          <ul className="space-y-1.5">
            {insights.gaps.map((line, i) => (
              <li key={i} className="text-sm text-[var(--ink)] leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[var(--success-soft)] border border-[var(--border)] rounded-xl px-5 py-4">
          <div className="text-[11px] tracking-wide uppercase text-[var(--success)] mb-2">잘하고 있는 지표</div>
          <ul className="space-y-1.5">
            {insights.strengths.map((line, i) => (
              <li key={i} className="text-sm text-[var(--ink)] leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map((channel) => (
          <ChannelKpiCard key={channel} channel={channel} />
        ))}
      </div>
    </div>
  );
}

function ChannelKpiCard({ channel }: { channel: Channel }) {
  const hasKpis = Boolean(KPI_TARGETS[channel]);
  const kpis = hasKpis ? getChannelKpis(channel) : [];

  return (
    <Link href={`/kpi/${channel}`}>
      <Card className="h-full">
        <div className="text-sm font-semibold text-[var(--ink)] mb-3">{CHANNEL_LABELS[channel]}</div>
        {!hasKpis ? (
          <p className="text-sm text-[var(--ink-muted)]">데이터 연동 준비 중</p>
        ) : (
          <div className="space-y-2">
            {kpis.map((kpi) => (
              <div key={kpi.key} className="flex items-center justify-between text-sm">
                <span className="text-[var(--ink-secondary)]">{kpi.label}</span>
                {kpi.achievementPct !== null ? (
                  <Badge color={kpi.achievementPct >= 100 ? 'green' : 'orange'} size="sm">
                    {kpi.achievementPct}%
                  </Badge>
                ) : (
                  <span className="text-xs text-[var(--ink-muted)]">데이터 없음</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
