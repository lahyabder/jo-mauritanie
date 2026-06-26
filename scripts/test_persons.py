import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table('persons').select('*').execute()
print(f"Total persons: {len(res.data)}")
if len(res.data) > 0:
    print(res.data[0])
