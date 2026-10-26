import { getValidInstagramAccess } from '@/lib/instagramOAuth';

const GRAPH_VERSION = 'v21.0';

export interface InstagramMonthlyInsights {
  month: string;
  reach: number;
  followerGained: number;
}

/**
 * Instagram의 insights API는 월(month) 단위 집계를 직접 주지 않는다 — 일별(day)
 * 값만 주므로, 여기서 날짜를 보고 달 단위로 직접 더한다.
 *
 * follower_count 지표는 "하루 동안 늘어난 팔로워 수(gain)"만 준다 — 언팔로우(loss)는
 * 별도로 주지 않는다. 그래서 이 값으로 과거 팔로워 총원을 거꾸로 복원하면, 언팔로우가
 * 있었던 만큼 실제보다 낮게 나올 수 있다 (근사치).
 */
export async function fetchInstagramMonthlyInsights(
  startDate: string,
  endDate: string,
): Promise<InstagramMonthlyInsights[]> {
  const { accessToken } = await getValidInstagramAccess();

  const params = new URLSearchParams({
    metric: 'reach,follower_count',
    period: 'day',
    since: startDate,
    until: endDate,
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/${GRAPH_VERSION}/me/insights?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`인스타그램 인사이트 조회 실패: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const reachByDate = new Map<string, number>();
  const followerGainByDate = new Map<string, number>();

  for (const series of data.data ?? []) {
    const target = series.name === 'reach' ? reachByDate : series.name === 'follower_count' ? followerGainByDate : null;
    if (!target) continue;
    for (const point of series.values ?? []) {
      target.set(point.end_time.slice(0, 10), point.value);
    }
  }

  const monthlyReach = new Map<string, number>();
  const monthlyFollowerGain = new Map<string, number>();
  const allDates = new Set([...reachByDate.keys(), ...followerGainByDate.keys()]);

  for (const date of allDates) {
    const month = date.slice(0, 7);
    monthlyReach.set(month, (monthlyReach.get(month) ?? 0) + (reachByDate.get(date) ?? 0));
    monthlyFollowerGain.set(month, (monthlyFollowerGain.get(month) ?? 0) + (followerGainByDate.get(date) ?? 0));
  }

  return [...monthlyReach.keys()]
    .sort()
    .map((month) => ({
      month,
      reach: monthlyReach.get(month) ?? 0,
      followerGained: monthlyFollowerGain.get(month) ?? 0,
    }));
}
