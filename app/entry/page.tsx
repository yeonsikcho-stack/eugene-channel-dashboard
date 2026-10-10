'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CHANNELS, CHANNEL_LABELS, CHANNEL_METRIC_DEFS, currentYearMonth } from '@/lib/channels';
import type { Channel, DashboardData } from '@/types';

export default function EntryPage() {
  const [channel, setChannel] = useState<Channel>(CHANNELS[0]);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(null);
    fetch(`/api/metrics?yearMonth=${yearMonth}`)
      .then((res) => res.json())
      .then((data: DashboardData) => {
        const card = data.cards.find((c) => c.channel === channel);
        const next: Record<string, string> = {};
        card?.metrics.forEach((metric) => {
          next[metric.metricKey] = metric.change.current !== null ? String(metric.change.current) : '';
        });
        setValues(next);
      });
  }, [channel, yearMonth]);

  async function handleSave() {
    setLoading(true);
    setStatus(null);
    try {
      for (const def of CHANNEL_METRIC_DEFS[channel]) {
        const raw = values[def.key];
        if (raw === undefined || raw === '') continue;
        const value = Number(raw);
        if (Number.isNaN(value)) continue;

        await fetch('/api/metrics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, metricKey: def.key, yearMonth, value, source: 'manual' }),
        });
      }
      setStatus('저장했습니다.');
    } catch {
      setStatus('저장 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-2">지표 수동 입력</h1>
      <p className="text-sm text-[#555] mb-6">
        자동 수집이 안 되거나 실패한 채널의 숫자를 직접 입력하거나 고칩니다. 여기서 저장한 값은 다음 자동
        수집이 덮어쓰지 않습니다.
      </p>

      <Card>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-[#999] block mb-1">채널</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full text-sm border border-[#e5e5e5] rounded-md px-2 py-1.5"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#999] block mb-1">연월</label>
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="w-full text-sm border border-[#e5e5e5] rounded-md px-2 py-1.5"
              />
            </div>
          </div>

          <div className="space-y-3">
            {CHANNEL_METRIC_DEFS[channel].map((def) => (
              <div key={def.key}>
                <label className="text-xs text-[#999] block mb-1">{def.label}</label>
                <input
                  type="number"
                  value={values[def.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [def.key]: e.target.value }))}
                  className="w-full text-sm border border-[#e5e5e5] rounded-md px-2 py-1.5"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={loading}>
              저장
            </Button>
            {status && <span className="text-sm text-[#555]">{status}</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
