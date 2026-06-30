const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Starting deletion of mock data...');
  
  // 1. Delete all documents (this cascades to type-specific tables, articles, appointments, relations, etc.)
  console.log('Deleting all documents...');
  const { error: docError } = await supabase
    .from('documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (docError) {
    console.error('Error deleting documents:', docError);
    return;
  }
  console.log('Documents deleted successfully.');

  // 2. Delete all issues
  console.log('Deleting all issues...');
  const { error: issueError } = await supabase
    .from('issues')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (issueError) {
    console.error('Error deleting issues:', issueError);
    return;
  }
  console.log('Issues deleted successfully.');

  console.log('All mock gazette data cleared! You can now start fresh from the Admin Upload Center.');
}

main();
