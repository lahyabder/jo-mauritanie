const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, pdf_page_start, pdf_url')
    .eq('id', '56cd779a-6db5-403a-9002-af1471b71cab')
    .single();

  console.log('Result:', data);
  if (error) console.error('Error:', error);
}

main();
