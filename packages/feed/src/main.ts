import { initDb, pgPool } from './db.js';
import { processMessages } from './processor.js';

async function main() {
  console.log('[feed] Starting feed processor...');
  await initDb();
  await processMessages();
  await pgPool.end();
  console.log('[feed] Done.');
}

main().catch((err) => {
  console.error('[feed] Fatal error:', err);
  process.exit(1);
});
