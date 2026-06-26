import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table('sync_logs').select('*').order('started_at', desc=True).limit(2).execute()
for r in res.data:
    print(f"File: {r['file_name']}, Status: {r['status']}, Error: {r['error_message']}")
    print(f"Docs: {r['documents_extracted']}, Persons: {r['persons_extracted']}, Insts: {r['institutions_extracted']}")
    print(f"Created: {r['started_at']}")
    print("---")
