CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  startTime TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'C',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'C',
  done INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  weekStart TEXT NOT NULL,
  comment TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memos_createdAt ON memos (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_weekStart ON reviews (weekStart DESC, createdAt DESC);
