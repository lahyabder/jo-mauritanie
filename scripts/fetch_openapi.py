import os
import requests
from dotenv import load_dotenv

def main():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing Supabase credentials in .env.local")
        return
        
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}"
    }
    
    # Get OpenAPI description
    r = requests.get(url + "/rest/v1/", headers=headers)
    if r.status_code != 200:
        print(f"Failed to fetch schema: {r.status_code} {r.text}")
        return
        
    schema = r.json()
    paths = schema.get("paths", {})
    
    print("Exposed tables and views:")
    for path in sorted(paths.keys()):
        if path.startswith("/rpc/"):
            print(f"  [RPC] {path}")
        elif path == "/":
            pass
        else:
            print(f"  [Table/View] {path}")

if __name__ == "__main__":
    main()
