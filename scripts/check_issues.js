const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('issues').select('*');
  console.log('issues:', data);
  const docs = await supabase.from('documents').select('id, title_ar');
  console.log('documents:', docs.data ? docs.data.length : 0);
  const appts = await supabase.from('appointment_history').select('*');
  console.log('appointments:', appts.data ? appts.data.length : 0);
}

main();
