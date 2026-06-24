import os
from dotenv import load_dotenv
from supabase import create_client

def main():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing Supabase credentials in .env.local")
        return
        
    supabase = create_client(url, key)
    
    queries = [
        ("exec_sql", {"query": "SELECT 1"}),
        ("exec_sql", {"sql": "SELECT 1"}),
        ("execute_sql", {"sql": "SELECT 1"}),
        ("run_sql", {"sql": "SELECT 1"}),
    ]
    
    for rpc_name, args in queries:
        try:
            res = supabase.rpc(rpc_name, args).execute()
            print(f"  ✅ RPC {rpc_name} exists! Response: {res.data}")
            return
        except Exception as e:
            print(f"  ❌ RPC {rpc_name} failed: {e}")

if __name__ == "__main__":
    main()
