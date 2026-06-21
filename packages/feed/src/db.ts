import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Sequelize, Op, QueryTypes } from 'sequelize';
import { initModels, Message, Feed } from '@ai-tg-channels/models';
import { createMigrator } from '@ai-tg-channels/migrations';

config({ path: resolve(import.meta.dirname, '../../../.env') });

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

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

  const rows = await sequelize.query<SimilarFeedItem>(
    `SELECT id, text, 1 - (embedding <=> :embedding::vector) AS similarity
     FROM feed
     WHERE first_seen_at > NOW() - INTERVAL '48 hours'
     ORDER BY embedding <=> :embedding::vector
     LIMIT 1`,
    { replacements: { embedding: vectorStr }, type: QueryTypes.SELECT },
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

  const rows = await sequelize.query<{ id: string }>(
    `INSERT INTO feed (text, is_viewed, first_seen_at, channel_id, embedding, created_at, updated_at)
     VALUES (:text, false, :firstSeenAt, :channelId, :embedding::vector, NOW(), NOW())
     RETURNING id`,
    {
      replacements: {
        text: params.text,
        firstSeenAt: params.firstSeenAt,
        channelId: params.channelId,
        embedding: vectorStr,
      },
      type: QueryTypes.SELECT,
    },
  );

  return rows[0]!.id;
}

export async function updateFeedItemText(id: string, text: string): Promise<void> {
  await Feed.update({ text }, { where: { id } });
}

export async function markMessageChecked(channelId: string, messageId: number): Promise<void> {
  await Message.update({ isChecked: true }, { where: { channelId, messageId } });
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
