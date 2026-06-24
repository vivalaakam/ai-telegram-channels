import type { MigrationContext } from '../migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.createTable('prompts', {
        id: { type: 'UUID', primaryKey: true, allowNull: false },
        slug: { type: 'TEXT', allowNull: false },
        content: { type: 'TEXT', allowNull: false },
        version: { type: 'INTEGER', allowNull: false, defaultValue: 1 },
        is_current: { type: 'BOOLEAN', allowNull: false, defaultValue: true },
        created_at: { type: 'TIMESTAMPTZ', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('prompts', ['slug', 'is_current']);
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('prompts');
}
