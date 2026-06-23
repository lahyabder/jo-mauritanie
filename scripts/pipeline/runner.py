"""
Pipeline Runner — Orchestrator
================================
Runs all 15 stages for one Official Gazette issue.
Supports:
  - dry_run=True   → full execution, NOTHING written to DB, manifest saved
  - dry_run=False  → full execution, data committed to DB (requires QC pass)

Usage:
  python run_pipeline.py --dry-run          # Safe test
  python run_pipeline.py --commit           # Production import (after dry-run approval)
  python run_pipeline.py --url <pdf_url>    # Process a specific issue
"""

import os
import json
import traceback
from datetime import datetime
from pathlib import Path

from supabase import create_client, Client
from google import genai

from .config import (
    PIPELINE_VERSION, EXTRACTION_VERSION, AI_MODEL_VERSION, PROMPT_VERSION,
    OG_SOURCE_CODE, MAX_ISSUES_PER_RUN
)
from .manifest import ImportManifest
from .stages_01_07 import (
    StageError,
    stage_01_discovery,
    stage_02_download,
    stage_03_ocr,
    stage_04_to_07_ai_extraction,
)
from .stages_08_15 import (
    stage_08_to_11_validate_ai_output,
    stage_12_deduplication,
    stage_13_quality_control,
    stage_14_db_commit,
    stage_15_post_processing,
)
from .stage_16_knowledge import stage_16_knowledge_layer


def _init_clients():
    from dotenv import load_dotenv
    # Load from .env.local in the project root (two levels up from this script)
    root_path = Path(__file__).resolve().parents[2]
    load_dotenv(dotenv_path=root_path / ".env.local")

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    gemini_key   = os.environ.get("GEMINI_API_KEY")

    if not supabase_url or not supabase_key:
        raise EnvironmentError(
            "Missing database environment variables: NEXT_PUBLIC_SUPABASE_URL, "
            "SUPABASE_SERVICE_ROLE_KEY"
        )

    supabase = create_client(supabase_url, supabase_key)
    gemini = None
    if gemini_key:
        gemini = genai.Client(api_key=gemini_key)
    else:
        print("[Warning] GEMINI_API_KEY is not set in environment. Only mock benchmark runs will succeed.")

    return supabase, gemini


def _get_og_source_id(supabase) -> str:
    try:
        res = supabase.table("legal_sources").select("id").eq("code", OG_SOURCE_CODE).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        print(f"[Warning] Could not connect to Supabase ({e}). Using fallback source ID.")
        return "00000000-0000-0000-0000-000000000000"
        
    raise RuntimeError(
        f"legal_source '{OG_SOURCE_CODE}' not found in DB. "
        "Did you run the schema v3.0 SQL? It seeds this row automatically."
    )


def _create_sync_log(supabase, source_id: str, pdf_url: str, filename: str) -> str:
    res = supabase.table("sync_logs").insert({
        "source_id":          source_id,
        "file_name":          filename,
        "pdf_url":            pdf_url,
        "status":             "processing",
        "ai_model_used":      AI_MODEL_VERSION,
        "extraction_version": EXTRACTION_VERSION,
    }).execute()
    return res.data[0]["id"]


