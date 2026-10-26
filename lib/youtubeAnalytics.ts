import { getValidYoutubeAccessToken } from '@/lib/youtubeOAuth';
import type { ChannelTrend, YoutubeDailyAnalytics, YoutubeMonthlyAnalytics } from '@/types';

export async function fetchYoutubeMonthlyAnalytics(
  startDate: string,
  endDate: string,
): Promise<YoutubeMonthlyAnalytics[]> {
  const accessToken = await getValidYoutubeAccessToken();

  const params = new URLSearchParams({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: 'views,likes,comments,subscribersGained,subscribersLost',
    dimensions: 'month',
    sort: 'month',
  });

  const response = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube Analytics API 요청 실패: ${response.status} ${body}`);
  }

  const data = await response.json();
  const rows: [string, number, number, number, number, number][] = data.rows ?? [];

  return rows.map(([month, views, likes, comments, subscribersGained, subscribersLost]) => ({
    month: month.slice(0, 7),
    views,
    likes,
    comments,
    subscribersGained,
    subscribersLost,
  }));
}

export async function fetchYoutubeDailyAnalytics(
  startDate: string,
  endDate: string,
): Promise<YoutubeDailyAnalytics[]> {
  const accessToken = await getValidYoutubeAccessToken();

  const params = new URLSearchParams({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: 'views,likes,comments,subscribersGained,subscribersLost',
    dimensions: 'day',
    sort: 'day',
  });

  const response = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube Analytics API 요청 실패: ${response.status} ${body}`);
  }

  const data = await response.json();
  const rows: [string, number, number, number, number, number][] = data.rows ?? [];

  return rows.map(([date, views, likes, comments, subscribersGained, subscribersLost]) => ({
    date,
    views,
    likes,
    comments,
    subscribersGained,
    subscribersLost,
  }));
}

export async function fetchYoutubeCurrentMonthStats(): Promise<{ views: number; likes: number; comments: number }> {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const rows = await fetchYoutubeMonthlyAnalytics(firstOfMonth, firstOfMonth);
  return { views: rows[0]?.views ?? 0, likes: rows[0]?.likes ?? 0, comments: rows[0]?.comments ?? 0 };
}

export async function getYoutubeDailyTrend(startDate: string, endDate: string): Promise<ChannelTrend> {
  const rows = await fetchYoutubeDailyAnalytics(startDate, endDate);

  return {
    channel: 'youtube',
    label: '유튜브',
    granularity: 'day',
    periods: rows.map((r) => r.date),
    series: [
      {
        key: 'views',
        label: '조회수',
        points: rows.map((r) => ({ key: r.date, value: r.views })),
      },
      {
        key: 'likes',
        label: '좋아요',
        points: rows.map((r) => ({ key: r.date, value: r.likes })),
      },
      {
        key: 'comments',
        label: '댓글수',
        points: rows.map((r) => ({ key: r.date, value: r.comments })),
      },
      {
        key: 'subscriber_net',
        label: '구독자 증감',
        points: rows.map((r) => ({ key: r.date, value: r.subscribersGained - r.subscribersLost })),
      },
    ],
  };
}
