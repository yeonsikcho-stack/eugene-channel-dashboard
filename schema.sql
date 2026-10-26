-- lib/db.ts의 getDB()가 앱 시작 시 이 파일을 자동으로 실행합니다.

CREATE TABLE IF NOT EXISTS channel_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  year_month TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  is_manual_override INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (channel, metric_key, year_month)
);

CREATE TABLE IF NOT EXISTS oauth_connections (
  provider TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TEXT,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  last_error TEXT,
  connected_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
