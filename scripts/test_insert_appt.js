const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: persons } = await supabase.from('persons').select('id').limit(1);
  const { data: insts } = await supabase.from('institutions').select('id').limit(1);
  const { data: docs } = await supabase.from('documents').select('id, issue_id').limit(1);
  
  if (persons.length && insts.length && docs.length) {
    const pId = persons[0].id;
    const iId = insts[0].id;
    const dId = docs[0].id;
    const isId = docs[0].issue_id;
    
    console.log({pId, iId, dId, isId});
    
    const { data, error } = await supabase.from('appointment_history').insert({
      person_id: pId,
      institution_id: iId,
      instrument_document_id: dId,
      instrument_issue_id: isId,
      position_title_ar: 'Test Appt',
      appointment_type: 'nomination',
      appointment_date: '2024-01-01'
    }).select();
    
    console.log('Result:', data, error);
  } else {
    console.log('Missing data');
  }
}

main();
