import os

def main():
    migrations_dir = "supabase/migrations"
    files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    
    combined_sql = [
        "DROP VIEW IF EXISTS public.document_entities CASCADE;\n",
        "DROP VIEW IF EXISTS public.entities CASCADE;\n",
        "DROP VIEW IF EXISTS public.timeline_events CASCADE;\n",
        "DROP VIEW IF EXISTS public.v_latest_issues CASCADE;\n",
        "DROP VIEW IF EXISTS public.v_documents_with_institution CASCADE;\n",
        "DROP VIEW IF EXISTS public.v_recent_appointments CASCADE;\n",
        "DROP TABLE IF EXISTS public.documents CASCADE;\n",
        "DROP TABLE IF EXISTS public.sync_logs CASCADE;\n",
        "DROP TABLE IF EXISTS public.kg_nodes CASCADE;\n",
        "DROP TABLE IF EXISTS public.kg_edges CASCADE;\n\n"
    ]
    for f in files:
        path = os.path.join(migrations_dir, f)
        print(f"Reading {f}...")
        with open(path, "r", encoding="utf-8") as file:
            content = file.read()
            combined_sql.append(f"-- =========================================================\n-- FILE: {f}\n-- =========================================================\n" + content + "\n\n")
            
    output_path = "all_migrations.sql"
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("".join(combined_sql))
    print(f"Concatenated migrations written to {output_path}")

if __name__ == "__main__":
    main()
