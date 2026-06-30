const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Check sync_logs
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) console.error('sync_logs error:', error);
  else console.log('sync_logs:', JSON.stringify(data, null, 2));
}

main();
