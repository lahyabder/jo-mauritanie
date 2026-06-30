import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  console.log('Clearing database tables...');
  
  const tables = [
    'document_relations',
    'documents',
    'issues',
    'persons',
    'institutions',
    'entities',
    'sync_logs',
    'knowledge_edges',
    'knowledge_nodes'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    // Supabase JS doesn't support TRUNCATE directly, so we delete where id is not null
    // or just match all rows. But we have to be careful with RLS.
    // Since we use the service_role key, it bypasses RLS.
    // To delete all, we can do neq('id', '00000000-0000-0000-0000-000000000000') or similar.
    // Or we can just use the supabase.rpc if available, but let's try a bulk delete first.
    // The easiest way to match everything in Supabase JS is .not('id', 'is', null) 
    // Wait, not all tables have an 'id' column maybe? Most do.
    
    // Let's try to query first to see if it has rows, and delete them.
    // Because deleting millions of rows this way is bad, but for a dev site it's fine.
    
    const { data, error } = await supabase.from(table).select('id');
    if (error) {
      console.log(`Error checking table ${table}:`, error.message);
      continue;
    }
    
    if (data && data.length > 0) {
      const ids = data.map(r => r.id);
      
      // Batch delete
      const batchSize = 1000;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error: delError } = await supabase.from(table).delete().in('id', batch);
        if (delError) {
          console.log(`Error deleting from ${table}:`, delError.message);
        } else {
          console.log(`Deleted ${batch.length} rows from ${table}`);
        }
      }
    } else {
      console.log(`Table ${table} is already empty or has no 'id' column.`);
    }
  }

  // Also clear storage bucket 'gazette_pdfs'
  console.log('Clearing storage bucket gazette_pdfs...');
  const { data: files, error: listError } = await supabase.storage.from('gazette_pdfs').list();
  if (listError) {
    console.log('Error listing files:', listError.message);
  } else if (files && files.length > 0) {
    const fileNames = files.map(f => f.name);
    const { error: delStorageError } = await supabase.storage.from('gazette_pdfs').remove(fileNames);
    if (delStorageError) {
      console.log('Error deleting files:', delStorageError.message);
    } else {
      console.log(`Deleted ${fileNames.length} files from storage.`);
    }
  } else {
    console.log('Storage bucket is empty.');
  }

  console.log('Data clearing complete.');
}

clearData();
