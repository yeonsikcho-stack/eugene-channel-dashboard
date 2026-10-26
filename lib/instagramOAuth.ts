import { getOAuthConnection, markOAuthError, saveOAuthConnection, updateOAuthAccessToken } from '@/lib/oauth';

const PROVIDER = 'instagram';
const SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights'];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}가 설정되지 않았습니다.`);
  return value;
}

export function getInstagramAuthUrl(): string {
  const appId = requireEnv('INSTAGRAM_APP_ID');
  const redirectUri = requireEnv('INSTAGRAM_OAUTH_REDIRECT_URI');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(','),
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramAuthCode(code: string): Promise<void> {
  const appId = requireEnv('INSTAGRAM_APP_ID');
  const appSecret = requireEnv('INSTAGRAM_APP_SECRET');
  const redirectUri = requireEnv('INSTAGRAM_OAUTH_REDIRECT_URI');

  const shortLivedRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!shortLivedRes.ok) throw new Error(`토큰 교환 실패: ${shortLivedRes.status} ${await shortLivedRes.text()}`);
  const shortLivedData = await shortLivedRes.json();
  const igUserId: string = String(shortLivedData.user_id);

  const longLivedUrl = `https://graph.instagram.com/access_token?${new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: shortLivedData.access_token,
  }).toString()}`;
  const longLivedRes = await fetch(longLivedUrl);
  if (!longLivedRes.ok) throw new Error(`장기 토큰 교환 실패: ${longLivedRes.status} ${await longLivedRes.text()}`);
  const longLivedData = await longLivedRes.json();

  const expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000).toISOString();
  saveOAuthConnection({
    provider: PROVIDER,
    refreshToken: longLivedData.access_token,
    accessToken: longLivedData.access_token,
    tokenExpiresAt: expiresAt,
    externalId: igUserId,
  });
}

export async function getValidInstagramAccess(): Promise<{ accessToken: string; igUserId: string }> {
  const connection = getOAuthConnection(PROVIDER);
  if (!connection || !connection.accessToken || !connection.externalId) {
    throw new Error('인스타그램 연결이 되어있지 않습니다. 먼저 연결하세요.');
  }

  const isExpiringSoon =
    !connection.tokenExpiresAt || new Date(connection.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  if (!isExpiringSoon) {
    return { accessToken: connection.accessToken, igUserId: connection.externalId };
  }

  const refreshRes = await fetch(
    `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: connection.accessToken,
    }).toString()}`,
  );

  if (!refreshRes.ok) {
    markOAuthError(PROVIDER, `토큰 갱신 실패: ${refreshRes.status}`);
    return { accessToken: connection.accessToken, igUserId: connection.externalId };
  }

  const refreshData = await refreshRes.json();
  const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
  updateOAuthAccessToken(PROVIDER, refreshData.access_token, expiresAt);

  return { accessToken: refreshData.access_token, igUserId: connection.externalId };
}
