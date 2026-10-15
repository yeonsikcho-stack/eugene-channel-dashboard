import { getOAuthConnection, markOAuthError, saveOAuthConnection, updateOAuthAccessToken } from '@/lib/oauth';

const PROVIDER = 'youtube';
const SCOPE = 'https://www.googleapis.com/auth/yt-analytics.readonly';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}가 설정되지 않았습니다.`);
  return value;
}

export function getYoutubeAuthUrl(): string {
  const clientId = requireEnv('YOUTUBE_OAUTH_CLIENT_ID');
  const redirectUri = requireEnv('YOUTUBE_OAUTH_REDIRECT_URI');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYoutubeAuthCode(code: string): Promise<void> {
  const clientId = requireEnv('YOUTUBE_OAUTH_CLIENT_ID');
  const clientSecret = requireEnv('YOUTUBE_OAUTH_CLIENT_SECRET');
  const redirectUri = requireEnv('YOUTUBE_OAUTH_REDIRECT_URI');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`토큰 교환 실패: ${response.status}`);
  }

  const data = await response.json();
  if (!data.refresh_token) {
    throw new Error('구글이 리프레시 토큰을 주지 않았습니다. 연결을 다시 시도하세요 (매번 동의 화면이 떠야 합니다).');
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  saveOAuthConnection({
    provider: PROVIDER,
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    tokenExpiresAt: expiresAt,
  });
}

export async function getValidYoutubeAccessToken(): Promise<string> {
  const connection = getOAuthConnection(PROVIDER);
  if (!connection) {
    throw new Error('유튜브 과거 데이터 연결이 되어있지 않습니다. 먼저 연결하세요.');
  }

  const isExpired = !connection.accessToken || !connection.tokenExpiresAt || new Date(connection.tokenExpiresAt) <= new Date();
  if (!isExpired && connection.accessToken) {
    return connection.accessToken;
  }

  const clientId = requireEnv('YOUTUBE_OAUTH_CLIENT_ID');
  const clientSecret = requireEnv('YOUTUBE_OAUTH_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const message = response.status === 400 || response.status === 401
      ? '연결이 만료되었습니다. 다시 연결하세요.'
      : `토큰 갱신 실패: ${response.status}`;
    markOAuthError(PROVIDER, message);
    throw new Error(message);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  updateOAuthAccessToken(PROVIDER, data.access_token, expiresAt);

  return data.access_token;
}
