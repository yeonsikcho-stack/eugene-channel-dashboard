'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface StatusResponse {
  status: 'connected' | 'disconnected' | 'error';
  lastError?: string | null;
}

export function InstagramConnectPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/instagram/status')
      .then((res) => res.json())
      .then(setStatus);

    const oauthResult = searchParams.get('oauth');
    if (oauthResult === 'connected') setMessage('연결되었습니다.');
    if (oauthResult === 'error') setMessage('연결에 실패했습니다. 다시 시도해주세요.');
  }, [searchParams]);

  async function handleBackfill() {
    setBackfilling(true);
    setMessage(null);
    try {
      const response = await fetch('/api/collectors/instagram/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startMonth: '2026-01' }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setMessage(data.error ?? '과거 데이터 수집에 실패했습니다.');
        return;
      }
      setMessage(`${data.months.length}개월치 데이터를 가져왔습니다. (팔로워는 근사치 — 언팔로우는 반영 안 됨)`);
      router.refresh();
    } catch {
      setMessage('과거 데이터 수집 중 문제가 발생했습니다.');
    } finally {
      setBackfilling(false);
    }
  }

  if (!status) return null;

  return (
    <div className="mt-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#0a0a0a] mb-1">인스타그램 연결</div>
            <div className="flex items-center gap-2">
              <Badge color={status.status === 'connected' ? 'green' : status.status === 'error' ? 'red' : 'gray'} size="sm">
                {status.status === 'connected' ? '연결됨' : status.status === 'error' ? '오류' : '연결 안 됨'}
              </Badge>
              {status.lastError && <span className="text-xs text-[#999]">{status.lastError}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.status !== 'connected' && (
              <a href="/api/auth/instagram/start">
                <Button size="sm" variant="secondary">
                  연결하기
                </Button>
              </a>
            )}
            {status.status === 'connected' && (
              <Button size="sm" variant="secondary" onClick={handleBackfill} disabled={backfilling}>
                {backfilling ? '가져오는 중...' : '2026년 데이터 가져오기'}
              </Button>
            )}
          </div>
        </div>
        {message && <div className="mt-2 text-xs text-[#555]">{message}</div>}
      </div>
    </div>
  );
}
