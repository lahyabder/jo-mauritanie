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
    
    # Try querying the new tables
    tables = [
        "legal_events",
        "knowledge_cards",
        "document_collections",
        "collection_documents",
        "semantic_links",
        "ai_narratives",
        "knowledge_scores"
    ]
    
    print("Checking Knowledge Layer tables:")
    for table in tables:
        try:
            res = supabase.table(table).select("*", count="exact").limit(1).execute()
            print(f"  ✅ {table:25} exists (row count: {res.count})")
        except Exception as e:
            print(f"  ❌ {table:25} error: {e}")

if __name__ == "__main__":
    main()
