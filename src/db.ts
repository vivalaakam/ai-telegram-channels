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
      raw JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (channel_id, message_id)
    );
  `);
  // migrate existing tables created with INTEGER
  await pool.query(`
    ALTER TABLE messages ALTER COLUMN message_id TYPE BIGINT;
  `).catch(() => {/* already BIGINT */});
}

export async function upsertChannel(id: string, title: string, username?: string) {
  await pool.query(
    `INSERT INTO channels (id, title, username) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, username = EXCLUDED.username`,
    [id, title, username ?? null]
  );
}

export async function saveMessage(channelId: string, messageId: number, raw: object): Promise<boolean> {
  const id = uuidv5(JSON.stringify(raw), NAMESPACE);
  const result = await pool.query(
    `INSERT INTO messages (id, channel_id, message_id, raw) VALUES ($1, $2, $3, $4)
     ON CONFLICT (channel_id, message_id) DO NOTHING`,
    [id, channelId, messageId, JSON.stringify(raw)]
  );
  return (result.rowCount ?? 0) > 0;
}
