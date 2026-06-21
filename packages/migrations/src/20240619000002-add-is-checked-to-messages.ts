import type { MigrationContext } from './migrator.js';

export async function up({ context: queryInterface }: MigrationContext) {
  await queryInterface.addColumn('messages', 'is_checked', {
    type: 'BOOLEAN',
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({ context: queryInterface }: MigrationContext) {
  await queryInterface.removeColumn('messages', 'is_checked');
}
