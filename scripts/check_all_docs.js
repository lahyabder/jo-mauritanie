const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title_ar, pdf_page_start');

  console.log('Total documents:', data.length);
  console.log('Docs with missing page_start:', data.filter(d => d.pdf_page_start === null).length);
  console.log('Docs with page_start:', data.filter(d => d.pdf_page_start !== null));
}

main();
