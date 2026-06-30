require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('id, file_name, status, error_message, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  
  if (error) console.error(error);
  else console.table(data);
}
main();
