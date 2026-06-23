import os
import sys
import json
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline.runner import run_pipeline_for_issue, _init_clients, _get_og_source_id
from pipeline.manifest import ImportManifest

GOLDEN_MANIFEST_PATH = Path(__file__).resolve().parents[1] / "manifests" / "golden_benchmark.json"
BENCHMARK_PDF_PATH = Path(__file__).resolve().parents[1] / "public" / "mauritanie-jo-2026-1606-ar.pdf"

def run_regression_test():
    print("\n" + "=" * 60)
    print("  MAURITANIAN OFFICIAL GAZETTE — AUTOMATED REGRESSION TESTS")
    print("=" * 60 + "\n")

    # 1. Check if benchmark PDF exists
    if not BENCHMARK_PDF_PATH.exists():
        print(f"❌ Error: Benchmark PDF not found at {BENCHMARK_PDF_PATH}")
        sys.exit(1)

    # 2. Check if golden benchmark exists
    if not GOLDEN_MANIFEST_PATH.exists():
        print(f"⚠️ Warning: Golden benchmark reference not found at {GOLDEN_MANIFEST_PATH}.")
        print("Creating first-ever golden reference using current pipeline version...")
        create_golden = True
    else:
        create_golden = False

    # 3. Initialize DB and Gemini clients
    try:
        supabase, gemini_client = _init_clients()
        og_source_id = _get_og_source_id(supabase)
    except Exception as e:
        print(f"❌ Initialization Error: {e}")
        print("Please check that NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY are configured in .env.local")
        sys.exit(1)

    # 4. Execute pipeline in dry-run mode on benchmark issue
    item = {
        "url": f"file://{BENCHMARK_PDF_PATH.resolve()}",
        "filename": BENCHMARK_PDF_PATH.name
    }

    print(f"Running pipeline on {BENCHMARK_PDF_PATH.name} in DRY RUN...")
    manifest = run_pipeline_for_issue(
        item=item,
        supabase=supabase,
        gemini_client=gemini_client,
        og_source_id=og_source_id,
        dry_run=True
    )

    manifest_data = manifest.to_dict()

    # 5. Check for critical errors first
    if not manifest.qc_passed or len(manifest.errors) > 0:
        print(f"❌ QC FAILED: Manifest contains {len(manifest.errors)} critical errors:")
        for err in manifest.errors:
            print(f"   - [{err['stage']}] {err['message']}")
        sys.exit(1)

    # 6. If golden reference is missing, save current run as reference and exit
    if create_golden:
        GOLDEN_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        # We also embed raw extracted list in the golden dataset for deep comparisons
        manifest_data["raw_extracted"] = manifest.raw_extracted if hasattr(manifest, "raw_extracted") else {}
        with open(GOLDEN_MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, ensure_ascii=False, indent=2)
        print(f"✅ Created Golden reference dataset successfully at {GOLDEN_MANIFEST_PATH}")
        sys.exit(0)

    # 7. Otherwise, load golden reference and run regression checks
    with open(GOLDEN_MANIFEST_PATH, "r", encoding="utf-8") as f:
        golden_data = json.load(f)

    print("\nComparing metrics against Golden Reference:")
    regressions = []

    # Helper function to check for drop in counts
    def check_count(name, current, golden, min_allowed_percent=1.0):
        print(f"  - {name:25} Current: {current:3} | Golden: {golden:3}")
        if current < golden * min_allowed_percent:
            regressions.append(
                f"{name} dropped from {golden} to {current} (greater than allowed threshold)"
            )

    # Compare key extraction metrics
    curr_ext = manifest_data.get("extraction", {})
    gold_ext = golden_data.get("extraction", {})

    check_count("Documents Found", curr_ext.get("documents", 0), gold_ext.get("documents", 0))
    check_count("Articles Found", curr_ext.get("articles", 0), gold_ext.get("articles", 0))
    check_count("Persons Extracted", curr_ext.get("persons", 0), gold_ext.get("persons", 0))
    check_count("Institutions Extracted", curr_ext.get("institutions", 0), gold_ext.get("institutions", 0))
    check_count("Appointments Extracted", curr_ext.get("appointments", 0), gold_ext.get("appointments", 0))
    check_count("Relations Extracted", curr_ext.get("relations", 0), gold_ext.get("relations", 0))
    check_count("Citations Extracted", curr_ext.get("citations", 0), gold_ext.get("citations", 0))

    print("\nRegression Report Summary:")
    if regressions:
        print("❌ FAILED: Quality regression detected!")
        for reg in regressions:
            print(f"   - {reg}")
        sys.exit(1)
    else:
        print("✅ PASSED: No regression detected. Code is certified stable!")
        sys.exit(0)

if __name__ == "__main__":
    run_regression_test()
