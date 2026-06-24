import os, re

migrations_dir = "supabase/migrations"
files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])

FIXES = {
    "002_institutions_and_persons.sql": [
        # Fix 1: Remove GENERATED search_vector from institutions - replace with plain tsvector
        (
            r"  -- Search vector \(multilingual\)\n  search_vector       TSVECTOR GENERATED ALWAYS AS \(\n    setweight\(to_tsvector\('arabic', COALESCE\(name_ar, ''\)\), 'A'\) \|\|\n    setweight\(to_tsvector\('french', COALESCE\(name_fr, ''\)\), 'A'\) \|\|\n    setweight\(to_tsvector\('simple', COALESCE\(short_name_ar, ''\) \|\| ' ' \|\| COALESCE\(short_name_fr, ''\)\), 'B'\) \|\|\n    setweight\(to_tsvector\('simple', COALESCE\(code, ''\)\), 'C'\)\n  \) STORED",
            "  -- Search vector (multilingual)\n  search_vector       TSVECTOR"
        ),
        # Fix 2: Remove GENERATED search_vector from persons
        (
            r"  -- Search vector\n  search_vector       TSVECTOR GENERATED ALWAYS AS \(\n    setweight\(to_tsvector\('arabic', COALESCE\(full_name_ar, ''\)\), 'A'\) \|\|\n    setweight\(to_tsvector\('french', COALESCE\(full_name_fr, ''\)\), 'A'\) \|\|\n    setweight\(to_tsvector\('arabic', COALESCE\(biography_ar, ''\)\), 'C'\)\n  \) STORED",
            "  -- Search vector\n  search_vector       TSVECTOR"
        ),
    ],
    "004_documents.sql": [
        # Fix: Remove GENERATED search_vector from documents
        (
            r"  search_vector         TSVECTOR GENERATED ALWAYS AS \(.*?\) STORED,",
            "  search_vector         TSVECTOR,"
        ),
    ],
    "006_appointments.sql": [
        # Fix: Remove GENERATED search_vector from appointments
        (
            r"  search_vector           TSVECTOR GENERATED ALWAYS AS \(.*?\) STORED",
            "  search_vector           TSVECTOR"
        ),
    ],
}

for fname, patches in FIXES.items():
    fpath = os.path.join(migrations_dir, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    original = content
    for pattern, replacement in patches:
        content, n = re.subn(pattern, replacement, content, flags=re.DOTALL)
        if n:
            print(f"  ✅ Fixed in {fname}: {n} match(es)")
        else:
            print(f"  ⚠️  No match for pattern in {fname}: {pattern[:60]}...")
    if content != original:
        with open(fpath, 'w') as f:
            f.write(content)

print("\nDone.")
