const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('persons').select('*');
  console.log("Error:", error);
  console.log("Persons count:", data?.length);
  if (data?.length > 0) {
    console.log("First person:", data[0].full_name_ar, data[0].is_active);
  }
}
run();
