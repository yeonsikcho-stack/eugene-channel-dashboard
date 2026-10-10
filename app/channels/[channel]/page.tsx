import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TrendChart } from '@/components/TrendChart';
import { YoutubeCollectButton } from '@/components/YoutubeCollectButton';
import { getChannelTrend, getDashboardData } from '@/lib/metrics';
import { fetchYoutubeRecentVideos } from '@/lib/youtube';
import { CHANNELS, currentYearMonth } from '@/lib/channels';
import type { Channel, MetricChange } from '@/types';

interface ChannelPageProps {
  params: Promise<{ channel: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channel: channelParam } = await params;
  if (!CHANNELS.includes(channelParam as Channel)) notFound();
  const channel = channelParam as Channel;

  const yearMonth = currentYearMonth();
  const dashboard = getDashboardData(yearMonth);
  const card = dashboard.cards.find((c) => c.channel === channel)!;
  const trend = getChannelTrend(channel);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-xs text-[#999] hover:text-[#555]">
            ← 대시보드
          </Link>
          <h1 className="text-xl font-semibold text-[#0a0a0a] mt-1">{card.label}</h1>
          <p className="text-sm text-[#555] mt-1">{yearMonth} 현재 지표와 최근 추이</p>
        </div>
        {channel === 'youtube' && <YoutubeCollectButton />}
      </div>

      <Card title="이번 달 지표">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {card.metrics.map((metric) => (
            <div key={metric.metricKey}>
              <div className="text-xs text-[#999]">{metric.label}</div>
              <div className="text-lg font-semibold text-[#0a0a0a]">
                {metric.change.current !== null ? metric.change.current.toLocaleString() : '—'}
              </div>
              <ChangeBadge change={metric.change} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {trend.series.map((series) => (
          <Card key={series.key}>
            <TrendChart label={series.label} points={series.points} />
          </Card>
        ))}
      </div>

      {channel === 'youtube' && <YoutubeContentList />}
    </div>
  );
}

async function YoutubeContentList() {
  let videos;
  let error: string | null = null;
  try {
    videos = await fetchYoutubeRecentVideos(8);
  } catch (e) {
    error = e instanceof Error ? e.message : '콘텐츠를 불러오지 못했습니다.';
  }

  return (
    <div className="mt-4">
      <Card title="최근 올라온 콘텐츠">
        {error && <div className="text-sm text-[#999]">{error}</div>}
        {!error && videos && videos.length === 0 && (
          <div className="text-sm text-[#999]">최근 올라온 콘텐츠가 없습니다.</div>
        )}
        {!error && videos && videos.length > 0 && (
          <div className="space-y-3">
            {videos.map((video) => (
              <div key={video.videoId} className="flex gap-3 items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                {video.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-auto rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#0a0a0a] truncate">{video.title}</div>
                  <div className="text-xs text-[#999] mt-0.5">
                    {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div className="text-right text-xs text-[#555] flex-shrink-0 space-y-0.5">
                  <div>조회 {video.views !== null ? video.views.toLocaleString() : '—'}</div>
                  <div>좋아요 {video.likes !== null ? video.likes.toLocaleString() : '—'}</div>
                  <div>댓글 {video.comments !== null ? video.comments.toLocaleString() : '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ChangeBadge({ change }: { change: MetricChange }) {
  if (change.diff === null) {
    return <span className="text-xs text-[#999]">비교 불가</span>;
  }
  const color = change.direction === 'up' ? 'green' : change.direction === 'down' ? 'red' : 'gray';
  const arrow = change.direction === 'up' ? '▲' : change.direction === 'down' ? '▼' : '—';
  const diffText = `${change.diff > 0 ? '+' : ''}${change.diff.toLocaleString()}`;
  const pctText = change.pct !== null ? ` (${change.pct > 0 ? '+' : ''}${change.pct}%)` : '';
  return (
    <Badge color={color} size="sm">
      {arrow} {diffText}
      {pctText}
    </Badge>
  );
}
