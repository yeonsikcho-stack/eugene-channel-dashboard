import type { YoutubeVideoSummary } from '@/types';

export interface YoutubeSnapshot extends Record<string, number> {
  subscribers: number;
  views: number;
}

function requireYoutubeEnv(): { apiKey: string; channelId: string } {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    throw new Error('YOUTUBE_API_KEY 또는 YOUTUBE_CHANNEL_ID가 설정되지 않았습니다.');
  }
  return { apiKey, channelId };
}

async function getUploadsPlaylistId(apiKey: string, channelId: string): Promise<string> {
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  const channelRes = await fetch(channelUrl);
  if (!channelRes.ok) throw new Error(`YouTube API 요청 실패: ${channelRes.status}`);
  const channelData = await channelRes.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error('업로드 재생목록을 찾을 수 없습니다.');
  return uploadsPlaylistId;
}

async function fetchVideoStatsByIds(
  apiKey: string,
  ids: string[],
): Promise<Map<string, { viewCount?: string; likeCount?: string; commentCount?: string }>> {
  const statsByVideoId = new Map<string, { viewCount?: string; likeCount?: string; commentCount?: string }>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${chunk.join(',')}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    if (!videosRes.ok) throw new Error(`YouTube API 요청 실패: ${videosRes.status}`);
    const videosData = await videosRes.json();
    for (const item of videosData.items ?? []) {
      statsByVideoId.set(item.id, item.statistics);
    }
  }
  return statsByVideoId;
}

export async function fetchYoutubeSnapshot(): Promise<YoutubeSnapshot> {
  const { apiKey, channelId } = requireYoutubeEnv();

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

/** `sinceMonth`부터 지금까지, 달별 업로드 개수를 한 번의 페이지네이션으로 집계한다. */
export async function fetchYoutubeMonthlyUploadCounts(sinceMonth: string): Promise<Map<string, number>> {
  const { apiKey, channelId } = requireYoutubeEnv();
  const uploadsPlaylistId = await getUploadsPlaylistId(apiKey, channelId);

  const counts = new Map<string, number>();
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
    if (!playlistRes.ok) throw new Error(`YouTube API 요청 실패: ${playlistRes.status}`);
    const playlistData = await playlistRes.json();
    const items: { snippet: { publishedAt: string } }[] = playlistData.items ?? [];

    let passedStart = false;
    for (const item of items) {
      const itemMonth = item.snippet.publishedAt.slice(0, 7);
      if (itemMonth < sinceMonth) {
        passedStart = true;
        continue;
      }
      counts.set(itemMonth, (counts.get(itemMonth) ?? 0) + 1);
    }

    if (passedStart || !playlistData.nextPageToken) break;
    pageToken = playlistData.nextPageToken;
  }

  return counts;
}

export async function fetchYoutubeMonthlyUploadCount(month: string): Promise<number> {
  const { apiKey, channelId } = requireYoutubeEnv();
  const uploadsPlaylistId = await getUploadsPlaylistId(apiKey, channelId);

  let count = 0;
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
    if (!playlistRes.ok) throw new Error(`YouTube API 요청 실패: ${playlistRes.status}`);
    const playlistData = await playlistRes.json();
    const items: { snippet: { publishedAt: string } }[] = playlistData.items ?? [];

    let passedStart = false;
    for (const item of items) {
      const itemMonth = item.snippet.publishedAt.slice(0, 7);
      if (itemMonth < month) {
        passedStart = true;
        continue;
      }
      if (itemMonth === month) count += 1;
    }

    if (passedStart || !playlistData.nextPageToken) break;
    pageToken = playlistData.nextPageToken;
  }

  return count;
}

export async function fetchYoutubeRecentVideos(limit = 8): Promise<YoutubeVideoSummary[]> {
  const { apiKey, channelId } = requireYoutubeEnv();
  const uploadsPlaylistId = await getUploadsPlaylistId(apiKey, channelId);

  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${limit}&key=${apiKey}`;
  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) throw new Error(`YouTube API 요청 실패: ${playlistRes.status}`);
  const playlistData = await playlistRes.json();
  const items: { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails?: { medium?: { url: string } } } }[] =
    playlistData.items ?? [];

  if (items.length === 0) return [];

  const statsByVideoId = await fetchVideoStatsByIds(apiKey, items.map((item) => item.snippet.resourceId.videoId));

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

/** 특정 연월(`YYYY-MM`)에 올라온 영상들만 통계와 함께 가져온다. */
export async function fetchYoutubeVideosForMonth(month: string): Promise<YoutubeVideoSummary[]> {
  const { apiKey, channelId } = requireYoutubeEnv();
  const uploadsPlaylistId = await getUploadsPlaylistId(apiKey, channelId);

  const matched: { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails?: { medium?: { url: string } } } }[] = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
    if (!playlistRes.ok) throw new Error(`YouTube API 요청 실패: ${playlistRes.status}`);
    const playlistData = await playlistRes.json();
    const items: typeof matched = playlistData.items ?? [];

    let passedStart = false;
    for (const item of items) {
      const itemMonth = item.snippet.publishedAt.slice(0, 7);
      if (itemMonth < month) {
        passedStart = true;
        continue;
      }
      if (itemMonth === month) matched.push(item);
    }

    if (passedStart || !playlistData.nextPageToken) break;
    pageToken = playlistData.nextPageToken;
  }

  if (matched.length === 0) return [];

  const statsByVideoId = await fetchVideoStatsByIds(apiKey, matched.map((item) => item.snippet.resourceId.videoId));

  return matched.map((item) => {
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
