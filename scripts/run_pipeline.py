#!/usr/bin/env python3
"""
run_pipeline.py — Entry Point for the Ingestion Pipeline
=========================================================

Usage:
  # MANDATORY first: Dry-run (safe, no DB writes)
  python run_pipeline.py --dry-run

  # After reviewing the manifest, commit to production:
  python run_pipeline.py --commit

  # Process a specific issue URL:
  python run_pipeline.py --dry-run --url https://msgg.gov.mr/.../jo_1234.pdf

  # Run via GitHub Actions (automatic dry-run first, then auto-commit if clean):
  python run_pipeline.py --auto
"""

import argparse
import sys
import os

# Add scripts root to path
sys.path.insert(0, os.path.dirname(__file__))

from pipeline.runner import run


def main():
    parser = argparse.ArgumentParser(
        description="Mauritanian Official Gazette — Ingestion Pipeline v3.0"
    )

    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true",
        help="Execute full pipeline WITHOUT writing to DB. Generates manifest report.")
    mode.add_argument("--commit", action="store_true",
        help="Execute full pipeline AND write validated data to production DB.")
    mode.add_argument("--auto", action="store_true",
        help="Run dry-run first; if QC passes with 0 errors, auto-commit. "
             "If any errors exist, stop and require manual review.")

    parser.add_argument("--url", type=str, default=None,
        help="Process a specific PDF URL instead of discovering from the website.")
    parser.add_argument("--operator", type=str, default="automated",
        help="Name of the operator (for audit log).")

    args = parser.parse_args()

    if args.dry_run:
        run(dry_run=True, specific_url=args.url, operator=args.operator)

    elif args.commit:
        print("⚠️  WARNING: This will write data to the PRODUCTION database.")
        confirm = input("Type 'CONFIRM' to proceed: ")
        if confirm != "CONFIRM":
            print("Aborted.")
            sys.exit(0)
        run(dry_run=False, specific_url=args.url, operator=args.operator)

    elif args.auto:
        # Auto mode: dry-run → if clean → commit
        from pipeline.runner import run as _run, _init_clients, _get_og_source_id
        from pipeline.stages_01_07 import stage_01_discovery
        from pipeline.manifest import ImportManifest
        from pipeline.config import MAX_ISSUES_PER_RUN, OG_SOURCE_CODE

        supabase, gemini_client = _init_clients()
        og_source_id = _get_og_source_id(supabase)
        dummy = ImportManifest(pdf_url="discovery")
        issues = stage_01_discovery(supabase, dummy)[:MAX_ISSUES_PER_RUN]

        for item in issues:
            print(f"\n[Auto] Dry-running: {item['filename']}")
            from pipeline.runner import run_pipeline_for_issue
            m = run_pipeline_for_issue(item, supabase, gemini_client, og_source_id, dry_run=True)
            m.print_report()
            if m.qc_passed:
                print(f"[Auto] QC passed — committing {item['filename']} to production...")
                run_pipeline_for_issue(item, supabase, gemini_client, og_source_id, dry_run=False)
            else:
                print(f"[Auto] QC FAILED for {item['filename']} — skipping commit. Review manifest.")


if __name__ == "__main__":
    main()
