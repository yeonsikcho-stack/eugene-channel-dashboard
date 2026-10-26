import { getValidInstagramAccess } from '@/lib/instagramOAuth';

const GRAPH_VERSION = 'v21.0';
const MAX_PAGES = 30;

export interface InstagramMediaStat {
  month: string;
  likeCount: number;
  commentsCount: number;
  postCount: number;
}

/**
 * 좋아요·댓글수는 계정 단위로 한 번에 주는 API가 없다 — 게시물(media)마다
 * like_count/comments_count 필드가 있을 뿐이다. 그래서 게시물 목록을 페이지네이션하며
 * 전부 가져와, 올라온 날짜(timestamp) 기준으로 달별로 더한다.
 *
 * media는 최신순으로 오므로, `untilMonth`보다 이전 달의 게시물이 나오기 시작하면
 * 더 가져올 필요가 없어 중단한다.
 */
export async function fetchInstagramMonthlyEngagement(sinceMonth: string): Promise<InstagramMediaStat[]> {
  const { accessToken } = await getValidInstagramAccess();

  const byMonth = new Map<string, { likeCount: number; commentsCount: number; postCount: number }>();
  let url: string | null = `https://graph.instagram.com/${GRAPH_VERSION}/me/media?${new URLSearchParams({
    fields: 'timestamp,like_count,comments_count',
    limit: '50',
    access_token: accessToken,
  }).toString()}`;

  for (let page = 0; url && page < MAX_PAGES; page++) {
    const response: Response = await fetch(url);
    if (!response.ok) {
      throw new Error(`인스타그램 게시물 조회 실패: ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    const items: { timestamp: string; like_count?: number; comments_count?: number }[] = data.data ?? [];

    let passedStart = false;
    for (const item of items) {
      const month = item.timestamp.slice(0, 7);
      if (month < sinceMonth) {
        passedStart = true;
        continue;
      }
      const entry = byMonth.get(month) ?? { likeCount: 0, commentsCount: 0, postCount: 0 };
      entry.likeCount += item.like_count ?? 0;
      entry.commentsCount += item.comments_count ?? 0;
      entry.postCount += 1;
      byMonth.set(month, entry);
    }

    if (passedStart) break;
    url = data.paging?.next ?? null;
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
