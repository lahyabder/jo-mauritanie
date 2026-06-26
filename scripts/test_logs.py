import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table('sync_logs').select('file_name, status, documents_extracted, error_message').execute()
for r in res.data:
    print(f"{r['file_name']}: docs={r['documents_extracted']} status={r['status']} err={r['error_message']}")
