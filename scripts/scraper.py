import os
import time
import requests
import json
import re
from bs4 import BeautifulSoup
from supabase import create_client, Client
from google import genai
from google.genai import types

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print("Error: Missing environment variables.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = genai.Client(api_key=GEMINI_API_KEY)

TARGET_URL = "https://msgg.gov.mr/ar/ar-droit-mauritanien/le-journal-officiel-ar.html"

def get_pdf_links():
    print(f"Fetching {TARGET_URL}")
    response = requests.get(TARGET_URL)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    pdf_links = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.lower().endswith('.pdf'):
            if not href.startswith('http'):
                href = "https://msgg.gov.mr" + href if href.startswith('/') else "https://msgg.gov.mr/" + href
            pdf_links.append(href)
    return list(set(pdf_links))

def is_processed(pdf_url):
    filename = pdf_url.split('/')[-1]
    res = supabase.table('sync_logs').select('id').eq('file_name', filename).eq('status', 'success').execute()
    return len(res.data) > 0

def process_pdf(pdf_url):
    filename = pdf_url.split('/')[-1]
    print(f"Processing {filename}...")
    
    # 1. Download PDF
    response = requests.get(pdf_url)
    temp_path = f"/tmp/{filename}"
    with open(temp_path, 'wb') as f:
        f.write(response.content)
        
    # 2. Log processing start
    log_res = supabase.table('sync_logs').insert({"file_name": filename, "status": "processing"}).execute()
    log_id = log_res.data[0]['id']
    
    try:
        # 3. Upload to Gemini
        gemini_file = client.files.upload(file=temp_path, config={'display_name': filename})
        print(f"Uploaded to Gemini as {gemini_file.name}")
        
        # 4. Wait for processing if needed
        while True:
            f_info = client.files.get(name=gemini_file.name)
            if f_info.state == 'ACTIVE':
                break
            elif f_info.state == 'FAILED':
                raise Exception("Gemini file processing failed")
            print("Waiting for file to be ready...")
            time.sleep(3)
            
        # Extract issue metadata first via regex or simple name parsing if possible, but Gemini is better.
        # 5. Extract with structured output
        prompt = """
        أنت محلل قانوني وخبير في القانون الموريتاني. قم بقراءة الجريدة الرسمية الموريتانية المرفقة.
        
        المطلوب:
        1. استخراج بيانات العدد (رقم العدد، تاريخ الإصدار).
        2. استخراج جميع الوثائق (القوانين، المراسيم، المقررات، التعيينات، الإعلانات).
        3. استخراج الشخصيات والمؤسسات المذكورة.
        4. استخراج العلاقات القانونية (مثلاً: مرسوم يعين شخصاً، قانون يلغي قانوناً، مرسوم ينشئ مؤسسة).
        
        ملاحظة: تاريخ النشر يجب أن يكون بصيغة YYYY-MM-DD. 
        أنواع الوثائق: law, decree, decision, regulation, circular, notification, announcement, appointment.
        أنواع الكيانات: person, institution.
        أنواع العلاقات: amends, repeals, replaces, implements, creates, appoints, dismisses, mentions.
        
        أرجع البيانات بصيغة JSON فقط:
        {
          "issue": {
            "issue_number": "رقم العدد",
            "published_date": "YYYY-MM-DD"
          },
          "documents": [
            {
              "local_id": "doc_1", // معرّف مؤقت للاستخدام في العلاقات
              "title": "عنوان الوثيقة",
              "type": "law|decree|...",
              "published_date": "YYYY-MM-DD",
              "snippet": "ملخص",
              "full_text": "النص الكامل"
            }
          ],
          "entities": [
            {
              "local_id": "ent_1", // معرّف مؤقت للاستخدام في العلاقات
              "name": "اسم الشخص أو المؤسسة",
              "type": "person|institution",
              "description": "وصف قصير",
              "color": "لون HEX"
            }
          ],
          "relations": [
            {
              "source_local_id": "doc_1",
              "target_local_id": "ent_1",
              "relation_type": "appoints|mentions|..."
            }
          ]
        }
        """
        
        print("Asking Gemini for JSON extraction...")
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=[gemini_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        
        data = json.loads(response.text)
        
        # 6. Insert to Supabase
        print("Saving to Supabase...")
        
        # Create issue
        issue_data = data.get("issue", {})
        issue_insert = supabase.table("issues").insert({
            "issue_number": issue_data.get("issue_number", "Unknown"),
            "published_date": issue_data.get("published_date") or None,
            "pdf_url": pdf_url
        }).execute()
        issue_id = issue_insert.data[0]['id']
        
        # Track inserted IDs mapping
        id_map = {}
        
        # Insert documents
        for doc in data.get("documents", []):
            local_id = doc.pop("local_id", None)
            doc["issue_id"] = issue_id
            if not doc.get("published_date"):
                doc["published_date"] = issue_data.get("published_date") or None
                
            res = supabase.table("documents").insert(doc).execute()
            if local_id:
                id_map[local_id] = {"type": "document", "id": res.data[0]['id']}
                
        # Insert entities
        for ent in data.get("entities", []):
            local_id = ent.pop("local_id", None)
            res = supabase.table("entities").insert(ent).execute()
            if local_id:
                id_map[local_id] = {"type": "entity", "id": res.data[0]['id']}
                
        # Insert relations
        for rel in data.get("relations", []):
            src_local = rel.get("source_local_id")
            tgt_local = rel.get("target_local_id")
            rel_type = rel.get("relation_type")
            
            if src_local in id_map and tgt_local in id_map:
                supabase.table("legal_relations").insert({
                    "source_type": id_map[src_local]["type"],
                    "source_id": id_map[src_local]["id"],
                    "target_type": id_map[tgt_local]["type"],
                    "target_id": id_map[tgt_local]["id"],
                    "relation_type": rel_type
                }).execute()
            
        # Mark success
        supabase.table('sync_logs').update({"status": "success", "error_message": None}).eq("id", log_id).execute()
        print(f"Successfully processed {filename}")
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")
        supabase.table('sync_logs').update({"status": "error", "error_message": str(e)}).eq("id", log_id).execute()
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def main():
    links = get_pdf_links()
    print(f"Found {len(links)} PDFs on the site.")
    
    processed_count = 0
    for link in links:
        if not is_processed(link):
            process_pdf(link)
            processed_count += 1
            if processed_count >= 3: 
                print("Reached limit of 3 PDFs per run. Stopping for now. Will resume next run.")
                break
        else:
            print(f"Already processed: {link}")

if __name__ == "__main__":
    main()
