const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// We can't run ALTER TABLE directly without pg connection.
// Instead, we'll check if the column already exists and update data accordingly.
// The sector field will be managed via the AI prompt + code logic (not DB column).

async function main() {
  // Check institution columns
  const { data, error } = await s.from('institutions').select('*').limit(1);
  if (error) { console.error(error); return; }
  if (data && data[0]) {
    const cols = Object.keys(data[0]);
    console.log('Institution columns:', cols);
    console.log('Has sector:', cols.includes('sector'));
  }
  
  // Check person columns  
  const { data: pd } = await s.from('persons').select('*').limit(1);
  if (pd && pd[0]) {
    const cols = Object.keys(pd[0]);
    console.log('Person columns:', cols);
    console.log('Has sector:', cols.includes('sector'));
  }
}
main();
