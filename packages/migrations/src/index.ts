import { Sequelize } from 'sequelize';

export { createMigrator, type MigrationContext } from './migrator.js';

export async function runMigrations(sequelize: Sequelize) {
    const migrator = createMigrator(sequelize);
    await migrator.up();
}
