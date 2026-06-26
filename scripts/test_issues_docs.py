import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase: Client = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table('issues').select('issue_number, documents(count)').execute()
for r in res.data:
    print(f"Issue {r['issue_number']}: {r['documents'][0]['count'] if r['documents'] else 0} documents")
