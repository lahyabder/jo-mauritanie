require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase
    .from('issues')
    .select('*, documents(count)')
    .eq('language', 'ar')
    .order('publication_date', { ascending: false });
  console.log("Error:", error);
  console.log("Data count:", data?.length);
}
test();
