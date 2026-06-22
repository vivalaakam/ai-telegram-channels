import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initDb } from '@ai-tg-channels/models';
import { runMigrations } from './db.js';
import { processMessages } from './processor.js';

config({ path: resolve(import.meta.dirname, '../../../.env') });

async function main() {
  console.log('[feed] Starting feed processor...');
  const sequelize = initDb(process.env.DATABASE_URL!);
  await runMigrations(sequelize);
  await processMessages();
  await sequelize.close();
  console.log('[feed] Done.');
}

main().catch((err) => {
  console.error('[feed] Fatal error:', err);
  process.exit(1);
});
