const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Starting deletion of persons and institutions mock data...');
  
  // 1. Delete all persons
  console.log('Deleting all persons...');
  const { error: personError } = await supabase
    .from('persons')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (personError) {
    console.error('Error deleting persons:', personError);
    return;
  }
  console.log('Persons deleted successfully.');

  // 2. Delete all institutions
  console.log('Deleting all institutions...');
  const { error: instError } = await supabase
    .from('institutions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (instError) {
    console.error('Error deleting institutions:', instError);
    return;
  }
  console.log('Institutions deleted successfully.');

  console.log('All mock persons and institutions cleared! The database is now 100% fresh.');
}

main();
