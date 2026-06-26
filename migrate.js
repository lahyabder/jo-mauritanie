const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql: "ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;" });
  console.log('Result:', error || 'Success');
}
run();
