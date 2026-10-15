import { getDB } from '@/lib/db';
import type { OAuthConnection, OAuthStatus } from '@/types';

interface OAuthConnectionRecord {
  provider: string;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
  status: OAuthStatus;
  last_error: string | null;
  connected_at: string;
}

function toConnection(record: OAuthConnectionRecord): OAuthConnection {
  return {
    provider: record.provider,
    refreshToken: record.refresh_token,
    accessToken: record.access_token,
    tokenExpiresAt: record.token_expires_at,
    status: record.status,
    lastError: record.last_error,
    connectedAt: record.connected_at,
  };
}

export function getOAuthConnection(provider: string): OAuthConnection | null {
  const db = getDB();
  const record = db.prepare('SELECT * FROM oauth_connections WHERE provider = ?').get(provider) as
    | OAuthConnectionRecord
    | undefined;
  return record ? toConnection(record) : null;
}

export function saveOAuthConnection(input: {
  provider: string;
  refreshToken: string;
  accessToken: string | null;
  tokenExpiresAt: string | null;
}): void {
  const db = getDB();
  db.prepare(
    `INSERT INTO oauth_connections (provider, refresh_token, access_token, token_expires_at, status, last_error, connected_at)
     VALUES (@provider, @refresh_token, @access_token, @token_expires_at, 'connected', NULL, datetime('now', 'localtime'))
     ON CONFLICT (provider) DO UPDATE SET
       refresh_token = excluded.refresh_token,
       access_token = excluded.access_token,
       token_expires_at = excluded.token_expires_at,
       status = 'connected',
       last_error = NULL,
       connected_at = excluded.connected_at`,
  ).run({
    provider: input.provider,
    refresh_token: input.refreshToken,
    access_token: input.accessToken,
    token_expires_at: input.tokenExpiresAt,
  });
}

export function updateOAuthAccessToken(provider: string, accessToken: string, tokenExpiresAt: string): void {
  const db = getDB();
  db.prepare(
    `UPDATE oauth_connections SET access_token = ?, token_expires_at = ?, status = 'connected', last_error = NULL WHERE provider = ?`,
  ).run(accessToken, tokenExpiresAt, provider);
}

export function markOAuthError(provider: string, message: string): void {
  const db = getDB();
  db.prepare(`UPDATE oauth_connections SET status = 'error', last_error = ? WHERE provider = ?`).run(message, provider);
}
