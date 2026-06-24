import type { MigrationContext } from '../migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.createTable('prompts', {
        id: { type: 'UUID', primaryKey: true, allowNull: false },
        content: { type: 'TEXT', allowNull: false },
        version: { type: 'INTEGER', allowNull: false, defaultValue: 1 },
        tags: { type: 'TEXT[]', allowNull: false, defaultValue: '{}' },
        previous_id: { type: 'UUID', allowNull: true, references: { model: 'prompts', key: 'id' } },
        created_at: { type: 'TIMESTAMPTZ', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('prompts', ['tags'], { using: 'GIN' } as never);
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('prompts');
}
