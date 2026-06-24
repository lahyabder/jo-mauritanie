import os
from dotenv import load_dotenv
from supabase import create_client

def main():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    try:
        print("Querying documents table like DocumentCategoryEngine...")
        res = supabase.table("documents")\
            .select("*, issues(issue_number, pdf_url)")\
            .eq("type", "decision")\
            .order("document_date", desc=True)\
            .limit(10)\
            .execute()
        print("  ✅ Success! Data:", res.data)
    except Exception as e:
        print("  ❌ Failed:", e)

if __name__ == "__main__":
    main()
