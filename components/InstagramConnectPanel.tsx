'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface StatusResponse {
  status: 'connected' | 'disconnected' | 'error';
  lastError?: string | null;
}

export function InstagramConnectPanel() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/instagram/status')
      .then((res) => res.json())
      .then(setStatus);

    const oauthResult = searchParams.get('oauth');
    if (oauthResult === 'connected') setMessage('연결되었습니다.');
    if (oauthResult === 'error') setMessage('연결에 실패했습니다. 다시 시도해주세요.');
  }, [searchParams]);

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
          {status.status !== 'connected' && (
            <a href="/api/auth/instagram/start">
              <Button size="sm" variant="secondary">
                연결하기
              </Button>
            </a>
          )}
        </div>
        {message && <div className="mt-2 text-xs text-[#555]">{message}</div>}
      </div>
    </div>
  );
}
