const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Starting deletion of upload jobs and extracted documents...');
  
  // Delete all upload jobs (this cascades to extracted_documents, upload_job_logs, etc.)
  console.log('Deleting all upload_jobs...');
  const { error: jobError } = await supabase
    .from('upload_jobs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (jobError) {
    console.error('Error deleting upload_jobs:', jobError);
    return;
  }
  console.log('Upload jobs deleted successfully.');

  console.log('Admin review panel is now fully cleaned!');
}

main();
