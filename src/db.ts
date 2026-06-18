import pg from "pg";
import { v5 as uuidv5 } from "uuid";

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS channels (
      id BIGINT PRIMARY KEY,
      username TEXT,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      channel_id BIGINT NOT NULL REFERENCES channels(id),
      message_id BIGINT NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      content JSONB,
      raw JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (channel_id, message_id)
    );
  `);
  await pool.query(`ALTER TABLE messages ALTER COLUMN message_id TYPE BIGINT;`).catch(() => {});
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ NOT NULL DEFAULT NOW();`).catch(() => {});
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS content JSONB;`).catch(() => {});
}

export async function upsertChannel(id: string, title: string, username?: string) {
  await pool.query(
    `INSERT INTO channels (id, title, username) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, username = EXCLUDED.username`,
    [id, title, username ?? null]
  );
}

export async function saveMessage(channelId: string, messageId: number, raw: Record<string, unknown>): Promise<boolean> {
  const msgDate = typeof raw.date === "number" ? new Date((raw.date as number) * 1000) : new Date();
  const STRIP = new Set(["id", "chat_id", "date", "content"]);
  const content = raw.content ?? null;
  const payload = Object.fromEntries(Object.entries(raw).filter(([k]) => !STRIP.has(k)));
  const uuid = uuidv5(JSON.stringify(payload), NAMESPACE);
  const result = await pool.query(
    `INSERT INTO messages (id, channel_id, message_id, date, content, raw) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (channel_id, message_id) DO NOTHING`,
    [uuid, channelId, messageId, msgDate, content ? JSON.stringify(content) : null, JSON.stringify(payload)]
  );
  return (result.rowCount ?? 0) > 0;
}
