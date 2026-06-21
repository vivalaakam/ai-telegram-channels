import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Sequelize, Op } from 'sequelize';
import pg from 'pg';
import { initModels, Message } from '@ai-tg-channels/models';
import { createMigrator } from '@ai-tg-channels/migrations';

config({ path: resolve(import.meta.dirname, '../../../.env') });

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

export const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

initModels(sequelize);

export async function initDb() {
  const migrator = createMigrator(sequelize);
  await migrator.up();
}

export interface SimilarFeedItem {
  id: string;
  text: string;
  similarity: number;
}

export async function findSimilarInFeed(embedding: number[], threshold = 0.85): Promise<SimilarFeedItem | null> {
  const vectorStr = `[${embedding.join(',')}]`;

  const { rows } = await pgPool.query<{ id: string; text: string; similarity: number }>(
    `
    SELECT id, text, 1 - (embedding <=> $1::vector) AS similarity
    FROM feed
    WHERE first_seen_at > NOW() - INTERVAL '48 hours'
    ORDER BY embedding <=> $1::vector
    LIMIT 1
    `,
    [vectorStr],
  );

  if (rows.length === 0) return null;
  const row = rows[0]!;
  return row.similarity >= threshold ? row : null;
}

export async function insertFeedItem(params: {
  text: string;
  firstSeenAt: Date;
  channelId: string;
  embedding: number[];
}): Promise<string> {
  const vectorStr = `[${params.embedding.join(',')}]`;

  const { rows } = await pgPool.query<{ id: string }>(
    `
    INSERT INTO feed (text, is_viewed, first_seen_at, channel_id, embedding)
    VALUES ($1, false, $2, $3, $4::vector)
    RETURNING id
    `,
    [params.text, params.firstSeenAt, params.channelId, vectorStr],
  );

  return rows[0]!.id;
}

export async function updateFeedItemText(id: string, text: string): Promise<void> {
  await pgPool.query('UPDATE feed SET text = $1 WHERE id = $2', [text, id]);
}

export async function markMessageChecked(channelId: string, messageId: number): Promise<void> {
  await Message.update(
    { isChecked: true },
    { where: { channelId, messageId } },
  );
}

export async function getUncheckedMessages() {
  return Message.findAll({
    where: {
      contentTextText: { [Op.ne]: null },
      isChecked: { [Op.is]: null },
    },
    order: [['date', 'ASC']],
  });
}
