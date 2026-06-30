const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
  const tables = [
    'appointment_history',
    'knowledge_collection_cards',
    'knowledge_collections',
    'knowledge_events',
    'knowledge_cards',
    'knowledge_graph_edges',
    'knowledge_graph_nodes',
    'documents',
    'issues',
    'persons',
    'institutions',
    'job_logs',
    'background_jobs'
  ];

  for (const table of tables) {
    console.log(`Deleting all from ${table}...`);
    // Delete all records where created_at is not null (which is all of them)
    // or just neq id to some fake uuid
    const { error } = await s.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.log(`Failed to delete from ${table}:`, error);
    } else {
      console.log(`Deleted all records from ${table}.`);
    }
  }
  
  // also delete files from storage
  console.log('Fetching files from gazettes bucket...');
  const { data: files, error: listError } = await s.storage.from('gazettes').list();
  if (listError) {
    console.log('Failed to list files:', listError);
  } else if (files && files.length > 0) {
     const fileNames = files.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => f.name);
     if (fileNames.length > 0) {
         const { error: rmError } = await s.storage.from('gazettes').remove(fileNames);
         if (rmError) {
           console.log('Failed to empty gazettes bucket:', rmError);
         } else {
           console.log(`Deleted ${fileNames.length} files from gazettes bucket.`);
         }
     } else {
         console.log('Gazettes bucket has no actual files.');
     }
  } else {
     console.log('Gazettes bucket is already empty.');
  }
}
clean();
