import type { YoutubeVideoSummary } from '@/types';

export interface YoutubeSnapshot extends Record<string, number> {
  subscribers: number;
  views: number;
}

export async function fetchYoutubeSnapshot(): Promise<YoutubeSnapshot> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    throw new Error('YOUTUBE_API_KEY 또는 YOUTUBE_CHANNEL_ID가 설정되지 않았습니다.');
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API 요청 실패: ${response.status}`);
  }

  const data = await response.json();
  const statistics = data.items?.[0]?.statistics;

  if (!statistics) {
    throw new Error('채널 통계를 찾을 수 없습니다. YOUTUBE_CHANNEL_ID를 확인하세요.');
  }

  return {
    subscribers: Number(statistics.subscriberCount),
    views: Number(statistics.viewCount),
  };
}

export async function fetchYoutubeRecentVideos(limit = 8): Promise<YoutubeVideoSummary[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    throw new Error('YOUTUBE_API_KEY 또는 YOUTUBE_CHANNEL_ID가 설정되지 않았습니다.');
  }

  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  const channelRes = await fetch(channelUrl);
  if (!channelRes.ok) throw new Error(`YouTube API 요청 실패: ${channelRes.status}`);
  const channelData = await channelRes.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error('업로드 재생목록을 찾을 수 없습니다.');

  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${limit}&key=${apiKey}`;
  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) throw new Error(`YouTube API 요청 실패: ${playlistRes.status}`);
  const playlistData = await playlistRes.json();
  const items: { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails?: { medium?: { url: string } } } }[] =
    playlistData.items ?? [];

  if (items.length === 0) return [];

  const videoIds = items.map((item) => item.snippet.resourceId.videoId).join(',');
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) throw new Error(`YouTube API 요청 실패: ${videosRes.status}`);
  const videosData = await videosRes.json();
  const statsByVideoId = new Map<string, { viewCount?: string; likeCount?: string; commentCount?: string }>(
    (videosData.items ?? []).map((item: { id: string; statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }) => [
      item.id,
      item.statistics,
    ]),
  );

  return items.map((item) => {
    const videoId = item.snippet.resourceId.videoId;
    const stats = statsByVideoId.get(videoId);
    return {
      videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
      views: stats?.viewCount !== undefined ? Number(stats.viewCount) : null,
      likes: stats?.likeCount !== undefined ? Number(stats.likeCount) : null,
      comments: stats?.commentCount !== undefined ? Number(stats.commentCount) : null,
    };
  });
}
