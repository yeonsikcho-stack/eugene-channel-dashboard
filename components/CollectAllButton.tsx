'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const TARGET_CHANNELS = ['youtube', 'instagram'] as const;

export function CollectAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const results = await Promise.all(
        TARGET_CHANNELS.map(async (channel) => {
          const response = await fetch(`/api/collectors/${channel}`, { method: 'POST' });
          return { channel, ok: response.ok };
        }),
      );
      const failed = results.filter((r) => !r.ok).map((r) => r.channel);
      setMessage(failed.length === 0 ? '유튜브·인스타그램 수집 완료' : `일부 실패: ${failed.join(', ')}`);
      router.refresh();
    } catch {
      setMessage('수집 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleClick} disabled={loading}>
        {loading ? '수집 중...' : '지금 전체 수집'}
      </Button>
      {message && <span className="text-xs text-[var(--ink-muted)]">{message}</span>}
    </div>
  );
}
