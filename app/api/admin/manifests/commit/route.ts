import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import fs from 'fs';
import path from 'path';

const MANIFESTS_DIR = path.join(process.cwd(), 'manifests');

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { filename, manifest } = body;

    if (!manifest) {
      return NextResponse.json({ error: 'Missing manifest data' }, { status: 400 });
    }

    const extraction = manifest.extraction || {};
    const pipeline = manifest.pipeline || {};
    const issueData = manifest.issue || {};

    // Get the Official Gazette source ID from the DB
    const { data: sourceData, error: sourceError } = await supabase
      .from('legal_sources')
      .select('id')
      .eq('code', 'official_gazette')
      .maybeSingle();

    if (sourceError || !sourceData) {
      return NextResponse.json({ error: 'Official Gazette source not seeded in database. Please run schema seed SQL first.' }, { status: 500 });
    }
    const sourceId = sourceData.id;

    // Removed pdf_checksum uniqueness check to allow upsert and overwrites from admin review

    // ──────────────────────────────────────────────────────────────────────────
    // 1. INSERT ISSUE
    // ──────────────────────────────────────────────────────────────────────────
    const publishedDate = issueData.published_date || null;
    const year = publishedDate ? parseInt(publishedDate.split('-')[0], 10) : null;
    const month = publishedDate ? parseInt(publishedDate.split('-')[1], 10) : null;

    const { data: existingIssueByNum } = await supabase
      .from('issues')
      .select('id')
      .eq('issue_number', parseInt(issueData.issue_number, 10) || 0)
      .maybeSingle();

    if (existingIssueByNum) {
      await supabase.from('documents').delete().eq('issue_id', existingIssueByNum.id);
    }

    const { data: issueInsert, error: issueErr } = await supabase
      .from('issues')
      .upsert({
        issue_number: parseInt(issueData.issue_number, 10) || 0,
        source_id: sourceId,
        publication_date: publishedDate || new Date().toISOString().split('T')[0],
        pdf_url: issueData.pdf_url || '',
        pdf_checksum: issueData.pdf_checksum || '',
        pdf_page_count: issueData.total_pages || 0,
        is_published: true
      }, { onConflict: 'issue_number' })
      .select()
      .single();

    if (issueErr || !issueInsert) {
      return NextResponse.json({ error: `Issue insert failed: ${issueErr?.message}` }, { status: 500 });
    }
    const issueId = issueInsert.id;

    // Mapping: local_id -> { id, type }
    const idMap: { [key: string]: { id: string; type: string } } = {
      '__issue__': { id: issueId, type: 'issue' }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 2. INSERT INSTITUTIONS
    // ──────────────────────────────────────────────────────────────────────────
    const institutions = manifest.raw_extracted?.institutions || [];
    for (const inst of institutions) {
      const localId = inst.local_id;
      // Deduplicate by name_ar
      const { data: existingInst } = await supabase
        .from('institutions')
        .select('id')
        .eq('name_ar', inst.official_name_ar)
        .maybeSingle();

      if (existingInst) {
        idMap[localId] = { id: existingInst.id, type: 'institution' };
      } else {
        const validCategory = (inst.type === 'ministry' || inst.type === 'presidency' || inst.type === 'parliament' || inst.type === 'constitutional_council' || inst.type === 'supreme_court' || inst.type === 'public_agency' || inst.type === 'regional_authority' || inst.type === 'municipality' || inst.type === 'public_enterprise') ? inst.type : 'other';
        const { data: newInst, error: instErr } = await supabase
          .from('institutions')
          .insert({
            name_ar: inst.official_name_ar,
            name_fr: inst.official_name_fr || null,
            category: validCategory,
            is_active: inst.status !== 'inactive'
          })
          .select()
          .single();
        if (!instErr && newInst) {
          idMap[localId] = { id: newInst.id, type: 'institution' };
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INSERT PERSONS
    // ──────────────────────────────────────────────────────────────────────────
    const persons = manifest.raw_extracted?.persons || [];
    for (const person of persons) {
      const localId = person.local_id;
      // Deduplicate by full_name_ar
      const { data: existingPerson } = await supabase
        .from('persons')
        .select('id')
        .eq('full_name_ar', person.full_name_ar)
        .maybeSingle();

      if (existingPerson) {
        idMap[localId] = { id: existingPerson.id, type: 'person' };
      } else {
        const genderVal = (person.gender === 'male' || person.gender === 'M') ? 'M' : (person.gender === 'female' || person.gender === 'F') ? 'F' : null;
        const { data: newPerson, error: personErr } = await supabase
          .from('persons')
          .insert({
            full_name_ar: person.full_name_ar,
            full_name_fr: person.full_name_fr || null,
            gender: genderVal,
            current_role_title_ar: person.current_position || null,
            person_role: 'other',
            is_active: true
          })
          .select()
          .single();
        if (!personErr && newPerson) {
          idMap[localId] = { id: newPerson.id, type: 'person' };
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. INSERT DOCUMENTS
    // ──────────────────────────────────────────────────────────────────────────
    const documents = manifest.raw_extracted?.documents || [];
    for (const doc of documents) {
      const localId = doc.local_id;
      const docType = (doc.type === 'law' || doc.type === 'decree' || doc.type === 'decision' || doc.type === 'regulation' || doc.type === 'circular' || doc.type === 'announcement' || doc.type === 'notification' || doc.type === 'appointment') ? doc.type : 'other';
      const { data: newDoc, error: docErr } = await supabase
        .from('documents')
        .insert({
          issue_id: issueId,
          source_id: sourceId,
          type: docType,
          official_number: doc.official_number || null,
          title_ar: doc.title_ar,
          title_fr: doc.title_fr || null,
          pdf_page_start: doc.page_start || 0,
          pdf_page_end: doc.page_end || 0,
          document_date: doc.published_date || publishedDate || new Date().toISOString().split('T')[0],
          original_language: (doc.language === 'fr' || doc.language === 'en') ? doc.language : 'ar',
          content_ar: doc.language === 'ar' || !doc.language ? (doc.original_text || '') : null,
          content_fr: doc.language === 'fr' ? (doc.original_text || '') : null,
          ai_summary_ar: doc.ai_summary_ar || null,
          keywords: doc.keywords || [],
          status: 'published' // reviewers mark as published directly on commit
        })
        .select()
        .single();

      if (!docErr && newDoc) {
        idMap[localId] = { id: newDoc.id, type: 'document' };
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. INSERT ARTICLES
    // ──────────────────────────────────────────────────────────────────────────
    const articles = manifest.raw_extracted?.articles || [];
    for (const art of articles) {
      const docLocalId = art.document_local_id;
      const docDbId = idMap[docLocalId]?.id;
      if (!docDbId) continue;

      const { data: newArt, error: artErr } = await supabase
        .from('articles')
        .insert({
          document_id: docDbId,
          article_number: art.article_number,
          article_title: art.article_title || null,
          order_index: art.order_index || 0,
          page_number: art.page_number || 0,
          original_text: art.original_text,
          ai_summary: art.ai_summary || null,
          keywords: art.keywords || [],
          status: 'active'
        })
        .select()
        .single();

      if (!artErr && newArt) {
        idMap[art.local_id] = { id: newArt.id, type: 'article' };
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. INSERT APPOINTMENTS
    // ──────────────────────────────────────────────────────────────────────────
    const appointments = manifest.raw_extracted?.appointments || [];
    for (const appt of appointments) {
      const perId = idMap[appt.person_local_id]?.id;
      const instId = appt.institution_local_id ? idMap[appt.institution_local_id]?.id : null;
      const docId = idMap[appt.document_local_id]?.id;

      if (!perId) continue;

      await supabase.from('appointment_history').insert({
        person_id: perId,
        institution_id: instId,
        instrument_document_id: docId || null,
        instrument_issue_id: issueId,
        position_title_ar: appt.position_title_ar,
        position_title_fr: appt.position_title_fr || null,
        appointment_type: appt.appointment_type || 'appointment',
        appointment_date: appt.appointment_date || publishedDate,
        is_current: appt.is_current ?? true,
        confidence: appt.confidence || 1.0
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. INSERT LEGAL RELATIONS
    // ──────────────────────────────────────────────────────────────────────────
    const relations = manifest.raw_extracted?.relations || [];
    for (const rel of relations) {
      const srcId = idMap[rel.source_local_id]?.id;
      const tgtId = idMap[rel.target_local_id]?.id;
      const srcType = idMap[rel.source_local_id]?.type;
      const tgtType = idMap[rel.target_local_id]?.type;

      if (!srcId || !tgtId || !srcType || !tgtType) continue;

      await supabase.from('legal_relations').insert({
        source_type: srcType,
        source_id: srcId,
        target_type: tgtType,
        target_id: tgtId,
        relation_type: rel.relation_type,
        confidence: rel.confidence || 1.0,
        detected_sentence: rel.detected_sentence || null,
        ai_explanation: rel.ai_explanation || null
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. INSERT CITATIONS
    // ──────────────────────────────────────────────────────────────────────────
    const citations = manifest.raw_extracted?.citations || [];
    for (const cit of citations) {
      const srcDoc = idMap[cit.source_doc_local_id]?.id;
      const tgtDoc = idMap[cit.target_doc_local_id]?.id;
      const srcArt = cit.source_art_local_id ? idMap[cit.source_art_local_id]?.id : null;
      const tgtArt = cit.target_art_local_id ? idMap[cit.target_art_local_id]?.id : null;

      if (!srcDoc || !tgtDoc) continue;

      await supabase.from('legal_citations').insert({
        source_document_id: srcDoc,
        source_article_id: srcArt,
        target_document_id: tgtDoc,
        target_article_id: tgtArt,
        citation_type: cit.citation_type,
        citation_sentence: cit.citation_sentence || null,
        ai_explanation: cit.ai_explanation || null,
        confidence: cit.confidence || 1.0
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. INSERT TOPICS
    // ──────────────────────────────────────────────────────────────────────────
    const topics = manifest.raw_extracted?.topics || [];
    for (const topicEntry of topics) {
      const entId = idMap[topicEntry.entity_local_id]?.id;
      if (!entId) continue;

      for (const code of topicEntry.topic_codes || []) {
        const { data: topicRes } = await supabase
          .from('legal_topics')
          .select('id')
          .eq('code', code)
          .maybeSingle();

        if (topicRes) {
          await supabase.from('document_topics').insert({
            document_id: entId,
            topic_id: topicRes.id,
            confidence: topicEntry.confidence || 1.0
          });
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. INSERT KNOWLEDGE LAYER DATA (EVENTS & CARDS & COLLECTIONS & SCORES)
    // ──────────────────────────────────────────────────────────────────────────
    const kl = manifest.knowledge_layer || {};

    // Events
    const events = kl.events || [];
    for (const ev of events) {
      const docId = ev.document_id ? idMap[ev.document_id]?.id : null;
      const perId = ev.person_id ? idMap[ev.person_id]?.id : null;
      const instId = ev.institution_id ? idMap[ev.institution_id]?.id : null;

      await supabase.from('legal_events').insert({
        event_type: ev.event_type,
        category: ev.category,
        title_ar: ev.title_ar,
        description_ar: ev.description_ar || null,
        event_date: ev.event_date || publishedDate,
        document_id: docId || null,
        person_id: perId || null,
        institution_id: instId || null,
        issue_id: issueId,
        ai_generated: true,
        confidence: ev.confidence || 1.0,
        knowledge_version: '1.0.0'
      });
    }

    // Cards & Narratives
    const cards = kl.cards || [];
    for (const card of cards) {
      if (card.is_narrative) {
        await supabase.from('ai_narratives').insert({
          entity_type: card.entity_type,
          entity_id: card.entity_id === '__issue_id__' ? issueId : (idMap[card.entity_id]?.id || card.entity_id),
          narrative_type: card.narrative_type,
          narrative_ar: card.narrative_ar,
          ai_model_version: card.ai_model_version || 'gemini-2.5-pro',
          knowledge_version: '1.0.0'
        });
      } else {
        await supabase.from('knowledge_cards').insert({
          entity_type: card.entity_type,
          entity_id: card.entity_id === '__issue_id__' ? issueId : (idMap[card.entity_id]?.id || card.entity_id),
          card_type: card.card_type,
          title_ar: card.title_ar,
          content_ar: card.content_ar,
          stats_json: card.stats_json || {},
          ai_model_version: card.ai_model_version || 'gemini-2.5-pro',
          knowledge_version: '1.0.0'
        });
      }
    }

    // Collections
    const collections = kl.collections || [];
    for (const col of collections) {
      const docId = idMap[col.document_id]?.id;
      if (!docId) continue;

      const { data: colData } = await supabase
        .from('document_collections')
        .select('document_count')
        .eq('id', col.collection_id)
        .maybeSingle();

      const docCount = colData ? colData.document_count : 0;

      await supabase.from('collection_documents').insert({
        collection_id: col.collection_id,
        document_id: docId,
        order_index: docCount + 1,
        relevance_score: col.relevance_score || 1.0
      });

      await supabase
        .from('document_collections')
        .update({ document_count: docCount + 1, updated_at: new Date().toISOString() })
        .eq('id', col.collection_id);
    }

    // Scores
    const scores = kl.scores || [];
    for (const score of scores) {
      const docId = idMap[score.document_id]?.id;
      if (!docId) continue;

      await supabase.from('knowledge_scores').upsert({
        document_id: docId,
        citation_score: score.citation_score,
        amendment_score: score.amendment_score,
        reference_score: score.reference_score,
        entity_score: score.entity_score,
        total_score: score.total_score,
        percentile_rank: score.percentile_rank || 50.0,
        knowledge_version: '1.0.0',
        last_computed_at: new Date().toISOString()
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11. INSERT KNOWLEDGE GRAPH
    // ──────────────────────────────────────────────────────────────────────────
    const kgNodes = kl.graph_nodes || [];
    const kgEdges = kl.graph_edges || [];
    const kgNodeIdMap: { [key: string]: string } = {};

    // Nodes
    for (const node of kgNodes) {
      let originalId = node.id;
      if (originalId === '__issue_id__') {
        originalId = issueId;
      } else if (idMap[originalId]?.id) {
        originalId = idMap[originalId].id;
      }

      const { data: newNode, error: nodeErr } = await supabase
        .from('kg_nodes')
        .insert({
          source_id: originalId,
          node_type: node.node_type,
          label: node.label,
          properties: node.properties || {}
        })
        .select()
        .single();

      if (!nodeErr && newNode) {
        kgNodeIdMap[node.id] = newNode.id;
      } else {
        // Fallback to fetch existing node id
        const { data: existingNode } = await supabase
          .from('kg_nodes')
          .select('id')
          .eq('source_id', originalId)
          .eq('node_type', node.node_type)
          .maybeSingle();
        if (existingNode) {
          kgNodeIdMap[node.id] = existingNode.id;
        }
      }
    }

    // Edges
    for (const edge of kgEdges) {
      const srcNodeUuid = kgNodeIdMap[edge.source_node];
      const tgtNodeUuid = kgNodeIdMap[edge.target_node];

      if (srcNodeUuid && tgtNodeUuid) {
        await supabase.from('kg_edges').insert({
          source_node: srcNodeUuid,
          target_node: tgtNodeUuid,
          relationship_type: edge.relationship_type,
          properties: edge.properties || {}
        });
      }
    }

    // Mark sync_log as success
    await supabase
      .from('sync_logs')
      .insert({
        file_name: filename || 'manual_review_commit.pdf',
        pdf_url: issueData.pdf_url || '',
        status: 'success',
        issue_id: issueId,
        documents_extracted: extraction.documents || 0,
        ai_model_used: pipeline.ai_model_version || 'gemini-2.5-pro',
        extraction_version: pipeline.extraction_version || '1.0.0',
        completed_at: new Date().toISOString()
      });

    // Rename or delete the dry-run file locally to mark it committed,
    // or update its content dry_run = false
    if (filename) {
      const filePath = path.join(MANIFESTS_DIR, filename);
      if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const fileContent = JSON.parse(rawData);
        fileContent.pipeline = fileContent.pipeline || {};
        fileContent.pipeline.dry_run = false;
        fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf-8');
      }
    }

    return NextResponse.json({ success: true, message: 'Official Gazette committed to database successfully!', issueId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
