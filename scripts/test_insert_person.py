import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
try:
    res = supabase.table('persons').insert({
        'full_name_ar': 'تجربة',
        'gender': 'M',
        'is_active': True
    }).execute()
    print("Success:", res)
except Exception as e:
    print("Error:", e)
