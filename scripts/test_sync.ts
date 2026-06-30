import { runAutoSync } from '../lib/sync/crawler';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("Starting manual sync test...");
  await runAutoSync('manual', 'test-user');
  console.log("Manual sync test completed.");
}

main().catch(console.error);
