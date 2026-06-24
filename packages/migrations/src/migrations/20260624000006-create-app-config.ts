import type { MigrationContext } from '../migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.createTable('app_config', {
        slug: { type: 'TEXT', primaryKey: true, allowNull: false },
        value: { type: 'TEXT', allowNull: false },
        created_at: { type: 'TIMESTAMPTZ', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'TIMESTAMPTZ', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('app_config');
}