def run_pipeline_for_issue(
    item: dict,
    supabase: Client,
    gemini_client,
    og_source_id: str,
    dry_run: bool,
    manifests_dir: str = "manifests",
) -> ImportManifest:
    """
    Execute all 15 stages for a single issue.
    Returns the completed ImportManifest.
    """
    manifest = ImportManifest(
        pdf_url=item["url"],
        pipeline_version=PIPELINE_VERSION,
        extraction_version=EXTRACTION_VERSION,
        ai_model_version=AI_MODEL_VERSION,
        prompt_version=PROMPT_VERSION,
        dry_run=dry_run,
    )

    sync_log_id = None
    if not dry_run:
        sync_log_id = _create_sync_log(supabase, og_source_id, item["url"], item["filename"])
        item["sync_log_id"] = sync_log_id

    try:
        # Stage 2: Download
        item = stage_02_download(item, manifest)

        # Stage 3: OCR check
        item = stage_03_ocr(item, manifest)

        # Stages 4–7: AI Extraction (Segmentation + Metadata + Articles + NER)
        item = stage_04_to_07_ai_extraction(item, gemini_client, manifest)

        # Stages 8–11: Validate Relations, Citations, Appointments, Topics
        item = stage_08_to_11_validate_ai_output(item, manifest)

        # Stage 12: Deduplication
        item = stage_12_deduplication(item, supabase, manifest, dry_run=dry_run)

        # Stage 13: Quality Control
        item = stage_13_quality_control(item, manifest)

        # Stage 14: DB Commit (production only — skipped in dry-run)
        if dry_run:
            print("[Stage 14] DRY RUN — database commit SKIPPED ✅")
            manifest.mark_stage_done("14_db_commit_dry_run_skipped")
            stage_16_knowledge_layer(item, supabase, gemini_client, manifest, dry_run=True)
        else:
            if manifest.errors:
                print(f"[Stage 14] BLOCKED — {len(manifest.errors)} critical QC error(s) prevent commit.")
                raise StageError("QC failed — aborting production commit")
            item = stage_14_db_commit(item, supabase, manifest, og_source_id)
            stage_15_post_processing(item, supabase, manifest)
            stage_16_knowledge_layer(item, supabase, gemini_client, manifest, dry_run=False)

    except StageError as e:
        stage = "unknown"
        manifest.mark_stage_failed(stage, str(e))
        manifest.add_error("runner", "STAGE_ERROR", str(e))
        print(f"[Runner] STAGE ERROR: {e}")
    except Exception as e:
        manifest.add_error("runner", "UNEXPECTED_ERROR", str(e))
        print(f"[Runner] UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        if sync_log_id:
            supabase.table("sync_logs").update({
                "status": "error",
                "error_message": str(e),
            }).eq("id", sync_log_id).execute()
    finally:
        manifest.finalize()

        # Save manifest to disk
        Path(manifests_dir).mkdir(parents=True, exist_ok=True)
        safe_name = item["filename"].replace(".pdf", "")
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        mode = "dry_run" if dry_run else "production"
        manifest_path = f"{manifests_dir}/{safe_name}_{mode}_{ts}.json"
        manifest.save(manifest_path)
        print(f"[Runner] Manifest saved → {manifest_path}")

        # Cleanup temp file
        if "local_path" in item:
            try:
                os.remove(item["local_path"])
            except FileNotFoundError:
                pass

    return manifest


def run(dry_run: bool = True, specific_url: str = None, operator: str = "automated"):
    """
    Main entry point.
    dry_run=True  → mandatory for first-ever run on each issue.
    dry_run=False → production import (only after dry-run approval).
    """
    print(f"\n{'='*60}")
    print(f"  MAURITANIAN OFFICIAL GAZETTE — INGESTION PIPELINE v{PIPELINE_VERSION}")
    print(f"  Mode: {'🔵 DRY RUN (no DB writes)' if dry_run else '🟢 PRODUCTION (writing to DB)'}")
    print(f"  AI:   {AI_MODEL_VERSION}")
    print(f"{'='*60}\n")

    supabase, gemini_client = _init_clients()
    og_source_id = _get_og_source_id(supabase)

    if specific_url:
        issues_to_process = [{"url": specific_url, "filename": specific_url.split("/")[-1]}]
    else:
        # Stage 1: Discovery (always runs — even in dry-run — against live site)
        dummy_manifest = ImportManifest(pdf_url="discovery")
        issues_to_process = stage_01_discovery(supabase, dummy_manifest)
        issues_to_process = issues_to_process[:MAX_ISSUES_PER_RUN]

    if not issues_to_process:
        print("[Runner] No new issues to process. Exiting.")
        return

    results = []
    for item in issues_to_process:
        print(f"\n[Runner] Processing: {item['filename']}")
        manifest = run_pipeline_for_issue(
            item=item,
            supabase=supabase,
            gemini_client=gemini_client,
            og_source_id=og_source_id,
            dry_run=dry_run,
            manifests_dir="manifests",
        )
        manifest.print_report()
        results.append(manifest)

    # Summary
    passed = sum(1 for m in results if m.qc_passed)
    failed = len(results) - passed
    print(f"\n[Runner] Done. Processed {len(results)} issue(s): ✅ {passed} passed, ❌ {failed} failed.")

    if dry_run and passed > 0:
        print("\n[Runner] ⚠️  DRY RUN COMPLETE.")
        print("[Runner]     Review the manifest file(s) in the 'manifests/' directory.")
        print("[Runner]     If satisfied, re-run with --commit to write to production DB.")
