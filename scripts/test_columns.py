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
    
    # Let's try querying fields from the new documents table schema
    fields = [
        "id", "official_number", "issue_id", "type", "title_ar", 
        "ai_summary_ar", "is_current_version", "created_at"
    ]
    
    print("Testing fields on 'documents' table:")
    for field in fields:
        try:
            res = supabase.table("documents").select(field).limit(1).execute()
            print(f"  ✅ Field '{field}' exists")
        except Exception as e:
            print(f"  ❌ Field '{field}' error: {e}")

if __name__ == "__main__":
    main()
