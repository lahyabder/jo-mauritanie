import os
from dotenv import load_dotenv
from supabase import create_client

def main():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    try:
        print("Trying to insert into persons table...")
        res = supabase.table("persons").insert({
            "full_name_ar": "تجربة"
        }).execute()
        print("  ✅ Success! Inserted:", res.data)
    except Exception as e:
        print("  ❌ Failed:", e)

if __name__ == "__main__":
    main()
