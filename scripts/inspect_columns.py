import os
import requests
from dotenv import load_dotenv

def main():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}"
    }
    
    r = requests.get(url + "/rest/v1/", headers=headers)
    if r.status_code != 200:
        print(f"Failed: {r.status_code}")
        return
        
    schema = r.json()
    definitions = schema.get("definitions", {})
    
    doc_def = definitions.get("documents", {})
    print("Columns in 'documents' definition:")
    for prop, details in doc_def.get("properties", {}).items():
        print(f"  {prop}: {details.get('type')} ({details.get('description', '')})")

if __name__ == "__main__":
    main()
