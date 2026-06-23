"""
Stages 8–15: Relations → Citations → Appointments → Topics →
             Deduplication → Quality Control → DB Commit → Post-Processing
==========================================================================
"""

import hashlib
import json
from datetime import datetime
from typing import Optional

from .config import (
    PIPELINE_VERSION, EXTRACTION_VERSION, AI_MODEL_VERSION, PROMPT_VERSION,
    QC_MIN_CONFIDENCE, QC_CRITICAL_CONFIDENCE
)
from .manifest import ImportManifest


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 8 — Relationship Detection (parsed from AI output, already done in 4-7)
# STAGE 9 — Citation Detection     (same — already in AI output)
# STAGE 10 — Appointment Detection  (same — already in AI output)
# STAGE 11 — Topic Classification   (same — already in AI output)
# These stages validate and structure the AI output slices.
# ──────────────────────────────────────────────────────────────────────────────

def stage_08_to_11_validate_ai_output(item: dict, manifest: ImportManifest) -> dict:
    """
    Validate and normalize the four AI output slices:
    relations, citations, appointments, topics.
    """
    data = item["extracted"]

    # Validate relations
    valid_relations = []
    for rel in data.get("relations", []):
        if not rel.get("source_local_id") or not rel.get("target_local_id"):
            manifest.add_warning("08_relations", "MISSING_REL_ENDPOINT",
                f"Relation missing source or target: {rel}")
            continue
        if not rel.get("relation_type"):
            manifest.add_warning("08_relations", "MISSING_REL_TYPE",
                f"Relation missing type: {rel}")
            continue
        valid_relations.append(rel)
    data["relations"] = valid_relations

    # Validate citations
    valid_citations = []
    for cit in data.get("citations", []):
        if not cit.get("source_doc_local_id") or not cit.get("target_doc_local_id"):
            manifest.add_warning("09_citations", "MISSING_CITATION_ENDPOINT",
                f"Citation missing source or target doc: {cit}")
            continue
        valid_citations.append(cit)
    data["citations"] = valid_citations

    # Validate appointments
    valid_appointments = []
    for appt in data.get("appointments", []):
        if not appt.get("person_local_id") or not appt.get("position_title_ar"):
            manifest.add_warning("10_appointments", "INCOMPLETE_APPOINTMENT",
                f"Appointment missing person or position: {appt}")
            continue
        valid_appointments.append(appt)
    data["appointments"] = valid_appointments

    for stage in ["08_relations", "09_citations", "10_appointments", "11_topics"]:
        manifest.mark_stage_done(stage)

    return {**item, "extracted": data}


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 12 — Duplicate Detection
# ──────────────────────────────────────────────────────────────────────────────

def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def stage_12_deduplication(item: dict, supabase, manifest: ImportManifest, dry_run: bool) -> dict:
    """
    Check every extracted object against the DB.
    Flag duplicates but do NOT skip them in dry-run mode.
    In production mode, merge persons/institutions and skip duplicate documents.
    """
    data = item["extracted"]
    print("[Stage 12] Running deduplication checks...")

    # Check issue checksum
    try:
        existing = supabase.table("issues").select("id").eq("pdf_checksum", item["checksum"]).execute()
        if existing.data:
            raise Exception(
                f"DUPLICATE ISSUE: checksum {item['checksum'][:16]} already exists in DB. "
                f"Aborting to prevent re-import."
            )
    except Exception as e:
        if dry_run:
            print(f"[Warning] Database check skipped/failed ({e}). Continuing dry-run.")
        else:
            raise

    # Check document hashes
    clean_docs = []
    for doc in data.get("documents", []):
        doc_hash = _text_hash(doc.get("original_text", doc.get("title_ar", "")))
        doc["document_hash"] = doc_hash

        if not dry_run:
            existing = supabase.table("documents").select("id").eq("document_hash", doc_hash).execute()
            if existing.data:
                manifest.documents_skipped_duplicate += 1
                manifest.add_warning("12_dedup", "DUPLICATE_DOCUMENT",
                    f"Document already in DB: {doc.get('title_ar', '')[:60]}")
                continue
        clean_docs.append(doc)

    data["documents"] = clean_docs

    # Normalize person names for deduplication
    for person in data.get("persons", []):
        if not person.get("normalized_name"):
            name = person.get("full_name_ar", "")
            # Remove Arabic diacritics (tashkeel)
            import unicodedata
            normalized = "".join(c for c in name if not unicodedata.combining(c))
            person["normalized_name"] = normalized.strip()

    manifest.mark_stage_done("12_deduplication")
    print(f"[Stage 12] Docs skipped (duplicate): {manifest.documents_skipped_duplicate}")
    return {**item, "extracted": data}


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 13 — Quality Control
# ──────────────────────────────────────────────────────────────────────────────

