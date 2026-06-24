import type { MigrationContext } from '../migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
    await queryInterface.addColumn('feed', 'post_type', {
        type: 'TEXT',
        allowNull: true,
        defaultValue: null,
    });
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.removeColumn('feed', 'post_type');
}
