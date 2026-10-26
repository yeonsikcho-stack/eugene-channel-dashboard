import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TrendChart } from '@/components/TrendChart';
import { CollectButton } from '@/components/CollectButton';
import { YoutubeOAuthPanel } from '@/components/YoutubeOAuthPanel';
import { InstagramConnectPanel } from '@/components/InstagramConnectPanel';
import { TrendRangeControls } from '@/components/TrendRangeControls';
import { getChannelTrend, getDashboardData } from '@/lib/metrics';
import { fetchYoutubeVideosForMonth } from '@/lib/youtube';
import { fetchInstagramPostsForMonth, type InstagramPost } from '@/lib/instagramMedia';
import {
  analyzeInstagramPosts,
  analyzeYoutubeVideos,
  youtubeWatchUrl,
  type InstagramContentAnalysis,
  type YoutubeContentAnalysis,
} from '@/lib/contentInsights';
import { getYoutubeDailyTrend } from '@/lib/youtubeAnalytics';
import { CHANNELS, computeChange, currentYearMonth, shiftYearMonth } from '@/lib/channels';
import type { Channel, ChannelTrend, MetricChange, TrendGranularity, YoutubeVideoSummary } from '@/types';

interface ChannelPageProps {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ granularity?: string; from?: string; to?: string }>;
}

function defaultRange(granularity: TrendGranularity): { from: string; to: string } {
  if (granularity === 'day') {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { from, to };
  }
  const to = currentYearMonth();
  const from = shiftYearMonth(to, -5);
  return { from, to };
}

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const { channel: channelParam } = await params;
  if (!CHANNELS.includes(channelParam as Channel)) notFound();
  const channel = channelParam as Channel;

  const query = await searchParams;
  const granularity: TrendGranularity = query.granularity === 'day' && channel === 'youtube' ? 'day' : 'month';
  const defaults = defaultRange(granularity);
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;

  const yearMonth = currentYearMonth();
  const dashboard = getDashboardData(yearMonth);
  const card = dashboard.cards.find((c) => c.channel === channel)!;

  let trend: ChannelTrend;
  let trendError: string | null = null;
  if (granularity === 'day') {
    try {
      trend = await getYoutubeDailyTrend(from, to);
    } catch (e) {
      trendError = e instanceof Error ? e.message : '일별 데이터를 가져오지 못했습니다.';
      trend = { channel, label: card.label, granularity: 'day', periods: [], series: [] };
    }
  } else {
    trend = getChannelTrend(channel, from, to);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-xs text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors">
            ← 대시보드
          </Link>
          <h1 className="text-xl font-semibold text-[var(--ink)] mt-1">{card.label}</h1>
          <p className="text-sm text-[var(--ink-secondary)] mt-1">{yearMonth} 현재 지표와 최근 추이</p>
        </div>
        {channel !== 'naver_blog' && <CollectButton channel={channel} />}
      </div>

      {channel === 'youtube' && <YoutubeOAuthPanel />}
      {channel === 'instagram' && <InstagramConnectPanel />}

      <Card title="이번 달 지표">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {card.metrics.map((metric) => (
            <div key={metric.metricKey}>
              <div className="text-xs text-[var(--ink-muted)]">{metric.label}</div>
              <div className="text-lg font-semibold text-[var(--ink)] tabular-nums">
                {metric.change.current !== null ? metric.change.current.toLocaleString() : '—'}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] mb-0.5">전월 대비</div>
              <ChangeBadge change={metric.change} />
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <TrendRangeControls channel={channel} granularity={granularity} from={from} to={to} />
      </div>

      {trendError && (
        <Card>
          <div className="text-sm text-[var(--ink-muted)]">{trendError}</div>
        </Card>
      )}

      {!trendError && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trend.series.map((series) => (
            <Card key={series.key}>
              <TrendChart label={series.label} points={series.points} granularity={granularity} />
            </Card>
          ))}
        </div>
      )}

      {channel === 'youtube' && <YoutubeContentSection yearMonth={yearMonth} />}
      {channel === 'instagram' && <InstagramContentSection yearMonth={yearMonth} />}
    </div>
  );
}