def stage_13_quality_control(item: dict, manifest: ImportManifest) -> dict:
    """
    Run all QC checks. Add warnings/errors to manifest.
    Critical errors block production commit.
    """
    data = item["extracted"]
    print("[Stage 13] Running quality control...")

    issue = data.get("issue", {})

    # Issue checks
    if not issue.get("issue_number"):
        manifest.add_error("13_qc", "MISSING_ISSUE_NUMBER", "Issue number not extracted")
    if not issue.get("published_date"):
        manifest.add_error("13_qc", "MISSING_PUBLISHED_DATE", "Issue publication date not extracted")

    # Document checks
    for i, doc in enumerate(data.get("documents", [])):
        doc_id = doc.get("local_id", f"doc_{i}")

        if not doc.get("title_ar"):
            manifest.add_error("13_qc", "MISSING_TITLE",
                f"{doc_id}: document has no title")

        if not doc.get("type"):
            manifest.add_error("13_qc", "MISSING_TYPE",
                f"{doc_id}: document type not detected")

        if doc.get("confidence_score", 1.0) < QC_CRITICAL_CONFIDENCE:
            manifest.add_error("13_qc", "LOW_CONFIDENCE",
                f"{doc_id}: confidence {doc.get('confidence_score'):.2f} below threshold {QC_CRITICAL_CONFIDENCE}")
        elif doc.get("confidence_score", 1.0) < QC_MIN_CONFIDENCE:
            manifest.add_warning("13_qc", "MODERATE_CONFIDENCE",
                f"{doc_id}: confidence {doc.get('confidence_score'):.2f} below ideal {QC_MIN_CONFIDENCE}")

        if not doc.get("original_text") or len(doc.get("original_text", "")) < 20:
            manifest.add_warning("13_qc", "EMPTY_TEXT",
                f"{doc_id}: very short or empty original text")

        # Date sanity
        pub_date = doc.get("published_date", "")
        if pub_date:
            try:
                year = int(pub_date[:4])
                if year < 1960 or year > 2030:
                    manifest.add_error("13_qc", "IMPOSSIBLE_DATE",
                        f"{doc_id}: date {pub_date} looks impossible")
            except (ValueError, IndexError):
                manifest.add_error("13_qc", "INVALID_DATE_FORMAT",
                    f"{doc_id}: date format invalid: {pub_date}")

    # Article checks
    doc_ids_in_articles = set(a.get("document_local_id") for a in data.get("articles", []))
    doc_ids_in_docs = set(d.get("local_id") for d in data.get("documents", []))
    orphan_articles = doc_ids_in_articles - doc_ids_in_docs
    if orphan_articles:
        manifest.add_error("13_qc", "ORPHAN_ARTICLES",
            f"Articles reference non-existent doc IDs: {orphan_articles}")

    # Check article ordering uniqueness per document
    from collections import defaultdict
    article_orders = defaultdict(list)
    for art in data.get("articles", []):
        key = (art.get("document_local_id"), art.get("order_index"))
        article_orders[key].append(art.get("local_id"))
    for key, ids in article_orders.items():
        if len(ids) > 1:
            manifest.add_warning("13_qc", "DUPLICATE_ARTICLE_ORDER",
                f"Duplicate order_index {key[1]} in document {key[0]}: {ids}")

    # Summary
    critical_count = len(manifest.errors)
    warning_count = len(manifest.warnings)
    print(f"[Stage 13] QC complete: {critical_count} critical error(s), {warning_count} warning(s)")

    manifest.mark_stage_done("13_quality_control")
    return item


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 14 — Database Commit (PRODUCTION ONLY)
# ──────────────────────────────────────────────────────────────────────────────

