import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table('appointments').select('*').limit(5).execute()
print(f"Total appointments: {len(res.data)}")