async function YoutubeContentSection({ yearMonth }: { yearMonth: string }) {
  let videos: YoutubeVideoSummary[] = [];
  let analysis: YoutubeContentAnalysis | null = null;
  let previousAnalysis: YoutubeContentAnalysis | null = null;
  let error: string | null = null;
  try {
    const previousMonth = shiftYearMonth(yearMonth, -1);
    const [current, previous] = await Promise.all([
      fetchYoutubeVideosForMonth(yearMonth),
      fetchYoutubeVideosForMonth(previousMonth),
    ]);
    videos = current;
    analysis = analyzeYoutubeVideos(current);
    previousAnalysis = analyzeYoutubeVideos(previous);
  } catch (e) {
    error = e instanceof Error ? e.message : '콘텐츠를 불러오지 못했습니다.';
  }

  if (error || !analysis) {
    return (
      <div className="mt-4">
        <Card title={`${yearMonth} 올라온 콘텐츠`}>
          <div className="text-sm text-[var(--ink-muted)]">{error}</div>
        </Card>
      </div>
    );
  }

  const avgViewsChange = previousAnalysis?.avgViews != null ? computeChange(analysis.avgViews, previousAnalysis.avgViews) : null;

  return (
    <div className="mt-4 space-y-4">
      <ContentInsightBox>
        {analysis.count === 0 && <li>이번 달 올라온 영상이 없습니다.</li>}
        {analysis.topByViews && (
          <li>
            가장 많이 본 영상은{' '}
            <a href={youtubeWatchUrl(analysis.topByViews)} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:decoration-white">
              &lsquo;{analysis.topByViews.title}&rsquo;
            </a>{' '}
            — 조회수 {analysis.topByViews.views?.toLocaleString()}회
          </li>
        )}
        {analysis.topByEngagementRate && (
          <li>
            참여율(좋아요+댓글/조회수)이 가장 높은 영상은{' '}
            <strong>&lsquo;{analysis.topByEngagementRate.video.title}&rsquo;</strong> — {analysis.topByEngagementRate.ratePct}%
          </li>
        )}
        {analysis.avgViews !== null && (
          <li>
            영상당 평균 조회수는 {analysis.avgViews.toLocaleString()}회입니다.
            {avgViewsChange && avgViewsChange.pct !== null && (
              <> (전월 대비 {avgViewsChange.pct > 0 ? '+' : ''}{avgViewsChange.pct}%)</>
            )}
          </li>
        )}
        {analysis.avgEngagementRatePct !== null && <li>영상당 평균 참여율은 {analysis.avgEngagementRatePct}%입니다.</li>}
        {analysis.cadenceDays !== null && <li>평균 {analysis.cadenceDays}일에 한 번 업로드되고 있습니다.</li>}
      </ContentInsightBox>

      <Card title={`${yearMonth} 올라온 콘텐츠 (${analysis.count}개)`}>
        {videos.length === 0 && <div className="text-sm text-[var(--ink-muted)]">이번 달 올라온 콘텐츠가 없습니다.</div>}
        {videos.length > 0 && (
          <div className="space-y-1">
            {videos.map((video) => (
              <a
                key={video.videoId}
                href={youtubeWatchUrl(video)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-center border-b border-[var(--border-soft)] py-2.5 last:border-0 -mx-2 px-2 rounded-md hover:bg-[var(--accent-soft)] transition-colors group"
              >
                {video.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-auto rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--ink)] truncate flex items-center gap-1.5">
                    <span className="truncate">{video.title}</span>
                    <ExternalLink size={12} className="text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--ink-muted)]">{new Date(video.publishedAt).toLocaleDateString('ko-KR')}</span>
                    {analysis.topByViews?.videoId === video.videoId && <Badge color="blue" size="sm">최고 조회수</Badge>}
                    {analysis.topByEngagementRate?.video.videoId === video.videoId && <Badge color="green" size="sm">최고 참여율</Badge>}
                    {analysis.topByComments?.videoId === video.videoId && <Badge color="purple" size="sm">최다 댓글</Badge>}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--ink-secondary)] flex-shrink-0 space-y-0.5 tabular-nums">
                  <div>조회 {video.views !== null ? video.views.toLocaleString() : '—'}</div>
                  <div>좋아요 {video.likes !== null ? video.likes.toLocaleString() : '—'}</div>
                  <div>댓글 {video.comments !== null ? video.comments.toLocaleString() : '—'}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

async function InstagramContentSection({ yearMonth }: { yearMonth: string }) {
  let posts: InstagramPost[] = [];
  let analysis: InstagramContentAnalysis | null = null;
  let previousAnalysis: InstagramContentAnalysis | null = null;
  let error: string | null = null;
  try {
    const previousMonth = shiftYearMonth(yearMonth, -1);
    const [current, previous] = await Promise.all([
      fetchInstagramPostsForMonth(yearMonth),
      fetchInstagramPostsForMonth(previousMonth),
    ]);
    posts = current;
    analysis = analyzeInstagramPosts(current);
    previousAnalysis = analyzeInstagramPosts(previous);
  } catch (e) {
    error = e instanceof Error ? e.message : '콘텐츠를 불러오지 못했습니다.';
  }

  if (error || !analysis) {
    return (
      <div className="mt-4">
        <Card title={`${yearMonth} 올라온 콘텐츠`}>
          <div className="text-sm text-[var(--ink-muted)]">{error}</div>
        </Card>
      </div>
    );
  }

  const avgEngagementChange =
    previousAnalysis?.avgEngagement != null ? computeChange(analysis.avgEngagement, previousAnalysis.avgEngagement) : null;

  return (
    <div className="mt-4 space-y-4">
      <ContentInsightBox>
        {analysis.count === 0 && <li>이번 달 올라온 게시물이 없습니다.</li>}
        {analysis.topByEngagement && (
          <li>
            가장 반응이 좋았던 게시물은{' '}
            <a
              href={analysis.topByEngagement.post.permalink ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/30 hover:decoration-white"
            >
              &lsquo;{captionPreview(analysis.topByEngagement.post.caption)}&rsquo;
            </a>{' '}
            — 좋아요 {analysis.topByEngagement.post.likeCount.toLocaleString()}개 · 댓글{' '}
            {analysis.topByEngagement.post.commentsCount.toLocaleString()}개
          </li>
        )}
        {analysis.avgEngagement !== null && (
          <li>
            게시물당 평균 참여(좋아요+댓글)는 {analysis.avgEngagement.toLocaleString()}건입니다.
            {avgEngagementChange && avgEngagementChange.pct !== null && (
              <> (전월 대비 {avgEngagementChange.pct > 0 ? '+' : ''}{avgEngagementChange.pct}%)</>
            )}
          </li>
        )}
        {analysis.cadenceDays !== null && <li>평균 {analysis.cadenceDays}일에 한 번 게시되고 있습니다.</li>}
      </ContentInsightBox>

      <Card title={`${yearMonth} 올라온 콘텐츠 (${analysis.count}개)`}>
        {posts.length === 0 && <div className="text-sm text-[var(--ink-muted)]">이번 달 올라온 콘텐츠가 없습니다.</div>}
        {posts.length > 0 && (
          <div className="space-y-1">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.permalink ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-center border-b border-[var(--border-soft)] py-2.5 last:border-0 -mx-2 px-2 rounded-md hover:bg-[var(--accent-soft)] transition-colors group"
              >
                {post.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.thumbnailUrl} alt={captionPreview(post.caption)} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--ink)] truncate flex items-center gap-1.5">
                    <span className="truncate">{captionPreview(post.caption)}</span>
                    <ExternalLink size={12} className="text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--ink-muted)]">{new Date(post.timestamp).toLocaleDateString('ko-KR')}</span>
                    {analysis.topByEngagement?.post.id === post.id && <Badge color="green" size="sm">최고 참여</Badge>}
                    {analysis.topByLikes?.id === post.id && <Badge color="blue" size="sm">최다 좋아요</Badge>}
                    {analysis.topByComments?.id === post.id && <Badge color="purple" size="sm">최다 댓글</Badge>}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--ink-secondary)] flex-shrink-0 space-y-0.5 tabular-nums">
                  <div>좋아요 {post.likeCount.toLocaleString()}</div>
                  <div>댓글 {post.commentsCount.toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function captionPreview(caption: string | null): string {
  if (!caption) return '(캡션 없음)';
  const firstLine = caption.split('\n')[0];
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine;
}

function ContentInsightBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[var(--ink)] text-white rounded-xl px-5 py-4">
      <div className="text-[11px] tracking-[0.2em] uppercase text-white/40 mb-2">콘텐츠 인사이트</div>
      <ul className="space-y-1 text-sm leading-snug [&>li]:before:content-['●'] [&>li]:before:text-[#7c9bff] [&>li]:before:mr-2">
        {children}
      </ul>
    </div>
  );
}

function ChangeBadge({ change }: { change: MetricChange }) {
  if (change.diff === null) {
    return <span className="text-xs text-[var(--ink-muted)]">비교 불가</span>;
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
