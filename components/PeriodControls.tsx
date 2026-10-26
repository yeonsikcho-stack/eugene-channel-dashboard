'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { shiftYearMonth } from '@/lib/channels';

type CompareMode = 'prev_month' | 'prev_year' | 'custom';

function sameMonthLastYear(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${Number(year) - 1}-${month}`;
}

function detectMode(yearMonth: string, compareMonth: string): CompareMode {
  if (compareMonth === shiftYearMonth(yearMonth, -1)) return 'prev_month';
  if (compareMonth === sameMonthLastYear(yearMonth)) return 'prev_year';
  return 'custom';
}

export function PeriodControls({ yearMonth, compareMonth }: { yearMonth: string; compareMonth: string }) {
  const router = useRouter();
  const [draftMonth, setDraftMonth] = useState(yearMonth);
  const [mode, setMode] = useState<CompareMode>(detectMode(yearMonth, compareMonth));
  const [draftCompare, setDraftCompare] = useState(compareMonth);

  function apply(month: string, compareMode: CompareMode, customCompare: string) {
    const resolvedCompare =
      compareMode === 'prev_month'
        ? shiftYearMonth(month, -1)
        : compareMode === 'prev_year'
          ? sameMonthLastYear(month)
          : customCompare;
    router.push(`/?yearMonth=${month}&compareMonth=${resolvedCompare}`);
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="text-[11px] text-[var(--ink-muted)] block mb-1 tracking-wide">기준월</label>
        <input
          type="month"
          value={draftMonth}
          onChange={(e) => {
            setDraftMonth(e.target.value);
            apply(e.target.value, mode, draftCompare);
          }}
          className="text-sm border border-[var(--border)] rounded-md px-2 py-1.5 bg-white"
        />
      </div>
      <div>
        <label className="text-[11px] text-[var(--ink-muted)] block mb-1 tracking-wide">비교 대상</label>
        <select
          value={mode}
          onChange={(e) => {
            const nextMode = e.target.value as CompareMode;
            setMode(nextMode);
            apply(draftMonth, nextMode, draftCompare);
          }}
          className="text-sm border border-[var(--border)] rounded-md px-2 py-1.5 bg-white"
        >
          <option value="prev_month">전월 대비</option>
          <option value="prev_year">전년 동월 대비</option>
          <option value="custom">직접 선택</option>
        </select>
      </div>
      {mode === 'custom' && (
        <div>
          <label className="text-[11px] text-[var(--ink-muted)] block mb-1 tracking-wide">비교월</label>
          <input
            type="month"
            value={draftCompare}
            onChange={(e) => {
              setDraftCompare(e.target.value);
              apply(draftMonth, mode, e.target.value);
            }}
            className="text-sm border border-[var(--border)] rounded-md px-2 py-1.5 bg-white"
          />
        </div>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const prevMonth = shiftYearMonth(draftMonth, -1);
          setDraftMonth(prevMonth);
          apply(prevMonth, mode, draftCompare);
        }}
      >
        ← 전월
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const nextMonth = shiftYearMonth(draftMonth, 1);
          setDraftMonth(nextMonth);
          apply(nextMonth, mode, draftCompare);
        }}
      >
        다음월 →
      </Button>
    </div>
  );
}
