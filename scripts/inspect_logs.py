import os
from dotenv import load_dotenv
from supabase import create_client

def main():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    try:
        res = supabase.table("sync_logs").select("*").execute()
        print("sync_logs rows:")
        for row in res.data:
            print(row)
    except Exception as e:
        print("Failed to query sync_logs:", e)

if __name__ == "__main__":
    main()
