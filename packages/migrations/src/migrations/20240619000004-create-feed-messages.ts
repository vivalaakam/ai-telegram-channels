import type { MigrationContext } from '../migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.createTable('feed_messages', {
        feed_id: {
            type: 'UUID',
            allowNull: false,
            references: { model: 'feed', key: 'id' },
            onDelete: 'CASCADE',
        },
        channel_id: {
            type: 'BIGINT',
            allowNull: false,
        },
        message_id: {
            type: 'BIGINT',
            allowNull: false,
        },
        created_at: {
            type: 'TIMESTAMPTZ',
            allowNull: false,
            defaultValue: 'NOW()',
        },
    });

    await queryInterface.addConstraint('feed_messages', {
        fields: ['feed_id', 'channel_id', 'message_id'],
        type: 'primary key',
        name: 'feed_messages_pkey',
    });
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('feed_messages');
}
