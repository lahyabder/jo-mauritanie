const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Starting cleanup of orphan persons and institutions...');
  
  // Clean up persons with no appointments
  const { data: persons, error: pErr } = await supabase
    .from('persons')
    .select('id, appointment_history!left(id)');
    
  if (pErr) {
    console.error('Error fetching persons:', pErr);
    return;
  }
  
  const orphanPersons = persons.filter(p => !p.appointment_history || p.appointment_history.length === 0).map(p => p.id);
  console.log(`Found ${orphanPersons.length} orphan persons.`);
  
  if (orphanPersons.length > 0) {
    const { error: delPErr } = await supabase.from('persons').delete().in('id', orphanPersons);
    if (delPErr) console.error('Error deleting orphan persons:', delPErr);
    else console.log('Successfully deleted orphan persons.');
  }

  // Clean up institutions with no appointments
  const { data: institutions, error: iErr } = await supabase
    .from('institutions')
    .select('id, appointment_history!left(id)');
    
  if (iErr) {
    console.error('Error fetching institutions:', iErr);
    return;
  }
  
  const orphanInstitutions = institutions.filter(i => !i.appointment_history || i.appointment_history.length === 0).map(i => i.id);
  console.log(`Found ${orphanInstitutions.length} orphan institutions.`);
  
  if (orphanInstitutions.length > 0) {
    const { error: delIErr } = await supabase.from('institutions').delete().in('id', orphanInstitutions);
    if (delIErr) console.error('Error deleting orphan institutions:', delIErr);
    else console.log('Successfully deleted orphan institutions.');
  }
  
  console.log('Cleanup finished.');
}

main();
