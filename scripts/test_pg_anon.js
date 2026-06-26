const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('persons').select('id, full_name_ar, full_name_fr, current_role_title_ar, current_role_title_fr, gender, is_active');
  console.log("Error:", error);
  console.log("Persons count:", data?.length);
}
run();
