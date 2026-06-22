import type { MigrationContext } from './migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector');

    await sequelize.query(`
    CREATE TABLE feed (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      text TEXT NOT NULL,
      is_viewed BOOLEAN NOT NULL DEFAULT false,
      first_seen_at TIMESTAMPTZ NOT NULL,
      channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      embedding VECTOR(768) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

    await sequelize.query(`
    CREATE INDEX feed_embedding_idx ON feed USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
  `);
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('feed');
}