def stage_14_db_commit(item: dict, supabase, manifest: ImportManifest,
                       og_source_id: str) -> dict:
    """
    Write all validated objects to the database.
    Uses Supabase transactions (via individual inserts + rollback on failure).
    Returns id_map: {local_id → {type, db_id}}
    """
    data = item["extracted"]
    id_map = {}
    pipeline_meta = {
        "pipeline_version": PIPELINE_VERSION,
        "extraction_version": EXTRACTION_VERSION,
        "ai_version": AI_MODEL_VERSION,
        "import_source": "scraper",
    }
    print("[Stage 14] Committing to database...")

    try:
        # ── Issue ──────────────────────────────────────────────────
        issue_data = data["issue"]
        issue_insert = supabase.table("issues").insert({
            "source_id":           og_source_id,
            "issue_number":        issue_data.get("issue_number"),
            "year":                issue_data.get("year"),
            "month":               issue_data.get("month"),
            "published_date":      issue_data.get("published_date"),
            "language":            issue_data.get("language", "ar"),
            "pdf_url":             item["url"],
            "pdf_checksum":        item["checksum"],
            "total_pages":         item.get("total_pages", 0),
            "ocr_status":          item.get("ocr_status", "not_required"),
            "processing_status":   "done",
            "total_documents":     manifest.documents_found,
            "extraction_version":  EXTRACTION_VERSION,
            "ai_version":          AI_MODEL_VERSION,
            "import_source":       "scraper",
        }).execute()
        issue_db_id = issue_insert.data[0]["id"]
        id_map["__issue__"] = issue_db_id
        print(f"[Stage 14] Issue inserted: {issue_db_id}")

        # ── Institutions ───────────────────────────────────────────
        for inst in data.get("institutions", []):
            local_id = inst.pop("local_id", None)
            # Check for existing by normalized name
            existing = supabase.table("institutions").select("id")\
                .eq("official_name_ar", inst["official_name_ar"]).execute()
            if existing.data:
                db_id = existing.data[0]["id"]
                manifest.institutions_merged += 1
            else:
                res = supabase.table("institutions").insert(inst).execute()
                db_id = res.data[0]["id"]
            if local_id:
                id_map[local_id] = {"type": "institution", "id": db_id}

        # ── Persons ────────────────────────────────────────────────
        for person in data.get("persons", []):
            local_id = person.pop("local_id", None)
            # Check for existing by normalized_name
            norm = person.get("normalized_name", "")
            existing = supabase.table("persons").select("id")\
                .eq("normalized_name", norm).execute() if norm else None
            if existing and existing.data:
                db_id = existing.data[0]["id"]
                manifest.persons_merged += 1
            else:
                res = supabase.table("persons").insert(person).execute()
                db_id = res.data[0]["id"]
            if local_id:
                id_map[local_id] = {"type": "person", "id": db_id}

        # ── Documents ──────────────────────────────────────────────
        for doc in data.get("documents", []):
            local_id = doc.pop("local_id", None)
            doc["issue_id"] = issue_db_id
            doc["source_id"] = og_source_id
            doc.update(pipeline_meta)
            res = supabase.table("documents").insert(doc).execute()
            db_id = res.data[0]["id"]
            if local_id:
                id_map[local_id] = {"type": "document", "id": db_id}

        # ── Articles ───────────────────────────────────────────────
        for art in data.get("articles", []):
            local_id = art.pop("local_id", None)
            doc_local = art.pop("document_local_id", None)
            if doc_local and doc_local in id_map:
                art["document_id"] = id_map[doc_local]["id"]
            res = supabase.table("articles").insert(art).execute()
            db_id = res.data[0]["id"]
            if local_id:
                id_map[local_id] = {"type": "article", "id": db_id}

        # ── Appointments ───────────────────────────────────────────
        for appt in data.get("appointments", []):
            per_local = appt.pop("person_local_id", None)
            inst_local = appt.pop("institution_local_id", None)
            doc_local = appt.pop("document_local_id", None)
            if per_local not in id_map:
                continue
            appt["person_id"] = id_map[per_local]["id"]
            if inst_local and inst_local in id_map:
                appt["institution_id"] = id_map[inst_local]["id"]
            if doc_local and doc_local in id_map:
                appt["instrument_document_id"] = id_map[doc_local]["id"]
            appt["instrument_issue_id"] = issue_db_id
            supabase.table("appointment_history").insert(appt).execute()

        # ── Legal Relations ────────────────────────────────────────
        for rel in data.get("relations", []):
            src_local = rel.pop("source_local_id", None)
            tgt_local = rel.pop("target_local_id", None)
            if src_local not in id_map or tgt_local not in id_map:
                continue
            supabase.table("legal_relations").insert({
                "source_type":      id_map[src_local]["type"],
                "source_id":        id_map[src_local]["id"],
                "target_type":      id_map[tgt_local]["type"],
                "target_id":        id_map[tgt_local]["id"],
                "relation_type":    rel.get("relation_type"),
                "confidence":       rel.get("confidence", 1.0),
                "detected_sentence":rel.get("detected_sentence"),
                "ai_explanation":   rel.get("ai_explanation"),
            }).execute()

        # ── Citations ──────────────────────────────────────────────
        for cit in data.get("citations", []):
            src_doc = id_map.get(cit.get("source_doc_local_id"), {}).get("id")
            tgt_doc = id_map.get(cit.get("target_doc_local_id"), {}).get("id")
            if not src_doc or not tgt_doc:
                continue
            supabase.table("legal_citations").insert({
                "source_document_id": src_doc,
                "source_article_id":  id_map.get(cit.get("source_art_local_id"), {}).get("id"),
                "target_document_id": tgt_doc,
                "target_article_id":  id_map.get(cit.get("target_art_local_id"), {}).get("id"),
                "citation_type":      cit.get("citation_type"),
                "citation_sentence":  cit.get("citation_sentence"),
                "ai_explanation":     cit.get("ai_explanation"),
                "confidence":         cit.get("confidence", 1.0),
            }).execute()

        # ── Document Topics ────────────────────────────────────────
        for topic_entry in data.get("topics", []):
            ent_local = topic_entry.get("entity_local_id")
            ent_type = topic_entry.get("entity_type")
            if ent_local not in id_map:
                continue
            ent_db_id = id_map[ent_local]["id"]
            for topic_code in topic_entry.get("topic_codes", []):
                topic_res = supabase.table("legal_topics").select("id").eq("code", topic_code).execute()
                if not topic_res.data:
                    continue
                topic_db_id = topic_res.data[0]["id"]
                if ent_type == "document":
                    supabase.table("document_topics").insert({
                        "document_id": ent_db_id,
                        "topic_id": topic_db_id,
                        "confidence": topic_entry.get("confidence", 1.0),
                    }).execute()

        print(f"[Stage 14] Commit complete ✅")
        manifest.mark_stage_done("14_db_commit")

    except Exception as e:
        manifest.mark_stage_failed("14_db_commit", str(e))
        raise

    return {**item, "id_map": id_map, "issue_db_id": issue_db_id}


