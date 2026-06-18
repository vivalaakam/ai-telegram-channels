import pg from "pg";

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
      channel_id BIGINT NOT NULL REFERENCES channels(id),
      message_id BIGINT NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      edit_date TIMESTAMPTZ,
      effect_id TEXT,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      sender_id JSONB,
      reply_to JSONB,
      content JSONB,
      content_text JSONB,
      content_caption JSONB,
      content_photo JSONB,
      content_video JSONB,
      raw JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (channel_id, message_id)
    );
  `);
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
  const STRIP = new Set(["id", "chat_id", "date", "edit_date", "effect_id", "is_pinned", "sender_id", "reply_to", "content"]);
  const rawContent = (raw.content ?? null) as Record<string, unknown> | null;
  const CONTENT_STRIP = new Set(["text", "caption", "photo", "video"]);
  const contentText = rawContent?.text ?? rawContent?.caption ?? null;
  const contentPhoto = rawContent?.photo ?? null;
  const contentVideo = rawContent?.video ?? null;
  const content = rawContent
    ? Object.fromEntries(Object.entries(rawContent).filter(([k]) => !CONTENT_STRIP.has(k)))
    : null;
  const editDate = typeof raw.edit_date === "number" && raw.edit_date > 0 ? new Date((raw.edit_date as number) * 1000) : null;
  const effectId = raw.effect_id != null ? String(raw.effect_id) : null;
  const isPinned = raw.is_pinned === true;
  const senderId = raw.sender_id ?? null;
  const replyTo = raw.reply_to ?? null;
  const payload = Object.fromEntries(Object.entries(raw).filter(([k]) => !STRIP.has(k)));
  const result = await pool.query(
    `INSERT INTO messages (channel_id, message_id, date, edit_date, effect_id, is_pinned, sender_id, reply_to, content, content_text, content_photo, content_video, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (channel_id, message_id) DO UPDATE SET
       edit_date       = EXCLUDED.edit_date,
       effect_id       = EXCLUDED.effect_id,
       is_pinned       = EXCLUDED.is_pinned,
       sender_id       = EXCLUDED.sender_id,
       reply_to        = EXCLUDED.reply_to,
       content         = EXCLUDED.content,
       content_text    = EXCLUDED.content_text,
       content_photo   = EXCLUDED.content_photo,
       content_video   = EXCLUDED.content_video,
       raw             = EXCLUDED.raw`,
    [channelId, messageId, msgDate, editDate, effectId, isPinned,
     senderId ? JSON.stringify(senderId) : null, replyTo ? JSON.stringify(replyTo) : null,
     content ? JSON.stringify(content) : null,
     contentText ? JSON.stringify(contentText) : null,
     contentPhoto ? JSON.stringify(contentPhoto) : null,
     contentVideo ? JSON.stringify(contentVideo) : null,
     JSON.stringify(payload)]
  );
  return (result.rowCount ?? 0) > 0;
}
