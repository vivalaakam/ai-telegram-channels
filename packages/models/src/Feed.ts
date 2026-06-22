import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  QueryTypes,
  Sequelize,
} from 'sequelize';

export interface SimilarFeedItem {
  id: string;
  text: string;
  similarity: number;
}

export class Feed extends Model<InferAttributes<Feed>, InferCreationAttributes<Feed>> {
  declare id: CreationOptional<string>;
  declare text: string;
  declare isViewed: CreationOptional<boolean>;
  declare firstSeenAt: Date;
  declare channelId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static async findSimilar(embedding: number[], threshold = 0.85) {
    const vectorStr = `[${embedding.join(',')}]`;

    const rows = await Feed.sequelize?.query<SimilarFeedItem>(
      `SELECT id, text, 1 - (embedding <=> :embedding::vector) AS similarity
             FROM ${Feed.tableName}
             WHERE first_seen_at > NOW() - INTERVAL '48 hours'
             ORDER BY embedding <=> :embedding::vector
             LIMIT 1`,
      { replacements: { embedding: vectorStr }, type: QueryTypes.SELECT },
    );

    if (!rows || rows.length === 0) {
      return [];
    }
    return rows.filter((r) => r.similarity >= threshold);
  }

  static async insert(params: {
    text: string;
    firstSeenAt: Date;
    channelId: string;
    embedding: number[];
  }): Promise<string> {
    const vectorStr = `[${params.embedding.join(',')}]`;

    const rows = await Feed.sequelize?.query<{ id: string }>(
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

    if (!rows || !rows.length) {
      throw new Error('Failed to insert feed item');
    }

    return rows[0]!.id;
  }
}

export function initFeed(sequelize: Sequelize): typeof Feed {
  Feed.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isViewed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      firstSeenAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      channelId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'feed',
      timestamps: true,
      underscored: true,
    },
  );
  return Feed;
}
