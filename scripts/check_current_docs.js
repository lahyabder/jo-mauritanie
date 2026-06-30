const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title_ar, pdf_page_start');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Current Documents:');
  console.log(data);
}

main();
