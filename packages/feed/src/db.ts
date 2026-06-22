import { Op, Sequelize } from 'sequelize';
import { Feed, Message, SimilarFeedItem } from '@ai-tg-channels/models';
import { createMigrator } from '@ai-tg-channels/migrations';

export async function runMigrations(sequelize: Sequelize) {
  const migrator = createMigrator(sequelize);
  await migrator.up();
}

export async function findSimilarInFeed(embedding: number[], threshold = 0.85): Promise<SimilarFeedItem | null> {
  const rows = await Feed.findSimilar(embedding, threshold);
  if (rows.length === 0) return null;
  return rows[0]!;
}

export async function insertFeedItem(params: {
  text: string;
  firstSeenAt: Date;
  channelId: string;
  embedding: number[];
}): Promise<string> {
  return Feed.insert(params);
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
