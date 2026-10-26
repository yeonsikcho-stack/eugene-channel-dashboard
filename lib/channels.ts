import type { Channel, MetricChange, MetricDirection } from '@/types';

export const CHANNELS: Channel[] = ['youtube', 'instagram', 'naver_blog', 'online_sabo'];

export const CHANNEL_LABELS: Record<Channel, string> = {
  online_sabo: '유진에버',
  youtube: '유튜브',
  instagram: '인스타그램',
  naver_blog: '네이버 블로그',
};

export interface MetricDef {
  key: string;
  label: string;
}

export const CHANNEL_METRIC_DEFS: Record<Channel, MetricDef[]> = {
  online_sabo: [
    { key: 'visitors', label: '방문자수' },
    { key: 'views', label: '조회수' },
  ],
  youtube: [
    { key: 'subscribers', label: '구독자수' },
    { key: 'views', label: '조회수' },
    { key: 'likes', label: '좋아요' },
    { key: 'comments', label: '댓글수' },
  ],
  instagram: [
    { key: 'followers', label: '팔로워' },
    { key: 'reach', label: '도달수' },
    { key: 'saves', label: '저장수' },
    { key: 'likes', label: '좋아요' },
    { key: 'comments', label: '댓글수' },
  ],
  naver_blog: [
    { key: 'views', label: '조회수' },
    { key: 'visitors', label: '방문자수' },
  ],
};

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const months: string[] = [];
  let cursor = fromMonth;
  while (cursor <= toMonth) {
    months.push(cursor);
    cursor = shiftYearMonth(cursor, 1);
  }
  return months;
}

export function computeChange(current: number | null, previous: number | null): MetricChange {
  if (previous === null) {
    return { current, previous, diff: null, pct: null, direction: 'na' };
  }
  if (current === null) {
    return { current, previous, diff: null, pct: null, direction: 'na' };
  }

  const diff = current - previous;
  const pct = previous === 0 ? null : Math.round((diff / previous) * 1000) / 10;
  const direction: MetricDirection = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';

  return { current, previous, diff, pct, direction };
}
