import type { MigrationContext } from '../migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.createTable('messages', {
        channel_id: {
            type: 'BIGINT',
            allowNull: false,
            references: {
                model: 'channels',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        message_id: {
            type: 'BIGINT',
            allowNull: false,
        },
        date: {
            type: 'TIMESTAMPTZ',
            allowNull: false,
            defaultValue: 'NOW()',
        },
        edit_date: {
            type: 'TIMESTAMPTZ',
            allowNull: true,
        },
        effect_id: {
            type: 'TEXT',
            allowNull: true,
        },
        is_pinned: {
            type: 'BOOLEAN',
            allowNull: false,
            defaultValue: false,
        },
        sender_id: {
            type: 'JSONB',
            allowNull: true,
        },
        reply_to: {
            type: 'JSONB',
            allowNull: true,
        },
        content: {
            type: 'JSONB',
            allowNull: true,
        },
        content_text: {
            type: 'JSONB',
            allowNull: true,
        },
        content_photo: {
            type: 'JSONB',
            allowNull: true,
        },
        content_video: {
            type: 'JSONB',
            allowNull: true,
        },
        content_video_cover: {
            type: 'JSONB',
            allowNull: true,
        },
        content_video_storyboards: {
            type: 'JSONB',
            allowNull: true,
        },
        content_alternative_videos: {
            type: 'JSONB',
            allowNull: true,
        },
        content_animation: {
            type: 'JSONB',
            allowNull: true,
        },
        content_link_preview_options: {
            type: 'JSONB',
            allowNull: true,
        },
        content_link_preview: {
            type: 'JSONB',
            allowNull: true,
        },
        content_text_text: {
            type: 'TEXT',
            allowNull: true,
        },
        content_text_entities: {
            type: 'JSONB',
            allowNull: true,
        },
        raw: {
            type: 'JSONB',
            allowNull: false,
        },
        created_at: {
            type: 'TIMESTAMPTZ',
            allowNull: false,
            defaultValue: 'NOW()',
        },
    });

    await queryInterface.addConstraint('messages', {
        fields: ['channel_id', 'message_id'],
        type: 'primary key',
        name: 'messages_pkey',
    });
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('messages');
}
