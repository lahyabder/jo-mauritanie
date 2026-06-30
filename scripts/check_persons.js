const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('persons').select('id, full_name_ar');
  console.log('persons rows:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log(data);
  }
}

main();
