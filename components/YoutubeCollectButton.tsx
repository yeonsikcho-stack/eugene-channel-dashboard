'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function YoutubeCollectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/collectors/youtube', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? '수집에 실패했습니다.');
        return;
      }
      setMessage('수집 완료');
      router.refresh();
    } catch {
      setMessage('수집 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
      <Button size="sm" variant="secondary" onClick={handleClick} disabled={loading}>
        {loading ? '수집 중...' : '지금 수집'}
      </Button>
      {message && <span className="text-xs text-[#999]">{message}</span>}
    </div>
  );
}
