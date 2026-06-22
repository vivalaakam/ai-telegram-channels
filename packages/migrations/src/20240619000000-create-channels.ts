import type { MigrationContext } from './migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.createTable('channels', {
        id: {
            type: 'BIGINT',
            primaryKey: true,
        },
        username: {
            type: 'TEXT',
            allowNull: true,
        },
        title: {
            type: 'TEXT',
            allowNull: false,
        },
        created_at: {
            type: 'TIMESTAMPTZ',
            allowNull: false,
            defaultValue: 'NOW()',
        },
    });
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.dropTable('channels');
}
