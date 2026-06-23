"""
Import Manifest
===============
Tracks every object extracted from one Official Gazette issue.
In dry-run mode, nothing is written — only the manifest is produced.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ManifestWarning:
    stage: str
    code: str
    message: str
    severity: str  # 'warning' | 'critical'


@dataclass
class ImportManifest:
    # ── Issue identity ────────────────────────────────────────────
    pdf_url: str
    pdf_checksum: str = ""
    issue_number: str = ""
    published_date: str = ""
    total_pages: int = 0

    # ── Pipeline metadata ─────────────────────────────────────────
    pipeline_version: str = ""
    extraction_version: str = ""
    ai_model_version: str = ""
    prompt_version: str = ""
    operator: str = "automated"
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: str = ""
    dry_run: bool = True

    # ── Extraction counts ─────────────────────────────────────────
    documents_found: int = 0
    articles_found: int = 0
    persons_found: int = 0
    institutions_found: int = 0
    appointments_found: int = 0
    relations_found: int = 0
    citations_found: int = 0
    topics_assigned: int = 0

    # ── Knowledge Layer Lists (for staging & review) ──────────────
    events: list = field(default_factory=list)
    cards: list = field(default_factory=list)
    collections: list = field(default_factory=list)
    graph_nodes: list = field(default_factory=list)
    graph_edges: list = field(default_factory=list)
    scores: list = field(default_factory=list)
    raw_extracted: dict = field(default_factory=dict)

    # ── Deduplication ─────────────────────────────────────────────
    documents_skipped_duplicate: int = 0
    persons_merged: int = 0
    institutions_merged: int = 0

    # ── Quality Control ───────────────────────────────────────────
    warnings: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    qc_passed: bool = False

    # ── Stage status ──────────────────────────────────────────────
    stages_completed: list = field(default_factory=list)
    stages_failed: list = field(default_factory=list)

    def add_warning(self, stage: str, code: str, message: str):
        self.warnings.append({"stage": stage, "code": code, "message": message, "severity": "warning"})

    def add_error(self, stage: str, code: str, message: str):
        self.errors.append({"stage": stage, "code": code, "message": message, "severity": "critical"})

    def mark_stage_done(self, stage: str):
        self.stages_completed.append(stage)

    def mark_stage_failed(self, stage: str, reason: str):
        self.stages_failed.append({"stage": stage, "reason": reason})

    def finalize(self):
        self.completed_at = datetime.utcnow().isoformat()
        self.qc_passed = len(self.errors) == 0

    def to_dict(self) -> dict:
        return {
            "issue": {
                "pdf_url": self.pdf_url,
                "pdf_checksum": self.pdf_checksum,
                "issue_number": self.issue_number,
                "published_date": self.published_date,
                "total_pages": self.total_pages,
            },
            "pipeline": {
                "pipeline_version": self.pipeline_version,
                "extraction_version": self.extraction_version,
                "ai_model_version": self.ai_model_version,
                "prompt_version": self.prompt_version,
                "operator": self.operator,
                "dry_run": self.dry_run,
                "started_at": self.started_at,
                "completed_at": self.completed_at,
            },
            "extraction": {
                "documents": self.documents_found,
                "articles": self.articles_found,
                "persons": self.persons_found,
                "institutions": self.institutions_found,
                "appointments": self.appointments_found,
                "relations": self.relations_found,
                "citations": self.citations_found,
                "topics": self.topics_assigned,
            },
            "deduplication": {
                "documents_skipped": self.documents_skipped_duplicate,
                "persons_merged": self.persons_merged,
                "institutions_merged": self.institutions_merged,
            },
            "quality_control": {
                "passed": self.qc_passed,
                "errors": len(self.errors),
                "warnings": len(self.warnings),
                "error_details": self.errors,
                "warning_details": self.warnings,
            },
            "stages": {
                "completed": self.stages_completed,
                "failed": self.stages_failed,
            },
            "knowledge_layer": {
                "events": self.events,
                "cards": self.cards,
                "collections": self.collections,
                "graph_nodes": self.graph_nodes,
                "graph_edges": self.graph_edges,
                "scores": self.scores,
            },
            "raw_extracted": self.raw_extracted
        }

    def print_report(self):
        d = self.to_dict()
        mode = "🔵 DRY RUN" if self.dry_run else "🟢 PRODUCTION"
        qc = "✅ PASSED" if self.qc_passed else "❌ FAILED"

        print(f"\n{'='*60}")
        print(f"  IMPORT MANIFEST REPORT  {mode}")
        print(f"{'='*60}")
        print(f"  Issue:       {self.issue_number or 'unknown'}")
        print(f"  Date:        {self.published_date or 'unknown'}")
        print(f"  Checksum:    {self.pdf_checksum[:16]}..." if self.pdf_checksum else "  Checksum:    —")
        print(f"  Pages:       {self.total_pages}")
        print(f"\n  EXTRACTION RESULTS:")
        print(f"  {'Documents':25} {self.documents_found}")
        print(f"  {'Articles':25} {self.articles_found}")
        print(f"  {'Persons':25} {self.persons_found}")
        print(f"  {'Institutions':25} {self.institutions_found}")
        print(f"  {'Appointments':25} {self.appointments_found}")
        print(f"  {'Legal Relations':25} {self.relations_found}")
        print(f"  {'Citations':25} {self.citations_found}")
        print(f"  {'Topics Assigned':25} {self.topics_assigned}")
        print(f"\n  QUALITY CONTROL:     {qc}")
        if self.errors:
            print(f"\n  🔴 CRITICAL ERRORS ({len(self.errors)}):")
            for e in self.errors:
                print(f"     [{e['stage']}] {e['message']}")
        if self.warnings:
            print(f"\n  🟡 WARNINGS ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"     [{w['stage']}] {w['message']}")
        print(f"\n  Pipeline:    v{self.pipeline_version}")
        print(f"  AI Model:    {self.ai_model_version}")
        print(f"  Started:     {self.started_at}")
        print(f"  Completed:   {self.completed_at}")
        print(f"{'='*60}\n")

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
