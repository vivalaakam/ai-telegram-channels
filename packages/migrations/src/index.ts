import { Sequelize } from 'sequelize';
import { createMigrator } from './migrator.js';

export { createMigrator, type MigrationContext } from './migrator.js';

export async function runMigrations(sequelize: Sequelize) {
    const migrator = createMigrator(sequelize);
    await migrator.up();
}
