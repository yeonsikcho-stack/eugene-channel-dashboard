import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TrendChart } from '@/components/TrendChart';
import { PeriodControls } from '@/components/PeriodControls';
import { DownloadReportButtons } from '@/components/DownloadReportButtons';
import { getMonthlyReportData, REPORT_PLACEHOLDER_NOTES } from '@/lib/report';
import { currentYearMonth, shiftYearMonth } from '@/lib/channels';

interface ReportPageProps {
  searchParams: Promise<{ yearMonth?: string }>;
}

function directionArrow(direction: string): string {
  if (direction === 'up') return '▲';
  if (direction === 'down') return '▼';
  return '';
}

function directionColor(direction: string): string {
  if (direction === 'up') return 'var(--success)';
  if (direction === 'down') return 'var(--danger)';
  return 'var(--ink-muted)';
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = await searchParams;
  const yearMonth = params.yearMonth ?? currentYearMonth();
  const compareMonth = shiftYearMonth(yearMonth, -1);

  const data = await getMonthlyReportData(yearMonth);

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">온라인 커뮤니케이션 채널 운영보고</h1>
          <p className="text-sm text-[var(--ink-secondary)] mt-1">
            {data.yearMonth} · 생성일 {data.generatedAt.slice(0, 10)}
          </p>
        </div>
        <DownloadReportButtons yearMonth={data.yearMonth} />
      </div>

      <div className="mb-6 no-print">
        <PeriodControls yearMonth={yearMonth} compareMonth={compareMonth} basePath="/report" />
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--ink)] mb-3">01. 운영 결과 요약</h2>
        <div className="space-y-2">
          {data.channels.map((section) => (
            <div
              key={section.channel}
              className="rounded-lg border border-[var(--border)] px-4 py-3"
              style={{ background: section.hasData ? 'var(--accent-soft)' : 'var(--paper)' }}
            >
              <div className="text-sm font-semibold text-[var(--ink)] mb-1">{section.label}</div>
              <div className="text-sm text-[var(--ink-secondary)]">
                {section.hasData
                  ? section.insights[0] ?? `${section.label} 지표를 확인 중입니다.`
                  : REPORT_PLACEHOLDER_NOTES[section.channel] ?? '데이터 연동 준비 중입니다.'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--ink)] mb-3">02. KPI 달성 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--ink)] text-white">
                <th className="text-left px-3 py-2">채널</th>
                <th className="text-left px-3 py-2">지표</th>
                <th className="text-right px-3 py-2">현재</th>
                <th className="text-right px-3 py-2">목표</th>
                <th className="text-right px-3 py-2">달성률</th>
              </tr>
            </thead>
            <tbody>
              {data.channels.map((section) =>
                section.hasData ? (
                  section.kpis.map((kpi, i) => (
                    <tr key={`${section.channel}-${kpi.key}`} className="border-b border-[var(--border)]">
                      {i === 0 && (
                        <td className="px-3 py-2 font-medium align-top" rowSpan={section.kpis.length}>
                          {section.label}
                        </td>
                      )}
                      <td className="px-3 py-2">{kpi.label}</td>
                      <td className="px-3 py-2 text-right">{kpi.current !== null ? kpi.current.toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 text-right text-[var(--ink-muted)]">{kpi.target.toLocaleString()}</td>
                      <td
                        className="px-3 py-2 text-right font-semibold"
                        style={{ color: kpi.achievementPct !== null && kpi.achievementPct >= 100 ? 'var(--success)' : 'var(--danger)' }}
                      >
                        {kpi.achievementPct !== null ? `${kpi.achievementPct}%` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key={section.channel} className="border-b border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">{section.label}</td>
                    <td className="px-3 py-2 text-[var(--ink-muted)]" colSpan={4}>
                      {REPORT_PLACEHOLDER_NOTES[section.channel] ?? '데이터 연동 준비 중'}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {data.channels.map((section, idx) => (
        <section key={section.channel} className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-3">
            0{3 + idx}. {section.label}
          </h2>

          {!section.hasData ? (
            <Card>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1">데이터 연동 준비 중입니다</p>
              <p className="text-sm text-[var(--ink-secondary)]">{REPORT_PLACEHOLDER_NOTES[section.channel]}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.kpis.map((kpi) => (
                  <Card key={kpi.key}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-semibold text-[var(--ink)]">{kpi.label}</div>
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
                    <div className="text-xs text-[var(--ink-muted)] mt-1">
                      {kpi.cadence === 'cumulative' ? '누적(당월 값)' : '합계(연초~당월)'}
                    </div>
                    {kpi.note && <div className="text-xs text-[var(--ink-muted)] mt-1">{kpi.note}</div>}
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.trends.map((trend) => (
                  <Card key={trend.key}>
                    <TrendChart
                      label={`${trend.label} 추이`}
                      points={trend.months.map((m, i) => ({ key: m, value: trend.values[i] }))}
                    />
                  </Card>
                ))}
              </div>

              <div>
                <div className="text-xs text-[var(--ink-muted)] mb-1">당월 지표 (전월 대비)</div>
                <div className="text-sm text-[var(--ink-secondary)] flex flex-wrap gap-x-4 gap-y-1">
                  {section.metrics.map((m) => (
                    <span key={m.key}>
                      {m.label} {m.current !== null ? m.current.toLocaleString() : '-'}
                      {m.diff !== null && (
                        <span style={{ color: directionColor(m.direction) }}>
                          {' '}
                          ({directionArrow(m.direction)}
                          {Math.abs(m.diff).toLocaleString()})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {section.topContent && (
                <Card>
                  <div className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-2">
                    이번 달 BEST 콘텐츠
                  </div>
                  <div className="flex gap-3">
                    {section.topContent.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={section.topContent.thumbnailUrl}
                        alt=""
                        className="w-28 h-20 object-cover rounded-md shrink-0 bg-[var(--paper)]"
                      />
                    )}
                    <div>
                      {section.topContent.url ? (
                        <a
                          href={section.topContent.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                        >
                          {section.topContent.title}
                        </a>
                      ) : (
                        <div className="text-sm font-medium text-[var(--ink)]">{section.topContent.title}</div>
                      )}
                      <div className="text-xs text-[var(--ink-muted)] mt-1">{section.topContent.statsLabel}</div>
                    </div>
                  </div>
                </Card>
              )}

              {section.insights.length > 0 && (
                <ul className="space-y-1 text-sm text-[var(--ink-secondary)] list-disc pl-5">
                  {section.insights.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      ))}

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--ink)] mb-3">07. 종합 인사이트 및 다음 달 제언</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[var(--danger-soft)] border border-[var(--border)] rounded-xl px-5 py-4">
            <div className="text-[11px] tracking-wide uppercase text-[var(--danger)] mb-2">부족한 지표 · 주력 필요</div>
            <ul className="space-y-1.5">
              {data.overallInsights.gaps.map((line, i) => (
                <li key={i} className="text-sm text-[var(--ink)] leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[var(--success-soft)] border border-[var(--border)] rounded-xl px-5 py-4">
            <div className="text-[11px] tracking-wide uppercase text-[var(--success)] mb-2">잘하고 있는 지표</div>
            <ul className="space-y-1.5">
              {data.overallInsights.strengths.map((line, i) => (
                <li key={i} className="text-sm text-[var(--ink)] leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
