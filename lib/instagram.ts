import { getValidInstagramAccess } from '@/lib/instagramOAuth';
import { fetchInstagramMonthlyEngagement } from '@/lib/instagramMedia';
import { currentYearMonth } from '@/lib/channels';

const GRAPH_VERSION = 'v21.0';

// TODO: 저장수(saves)는 계정 단위로 한 번에 주는 API가 없다 — 게시물별 insights를
// 합산해야 해서 범위에서 뺐다. manual-metrics-entry로 입력한다.
export async function fetchInstagramSnapshot(): Promise<Record<string, number>> {
  const { accessToken } = await getValidInstagramAccess();

  const profileRes = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/me?fields=followers_count&access_token=${accessToken}`,
  );
  if (!profileRes.ok) {
    throw new Error(`인스타그램 프로필 조회 실패: ${profileRes.status} ${await profileRes.text()}`);
  }
  const profile = await profileRes.json();

  const now = new Date();
  const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const until = now.toISOString().slice(0, 10);

  const insightsRes = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/me/insights?${new URLSearchParams({
      metric: 'reach',
      period: 'day',
      since,
      until,
      access_token: accessToken,
    }).toString()}`,
  );
  if (!insightsRes.ok) {
    throw new Error(`인스타그램 인사이트 조회 실패: ${insightsRes.status} ${await insightsRes.text()}`);
  }
  const insights = await insightsRes.json();
  const reachValues: { value: number }[] = insights.data?.[0]?.values ?? [];
  const reach = reachValues.reduce((sum, v) => sum + v.value, 0);

  const thisMonth = currentYearMonth();
  const engagement = await fetchInstagramMonthlyEngagement(thisMonth);
  const thisMonthEngagement = engagement.find((e) => e.month === thisMonth);

  return {
    followers: profile.followers_count,
    reach,
    likes: thisMonthEngagement?.likeCount ?? 0,
    comments: thisMonthEngagement?.commentsCount ?? 0,
  };
}
