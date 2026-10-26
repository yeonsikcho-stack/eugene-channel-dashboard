import { getValidInstagramAccess } from '@/lib/instagramOAuth';

const GRAPH_VERSION = 'v21.0';
const MAX_PAGES = 30;

export interface InstagramMediaStat {
  month: string;
  likeCount: number;
  commentsCount: number;
  postCount: number;
}

export interface InstagramPost {
  id: string;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
}

interface RawMediaItem {
  id: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  caption?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
}

/**
 * 게시물(media) 목록을 최신순으로 페이지네이션하며, `sinceMonth`보다 이전 달의
 * 게시물이 나오기 시작하면 중단한다. 좋아요·댓글수는 계정 단위로 한 번에 주는
 * API가 없어서, 매번 이렇게 게시물 전체를 훑어야 한다.
 */
async function fetchMediaSince(sinceMonth: string): Promise<RawMediaItem[]> {
  const { accessToken } = await getValidInstagramAccess();

  const items: RawMediaItem[] = [];
  let url: string | null = `https://graph.instagram.com/${GRAPH_VERSION}/me/media?${new URLSearchParams({
    fields: 'timestamp,like_count,comments_count,caption,permalink,media_url,thumbnail_url,media_type',
    limit: '50',
    access_token: accessToken,
  }).toString()}`;

  for (let page = 0; url && page < MAX_PAGES; page++) {
    const response: Response = await fetch(url);
    if (!response.ok) {
      throw new Error(`인스타그램 게시물 조회 실패: ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    const pageItems: RawMediaItem[] = data.data ?? [];

    let passedStart = false;
    for (const item of pageItems) {
      if (item.timestamp.slice(0, 7) < sinceMonth) {
        passedStart = true;
        continue;
      }
      items.push(item);
    }

    if (passedStart) break;
    url = data.paging?.next ?? null;
  }

  return items;
}

export async function fetchInstagramMonthlyEngagement(sinceMonth: string): Promise<InstagramMediaStat[]> {
  const items = await fetchMediaSince(sinceMonth);
  const byMonth = new Map<string, { likeCount: number; commentsCount: number; postCount: number }>();

  for (const item of items) {
    const month = item.timestamp.slice(0, 7);
    const entry = byMonth.get(month) ?? { likeCount: 0, commentsCount: 0, postCount: 0 };
    entry.likeCount += item.like_count ?? 0;
    entry.commentsCount += item.comments_count ?? 0;
    entry.postCount += 1;
    byMonth.set(month, entry);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, stats]) => ({
      month,
      likeCount: stats.likeCount,
      commentsCount: stats.commentsCount,
      postCount: stats.postCount,
    }));
}

/** 특정 연월(`YYYY-MM`)에 올라온 게시물만 개별 지표와 함께 가져온다. */
export async function fetchInstagramPostsForMonth(month: string): Promise<InstagramPost[]> {
  const items = await fetchMediaSince(month);

  return items
    .filter((item) => item.timestamp.slice(0, 7) === month)
    .map((item) => ({
      id: item.id,
      caption: item.caption ?? null,
      permalink: item.permalink ?? null,
      thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
      timestamp: item.timestamp,
      likeCount: item.like_count ?? 0,
      commentsCount: item.comments_count ?? 0,
    }));
}