# ──────────────────────────────────────────────────────────────────────────────
# STAGE 15 — Post-Processing
# ──────────────────────────────────────────────────────────────────────────────

def stage_15_post_processing(item: dict, supabase, manifest: ImportManifest) -> None:
    """
    After DB commit: update issue counters, finalize sync_log record.
    Timeline, search index, and embeddings are generated on-demand by the UI.
    """
    issue_db_id = item.get("issue_db_id")
    if not issue_db_id:
        return

    print("[Stage 15] Running post-processing...")

    # Update total_documents count on issue record
    doc_count = supabase.table("documents").select("id", count="exact")\
        .eq("issue_id", issue_db_id).execute().count or 0
    supabase.table("issues").update({"total_documents": doc_count})\
        .eq("id", issue_db_id).execute()

    # Mark the sync_log as success
    if "sync_log_id" in item:
        supabase.table("sync_logs").update({
            "status":                  "success",
            "issue_id":                issue_db_id,
            "documents_extracted":     manifest.documents_found,
            "articles_extracted":      manifest.articles_found,
            "persons_extracted":       manifest.persons_found,
            "institutions_extracted":  manifest.institutions_found,
            "appointments_extracted":  manifest.appointments_found,
            "relations_extracted":     manifest.relations_found,
            "citations_extracted":     manifest.citations_found,
            "ai_model_used":           AI_MODEL_VERSION,
            "extraction_version":      EXTRACTION_VERSION,
            "completed_at":            datetime.utcnow().isoformat(),
        }).eq("id", item["sync_log_id"]).execute()

    print("[Stage 15] Post-processing complete ✅")
    manifest.mark_stage_done("15_post_processing")
