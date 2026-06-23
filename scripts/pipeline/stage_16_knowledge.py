"""
Stage 16 — Knowledge Layer
==========================
Generates higher-level intelligence objects (Legal Events, Knowledge Cards,
Thematic Collections, Semantic Links, AI Narratives, Knowledge Scores, and
Knowledge Graph Nodes/Edges) from raw facts.
This stage never modifies the original extracted data.
"""

import os
import json
from datetime import datetime
from google import genai
from google.genai import types

from .config import AI_MODEL_VERSION
from .manifest import ImportManifest

class KnowledgeLayerError(Exception):
    """Raised when Knowledge Layer processing fails."""

def stage_16_knowledge_layer(
    item: dict,
    supabase,
    gemini_client,
    manifest: ImportManifest,
    dry_run: bool = True
) -> dict:
    """
    Execute Stage 16: Knowledge Layer generation.
    Returns the updated item context.
    """
    print("[Stage 16] Starting Knowledge Layer generation...")
    data = item.get("extracted", {})
    id_map = item.get("id_map", {})
    issue_db_id = item.get("issue_db_id")
    
    issue_info = data.get("issue", {})
    issue_number = issue_info.get("issue_number", "unknown")
    issue_date = issue_info.get("published_date")

    # Keep track of generated objects for manifest serialization
    generated_events = []
    generated_cards = []
    generated_collections = []
    generated_scores = []
    generated_nodes = []
    generated_edges = []

    # ──────────────────────────────────────────────────────────────────────────
    # 1. GENERATE LEGAL EVENTS
    # ──────────────────────────────────────────────────────────────────────────
    print("[Stage 16] Extracting Legal & Career Events...")
    
    # Map document types to event types
    doc_type_events = {
        "law": {"default": "law_created", "amends": "law_amended", "repeals": "law_repealed"},
        "decree": {"default": "decree_issued"},
        "regulation": {"default": "regulation_created"},
        "decision": {"default": "decision_issued"},
    }

    # Extract Document-based events
    for doc in data.get("documents", []):
        local_id = doc.get("local_id")
        doc_type = doc.get("type", "")
        title = doc.get("title_ar", "")
        published_date = doc.get("published_date", issue_date)
        
        db_doc_id = id_map.get(local_id, {}).get("id") if not dry_run else None
        
        # Check relations for amendments or repeals
        rel_type = "default"
        for rel in data.get("relations", []):
            if rel.get("source_local_id") == local_id:
                if rel.get("relation_type") == "amends":
                    rel_type = "amends"
                    break
                elif rel.get("relation_type") == "repeals":
                    rel_type = "repeals"
                    break

        event_mapping = doc_type_events.get(doc_type, {"default": f"{doc_type}_issued"})
        event_type = event_mapping.get(rel_type, event_mapping["default"])
        category = "legal"
        
        # Check for specific governmental categories
        text_lower = (doc.get("original_text", "") + " " + title).lower()
        if any(w in text_lower for w in ["ميزانية", "المالية", "ميزانيات"]):
            event_type = "budget_approved"
            category = "governmental"
        elif any(w in text_lower for w in ["اتفاق", "معاهدة", "بروتوكول"]):
            event_type = "treaty_signed"
            category = "governmental"
        elif any(w in text_lower for w in ["انتخاب", "الانتخابية"]):
            event_type = "election_law_changed"
            category = "governmental"

        event_obj = {
            "event_type": event_type,
            "category": category,
            "title_ar": title[:200],
            "description_ar": doc.get("ai_summary_ar", ""),
            "event_date": published_date,
            "document_id": db_doc_id,
            "issue_id": issue_db_id if not dry_run else None,
            "ai_generated": True,
            "confidence": doc.get("confidence_score", 1.0),
            "knowledge_version": "1.0.0"
        }
        generated_events.append(event_obj)

    # Extract Career events (Appointments / Dismissals / Transfers)
    for appt in data.get("appointments", []):
        per_local = appt.get("person_local_id")
        inst_local = appt.get("institution_local_id")
        doc_local = appt.get("document_local_id")
        
        db_per_id = id_map.get(per_local, {}).get("id") if not dry_run else None
        db_inst_id = id_map.get(inst_local, {}).get("id") if not dry_run else None
        db_doc_id = id_map.get(doc_local, {}).get("id") if not dry_run else None

        person_name = ""
        for p in data.get("persons", []):
            if p.get("local_id") == per_local:
                person_name = p.get("full_name_ar", "")
                break
                
        inst_name = ""
        for inst in data.get("institutions", []):
            if inst.get("local_id") == inst_local:
                inst_name = inst.get("official_name_ar", "")
                break

        appt_type = appt.get("appointment_type", "appointment")
        action_verb = "تعيين" if appt_type == "appointment" else "إنهاء مهام" if appt_type == "dismissal" else "نقل"
        title_ar = f"{action_verb} {person_name}"
        if inst_name:
            title_ar += f" في {inst_name}"

        event_obj = {
            "event_type": appt_type,
            "category": "career",
            "title_ar": title_ar[:200],
            "description_ar": f"بموجب الوثيقة الرسمية الصادرة بتاريخ {appt.get('appointment_date', issue_date)}",
            "event_date": appt.get("appointment_date", issue_date),
            "document_id": db_doc_id,
            "person_id": db_per_id,
            "institution_id": db_inst_id,
            "issue_id": issue_db_id if not dry_run else None,
            "ai_generated": True,
            "confidence": appt.get("confidence", 1.0),
            "knowledge_version": "1.0.0"
        }
        generated_events.append(event_obj)

    # Insert events into DB if production
    if not dry_run and generated_events:
        print(f"[Stage 16] Committing {len(generated_events)} events to database...")
        supabase.table("legal_events").insert(generated_events).execute()

    manifest.events = generated_events

    # ──────────────────────────────────────────────────────────────────────────
    # 2. GENERATE KNOWLEDGE CARDS & AI NARRATIVES
    # ──────────────────────────────────────────────────────────────────────────
    print("[Stage 16] Generating Knowledge Cards & Narratives via AI...")
    
    # We can compile issue summary statistics
    issue_doc_types = {}
    for doc in data.get("documents", []):
        t = doc.get("type", "other")
        issue_doc_types[t] = issue_doc_types.get(t, 0) + 1
        
    stats_str = ", ".join([f"{k}: {v}" for k, v in issue_doc_types.items()])
    issue_summary_desc = (
        f"يحتوي هذا العدد رقم {issue_number} من الجريدة الرسمية على ما مجموعه "
        f"{len(data.get('documents', []))} وثيقة تشريعية وتوجيهية مصنفة كالتالي: {stats_str}."
    )

    card_obj = {
        "entity_type": "issue",
        "entity_id": issue_db_id if not dry_run else "__issue_id__",
        "card_type": "issue_overview",
        "title_ar": f"نظرة عامة على الجريدة الرسمية رقم {issue_number}",
        "content_ar": issue_summary_desc,
        "stats_json": {"doc_counts": issue_doc_types, "total_docs": len(data.get("documents", []))},
        "ai_model_version": AI_MODEL_VERSION,
        "knowledge_version": "1.0.0"
    }
    generated_cards.append(card_obj)

    if not dry_run and issue_db_id:
        try:
            supabase.table("knowledge_cards").insert(card_obj).execute()
        except Exception as e:
            print(f"[Stage 16] Warning inserting issue card: {e}")

    # AI Narratives: Generate a narrative for the issue using Gemini
    narrative_text = "سرد افتراضي للعدد التشريعي في التشغيل التجريبي."
    if not dry_run and issue_db_id:
        try:
            gemini_prompt = (
                f"أنت خبير قانوني موريتاني. اكتب قراءة تحليلية مفصلة باللغة العربية للجريدة الرسمية رقم {issue_number} "
                f"الصادرة بتاريخ {issue_date}. تفاصيل القوانين المستخرجة: {json.dumps(data.get('documents', []), ensure_ascii=False)}. "
                f"لخص أهم القرارات والقوانين والتعيينات الواردة فيه بأسلوب صحفي وقانوني رصين."
            )
            response = gemini_client.models.generate_content(
                model=AI_MODEL_VERSION,
                contents=[gemini_prompt],
                config=types.GenerateContentConfig(temperature=0.2)
            )
            narrative_text = response.text.strip()
            
            narrative_obj = {
                "entity_type": "issue",
                "entity_id": issue_db_id,
                "narrative_type": "issue_overview",
                "narrative_ar": narrative_text,
                "ai_model_version": AI_MODEL_VERSION,
                "knowledge_version": "1.0.0"
            }
            supabase.table("ai_narratives").insert(narrative_obj).execute()
            generated_cards.append({**narrative_obj, "is_narrative": True})
            print("[Stage 16] Generated and stored AI issue narrative.")
        except Exception as e:
            print(f"[Stage 16] Warning generating AI narrative: {e}")
    else:
        generated_cards.append({
            "entity_type": "issue",
            "entity_id": "__issue_id__",
            "narrative_type": "issue_overview",
            "narrative_ar": narrative_text,
            "ai_model_version": AI_MODEL_VERSION,
            "knowledge_version": "1.0.0",
            "is_narrative": True
        })

    manifest.cards = generated_cards

    # ──────────────────────────────────────────────────────────────────────────
    # 3. AUTO-CURATE THEMATIC COLLECTIONS
    # ──────────────────────────────────────────────────────────────────────────
    print("[Stage 16] Auto-curating Thematic Collections...")
    
    # Retrieve collections from DB (or use hardcoded codes in dry-run)
    collections = []
    if not dry_run:
        try:
            collections_res = supabase.table("document_collections").select("*").execute()
            collections = collections_res.data or []
        except Exception as e:
            print(f"[Stage 16] Warning fetching collections: {e}")
    else:
        # Mock collections for dry-run
        collections = [
            {"id": "c1", "code": "budget_laws", "title_ar": "قوانين المالية والميزانية", "filter_json": {"keywords": ["ميزانية", "المالية", "ميزانيات"]}},
            {"id": "c2", "code": "mining_laws", "title_ar": "قوانين الطاقة والمعادن", "filter_json": {"keywords": ["معادن", "نفط", "رخصة"]}},
            {"id": "c3", "code": "appointments", "title_ar": "التعيينات والقرارات الفردية", "filter_json": {"type": "appointment"}}
        ]

    for doc in data.get("documents", []):
        local_id = doc.get("local_id")
        db_doc_id = id_map.get(local_id, {}).get("id") if not dry_run else local_id
        
        doc_type = doc.get("type", "")
        doc_text = (doc.get("original_text", "") + " " + doc.get("title_ar", "")).lower()
        doc_keywords = [k.lower() for k in doc.get("keywords", [])]
        
        # Retrieve topics mapped to this document
        doc_topics = []
        for topic_entry in data.get("topics", []):
            if topic_entry.get("entity_local_id") == local_id:
                doc_topics = [tc.lower() for tc in topic_entry.get("topic_codes", [])]
                break

        for col in collections:
            filters = col.get("filter_json") or {}
            match = False
            
            # Simple matching logic based on collection filter rules
            filter_type = filters.get("type")
            filter_topics = [t.lower() for t in filters.get("topic_codes", [])]
            filter_keywords = [k.lower() for k in filters.get("keywords", [])]
            
            # Check type
            if filter_type and doc_type == filter_type:
                # Check topics
                if filter_topics and any(t in doc_topics for t in filter_topics):
                    match = True
                # Check keywords
                elif filter_keywords and any(k in doc_text or k in doc_keywords for k in filter_keywords):
                    match = True
                # If type-only matches
                elif not filter_topics and not filter_keywords:
                    match = True
            elif not filter_type:
                # Check topics
                if filter_topics and any(t in doc_topics for t in filter_topics):
                    match = True
                # Check keywords
                elif filter_keywords and any(k in doc_text or k in doc_keywords for k in filter_keywords):
                    match = True

            if match:
                col_link = {
                    "collection_id": col["id"],
                    "collection_code": col.get("code"),
                    "collection_title": col.get("title_ar"),
                    "document_id": db_doc_id,
                    "relevance_score": doc.get("confidence_score", 1.0)
                }
                generated_collections.append(col_link)
                
                if not dry_run and db_doc_id:
                    try:
                        # Insert connection
                        supabase.table("collection_documents").insert({
                            "collection_id": col["id"],
                            "document_id": db_doc_id,
                            "order_index": col.get("document_count", 0) + 1,
                            "relevance_score": doc.get("confidence_score", 1.0)
                        }).execute()
                        
                        # Increment document count in collection
                        supabase.table("document_collections").update({
                            "document_count": col.get("document_count", 0) + 1,
                            "updated_at": datetime.utcnow().isoformat()
                        }).eq("id", col["id"]).execute()
                    except Exception:
                        pass

    manifest.collections = generated_collections

    # ──────────────────────────────────────────────────────────────────────────
    # 4. KNOWLEDGE SCORES GENERATION
    # ──────────────────────────────────────────────────────────────────────────
    print("[Stage 16] Calculating Document Importance Scores...")
    
    for doc in data.get("documents", []):
        local_id = doc.get("local_id")
        db_doc_id = id_map.get(local_id, {}).get("id") if not dry_run else local_id
        
        # Compute metrics based on input data (since DB reads are empty in dry run, we use the local extraction context)
        citation_count = 0
        for cit in data.get("citations", []):
            if cit.get("target_doc_local_id") == local_id:
                citation_count += 1
        citation_score = min(100.0, citation_count * 15.0)

        amend_count = 0
        for rel in data.get("relations", []):
            if rel.get("target_local_id") == local_id and rel.get("relation_type") == "amends":
                amend_count += 1
        amendment_score = min(100.0, amend_count * 25.0)

        ref_count = 0
        for cit in data.get("citations", []):
            if cit.get("source_doc_local_id") == local_id:
                ref_count += 1
        reference_score = min(100.0, ref_count * 5.0)

        person_mentions = 0
        for appt in data.get("appointments", []):
            if appt.get("document_local_id") == local_id:
                person_mentions += 1
        entity_score = min(100.0, person_mentions * 10.0)

        # Composite weighted score (0 - 100)
        total_score = (
            (citation_score * 0.40) +
            (amendment_score * 0.35) +
            (reference_score * 0.15) +
            (entity_score * 0.10)
        )

        score_data = {
            "document_id": db_doc_id,
            "document_title": doc.get("title_ar")[:100],
            "citation_score": citation_score,
            "amendment_score": amendment_score,
            "reference_score": reference_score,
            "entity_score": entity_score,
            "total_score": total_score,
            "percentile_rank": 50.0,
            "knowledge_version": "1.0.0",
            "last_computed_at": datetime.utcnow().isoformat()
        }
        generated_scores.append(score_data)
        
        if not dry_run and db_doc_id:
            try:
                supabase.table("knowledge_scores").upsert({
                    "document_id": db_doc_id,
                    "citation_score": citation_score,
                    "amendment_score": amendment_score,
                    "reference_score": reference_score,
                    "entity_score": entity_score,
                    "total_score": total_score,
                    "percentile_rank": 50.0,
                    "knowledge_version": "1.0.0",
                    "last_computed_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print(f"[Stage 16] Warning upserting score: {e}")

    manifest.scores = generated_scores

    # ──────────────────────────────────────────────────────────────────────────
    # 5. KNOWLEDGE GRAPH BUILDER (Nodes and Edges)
    # ──────────────────────────────────────────────────────────────────────────
    print("[Stage 16] Building Knowledge Graph Nodes and Edges...")
    
    # 5.1 Issue Node
    generated_nodes.append({
        "id": issue_db_id if not dry_run else "__issue_id__",
        "node_type": "Issue",
        "label": f"الجريدة الرسمية عدد {issue_number}",
        "properties": {"issue_number": issue_number, "published_date": issue_date}
    })

    # 5.2 Documents Nodes
    for doc in data.get("documents", []):
        local_id = doc.get("local_id")
        db_id = id_map.get(local_id, {}).get("id") if not dry_run else local_id
        generated_nodes.append({
            "id": db_id,
            "node_type": "Document",
            "label": doc.get("title_ar")[:100],
            "properties": {
                "type": doc.get("type"),
                "official_number": doc.get("official_number"),
                "published_date": doc.get("published_date")
            }
        })

    # 5.3 Persons Nodes
    for per in data.get("persons", []):
        local_id = per.get("local_id")
        db_id = id_map.get(local_id, {}).get("id") if not dry_run else local_id
        generated_nodes.append({
            "id": db_id,
            "node_type": "Person",
            "label": per.get("full_name_ar"),
            "properties": {
                "normalized_name": per.get("normalized_name"),
                "gender": per.get("gender"),
                "current_position": per.get("current_position")
            }
        })

    # 5.4 Institutions Nodes
    for inst in data.get("institutions", []):
        local_id = inst.get("local_id")
        db_id = id_map.get(local_id, {}).get("id") if not dry_run else local_id
        generated_nodes.append({
            "id": db_id,
            "node_type": "Institution",
            "label": inst.get("official_name_ar"),
            "properties": {
                "type": inst.get("type"),
                "status": inst.get("status")
            }
        })

    # Nodes mapping for Edges creation in dry-run
    node_uuids = {node["id"]: node["id"] for node in generated_nodes}

    # Helper edge creator
    def register_edge(src_id, tgt_id, rel_type, properties):
        edge = {
            "source_node": src_id,
            "target_node": tgt_id,
            "relationship_type": rel_type,
            "properties": properties
        }
        generated_edges.append(edge)

    # Edge: Issue -> Document (CONTAINS)
    issue_node_uuid = issue_db_id if not dry_run else "__issue_id__"
    for doc in data.get("documents", []):
        doc_local_id = doc.get("local_id")
        doc_db_id = id_map.get(doc_local_id, {}).get("id") if not dry_run else doc_local_id
        register_edge(issue_node_uuid, doc_db_id, "CONTAINS", {})

    # Edge: Document -> Document (AMENDS, REPEALS, etc.)
    for rel in data.get("relations", []):
        src_db_id = id_map.get(rel.get("source_local_id"), {}).get("id") if not dry_run else rel.get("source_local_id")
        tgt_db_id = id_map.get(rel.get("target_local_id"), {}).get("id") if not dry_run else rel.get("target_local_id")
        
        if src_db_id and tgt_db_id:
            rel_type = rel.get("relation_type", "refers_to").upper()
            register_edge(src_db_id, tgt_db_id, rel_type, {
                "detected_sentence": rel.get("detected_sentence"),
                "explanation": rel.get("ai_explanation")
            })

    # Edge: Document -> Person (APPOINTS)
    # Edge: Person -> Institution (APPOINTED_TO)
    for appt in data.get("appointments", []):
        per_db_id = id_map.get(appt.get("person_local_id"), {}).get("id") if not dry_run else appt.get("person_local_id")
        inst_db_id = id_map.get(appt.get("institution_local_id"), {}).get("id") if not dry_run else appt.get("institution_local_id")
        doc_db_id = id_map.get(appt.get("document_local_id"), {}).get("id") if not dry_run else appt.get("document_local_id")

        if doc_db_id and per_db_id:
            register_edge(doc_db_id, per_db_id, "APPOINTS", {
                "position": appt.get("position_title_ar"),
                "date": appt.get("appointment_date")
            })
        
        if per_db_id and inst_db_id:
            register_edge(per_db_id, inst_db_id, "APPOINTED_TO", {
                "position": appt.get("position_title_ar"),
                "date": appt.get("appointment_date"),
                "document_id": str(doc_db_id) if doc_db_id else None
            })

    # Commit graph elements to DB if production
    if not dry_run:
        # Function to helper upsert node
        def get_or_create_kg_node_db(source_uuid, node_type, label, properties):
            try:
                # Try to get existing node
                existing = supabase.table("kg_nodes").select("id")\
                    .eq("source_id", source_uuid).eq("node_type", node_type).execute()
                if existing.data:
                    node_uuid = existing.data[0]["id"]
                    supabase.table("kg_nodes").update({"properties": properties, "label": label})\
                        .eq("id", node_uuid).execute()
                else:
                    res = supabase.table("kg_nodes").insert({
                        "source_id": source_uuid,
                        "node_type": node_type,
                        "label": label,
                        "properties": properties
                    }).execute()
                    node_uuid = res.data[0]["id"]
                return node_uuid
            except Exception as e:
                print(f"[Stage 16] Warning creating KG Node in DB: {e}")
                return None

        # Build Node mapping database IDs
        db_node_id_map = {}
        for node in generated_nodes:
            if node["id"] == "__issue_id__":
                node["id"] = issue_db_id
            db_node_uuid = get_or_create_kg_node_db(
                source_uuid=node["id"],
                node_type=node["node_type"],
                label=node["label"],
                properties=node["properties"]
            )
            if db_node_uuid:
                db_node_id_map[node["id"]] = db_node_uuid

        # Insert Edges in DB
        for edge in generated_edges:
            # Map staging IDs to actual kg_nodes UUIDs
            src_node_uuid = db_node_id_map.get(edge["source_node"])
            tgt_node_uuid = db_node_id_map.get(edge["target_node"])
            if src_node_uuid and tgt_node_uuid:
                try:
                    supabase.table("kg_edges").insert({
                        "source_node": src_node_uuid,
                        "target_node": tgt_node_uuid,
                        "relationship_type": edge["relationship_type"],
                        "properties": edge["properties"]
                    }).execute()
                except Exception:
                    pass

    manifest.graph_nodes = generated_nodes
    manifest.graph_edges = generated_edges

    print("[Stage 16] Knowledge Layer generation completed successfully ✅")
    manifest.mark_stage_done("16_knowledge_layer")
    return item
