const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('upload_jobs').select('id, logs').order('created_at', { ascending: false }).limit(1);
  if (data && data.length > 0) {
    console.log(data[0].logs);
  } else {
    console.log('No jobs found or error:', error);
  }
}

main();
