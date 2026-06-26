import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

# Get any valid person, institution and document
person = supabase.table('persons').select('id').limit(1).execute().data[0]['id']
inst = supabase.table('institutions').select('id').limit(1).execute().data[0]['id']
doc = supabase.table('documents').select('id').limit(1).execute().data[0]['id']

try:
    res = supabase.table('appointments').insert({
        'person_id': person,
        'person_name_ar': 'تجربة',
        'institution_id': inst,
        'document_id': doc,
        'position_title_ar': 'وزير',
        'appointment_type': 'nomination',
        'is_current': True
    }).execute()
    print("Success:", res)
except Exception as e:
    print("Error:", e)
