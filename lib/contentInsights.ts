import type { InstagramPost } from '@/lib/instagramMedia';
import type { YoutubeVideoSummary } from '@/types';

function cadenceDays(timestamps: string[]): number | null {
  if (timestamps.length < 2) return null;
  const sorted = [...timestamps].map((t) => new Date(t).getTime()).sort((a, b) => a - b);
  const spanDays = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24);
  return Math.round((spanDays / (sorted.length - 1)) * 10) / 10;
}

function youtubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export interface YoutubeContentAnalysis {
  count: number;
  topByViews: YoutubeVideoSummary | null;
  topByEngagementRate: { video: YoutubeVideoSummary; ratePct: number } | null;
  topByComments: YoutubeVideoSummary | null;
  avgViews: number | null;
  avgEngagementRatePct: number | null;
  cadenceDays: number | null;
}

export function analyzeYoutubeVideos(videos: YoutubeVideoSummary[]): YoutubeContentAnalysis {
  const withViews = videos.filter((v) => v.views !== null && v.views > 0);

  const topByViews = withViews.length > 0 ? withViews.reduce((a, b) => ((b.views ?? 0) > (a.views ?? 0) ? b : a)) : null;
  const withComments = videos.filter((v) => v.comments !== null && v.comments > 0);
  const topByComments = withComments.length > 0 ? withComments.reduce((a, b) => ((b.comments ?? 0) > (a.comments ?? 0) ? b : a)) : null;

  let topByEngagementRate: YoutubeContentAnalysis['topByEngagementRate'] = null;
  const rates: number[] = [];
  for (const video of withViews) {
    const rate = (((video.likes ?? 0) + (video.comments ?? 0)) / (video.views ?? 1)) * 100;
    rates.push(rate);
    if (!topByEngagementRate || rate > topByEngagementRate.ratePct) {
      topByEngagementRate = { video, ratePct: Math.round(rate * 100) / 100 };
    }
  }

  const avgViews = withViews.length > 0 ? Math.round(withViews.reduce((sum, v) => sum + (v.views ?? 0), 0) / withViews.length) : null;
  const avgEngagementRatePct = rates.length > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100 : null;

  return {
    count: videos.length,
    topByViews,
    topByEngagementRate,
    topByComments,
    avgViews,
    avgEngagementRatePct,
    cadenceDays: cadenceDays(videos.map((v) => v.publishedAt)),
  };
}

export interface InstagramContentAnalysis {
  count: number;
  topByEngagement: { post: InstagramPost; total: number } | null;
  topByLikes: InstagramPost | null;
  topByComments: InstagramPost | null;
  avgEngagement: number | null;
  cadenceDays: number | null;
}

export function analyzeInstagramPosts(posts: InstagramPost[]): InstagramContentAnalysis {
  let topByEngagement: InstagramContentAnalysis['topByEngagement'] = null;
  let topByLikes: InstagramPost | null = null;
  let topByComments: InstagramPost | null = null;
  let totalEngagement = 0;

  for (const post of posts) {
    const total = post.likeCount + post.commentsCount;
    totalEngagement += total;
    if (!topByEngagement || total > topByEngagement.total) {
      topByEngagement = { post, total };
    }
    if (!topByLikes || post.likeCount > topByLikes.likeCount) topByLikes = post;
    if (!topByComments || post.commentsCount > topByComments.commentsCount) topByComments = post;
  }

  return {
    count: posts.length,
    topByEngagement,
    topByLikes,
    topByComments,
    avgEngagement: posts.length > 0 ? Math.round((totalEngagement / posts.length) * 10) / 10 : null,
    cadenceDays: cadenceDays(posts.map((p) => p.timestamp)),
  };
}

export function youtubeWatchUrl(video: Pick<YoutubeVideoSummary, 'videoId'>): string {
  return youtubeUrl(video.videoId);
}
