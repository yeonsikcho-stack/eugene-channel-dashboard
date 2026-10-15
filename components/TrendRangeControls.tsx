'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { Channel, TrendGranularity } from '@/types';

interface TrendRangeControlsProps {
  channel: Channel;
  granularity: TrendGranularity;
  from: string;
  to: string;
}

export function TrendRangeControls({ channel, granularity, from, to }: TrendRangeControlsProps) {
  const router = useRouter();
  const [draftGranularity, setDraftGranularity] = useState(granularity);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  function apply() {
    const params = new URLSearchParams({ granularity: draftGranularity, from: draftFrom, to: draftTo });
    router.push(`/channels/${channel}?${params.toString()}`);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-[#999] block mb-1">단위</label>
          <select
            value={draftGranularity}
            onChange={(e) => {
              const next = e.target.value as TrendGranularity;
              setDraftGranularity(next);
              if (next === 'month') {
                setDraftFrom(from.length === 7 ? from : from.slice(0, 7));
                setDraftTo(to.length === 7 ? to : to.slice(0, 7));
              }
            }}
            className="text-sm border border-[#e5e5e5] rounded-md px-2 py-1.5"
          >
            <option value="month">월별</option>
            {channel === 'youtube' && <option value="day">일별</option>}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#999] block mb-1">시작</label>
          <input
            type={draftGranularity === 'day' ? 'date' : 'month'}
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="text-sm border border-[#e5e5e5] rounded-md px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-[#999] block mb-1">끝</label>
          <input
            type={draftGranularity === 'day' ? 'date' : 'month'}
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="text-sm border border-[#e5e5e5] rounded-md px-2 py-1.5"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={apply}>
          적용
        </Button>
      </div>
    </div>
  );
}
