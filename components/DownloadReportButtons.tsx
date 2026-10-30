'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DownloadReportButtons({ yearMonth }: { yearMonth: string }) {
  return (
    <div className="flex items-center gap-2 no-print">
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer size={14} />
        PDF로 다운로드
      </Button>
      <a href={`/api/report?yearMonth=${yearMonth}`}>
        <Button variant="primary" size="sm">
          <Download size={14} />
          PPTX로 다운로드
        </Button>
      </a>
    </div>
  );
}
