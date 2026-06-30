require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProgress() {
  const { count: issuesCount } = await supabase.from('issues').select('*', { count: 'exact', head: true });
  const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });
  const { count: personsCount } = await supabase.from('persons').select('*', { count: 'exact', head: true });
  const { count: instCount } = await supabase.from('institutions').select('*', { count: 'exact', head: true });

  const { data: latestIssues } = await supabase
    .from('issues')
    .select('issue_number, language, publication_date, is_published')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('=== DATABASE PROGRESS ===');
  console.log(`Issues: ${issuesCount}`);
  console.log(`Documents: ${docsCount}`);
  console.log(`Persons: ${personsCount}`);
  console.log(`Institutions: ${instCount}`);
  console.log('\nLatest Issues Inserted:');
  console.table(latestIssues);
}

checkProgress();
