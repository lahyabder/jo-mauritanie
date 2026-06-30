const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error(error);
    return;
  }
  
  for (let i = 0; i < data.length; i++) {
    await supabase.from('documents').update({ pdf_page_start: i + 1 }).eq('id', data[i].id);
  }
  
  console.log('Fixed current documents pdf_page_start to sequential numbers.');
}

main();
