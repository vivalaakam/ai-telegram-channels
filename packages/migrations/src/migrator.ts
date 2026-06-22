import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import { Sequelize } from 'sequelize';
import { initModels } from '@ai-tg-channels/models';
import { Umzug, SequelizeStorage } from 'umzug';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createMigrator(sequelize: Sequelize) {
  return new Umzug({
    migrations: {
      glob: ['migrations/*.ts', { cwd: __dirname }],
      resolve(params) {
        const getModule = () => import(pathToFileURL(params.path!).toString());
        return {
          name: params.name,
          path: params.path,
          up: async (upParams) => (await getModule()).up(upParams),
          down: async (downParams) => (await getModule()).down?.(downParams),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });
}

export type MigrationContext = {
  context: import('sequelize').QueryInterface;
};

// CLI entry point: pnpm run migrate
if (process.argv[1]?.endsWith('migrator.ts')) {
  const sequelize = new Sequelize(process.env.DATABASE_URL!, { dialect: 'postgres', logging: false });
  initModels(sequelize);
  const migrator = createMigrator(sequelize);
  migrator.runAsCLI();
}
