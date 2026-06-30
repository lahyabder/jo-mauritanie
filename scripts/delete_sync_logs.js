const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Starting deletion of sync logs mock data...');
  
  const { error } = await supabase
    .from('sync_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    console.error('Error deleting sync_logs:', error);
    return;
  }
  console.log('Sync logs deleted successfully.');
}

main();
