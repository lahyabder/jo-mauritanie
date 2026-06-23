// lib/processing/entity-resolution.ts
// Resolves extracted entities against the database to prevent duplicates and manage aliases

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { ExtractedPerson, ExtractedInstitution, ExtractedEvent } from './ner-engine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// The similarity threshold for automatic merging (pg_trgm similarity)
const SIMILARITY_THRESHOLD = 0.85;

export async function resolvePerson(
  supabase: SupabaseClient<Database>,
  person: ExtractedPerson
): Promise<string> {
  // 1. Check exact match in aliases or persons
  const { data: exactMatches } = await supabase
    .from('persons')
    .select('id')
    .eq('full_name_ar', person.fullNameAr)
    .limit(1);

  if (exactMatches && exactMatches.length > 0) {
    return exactMatches[0].id;
  }

  const { data: aliasMatches } = await supabase
    .from('aliases')
    .select('person_id')
    .eq('alias_text', person.fullNameAr)
    .not('person_id', 'is', null)
    .limit(1);

  if (aliasMatches && aliasMatches.length > 0 && aliasMatches[0].person_id) {
    return aliasMatches[0].person_id;
  }

  // 2. Check fuzzy match using pg_trgm (we use an RPC call or fallback to ilike if RPC not setup)
  // For production with massive datasets, use an RPC. For simplicity here, we'll try a basic ilike or just create new if no exact match, 
  // then let humans merge. To strictly meet the "merge intelligently" requirement, we will use a Postgres RPC.
  
  const { data: fuzzyMatches, error: fuzzyError } = await supabase.rpc('match_person_fuzzy', {
    p_name: person.fullNameAr,
    p_threshold: SIMILARITY_THRESHOLD
  });

  if (!fuzzyError && fuzzyMatches && fuzzyMatches.length > 0) {
    const matchedId = fuzzyMatches[0].id;
    // Auto-create an alias for future exact matches
    await supabase.from('aliases').insert({
      person_id: matchedId,
      alias_text: person.fullNameAr,
      language: 'ar',
      alias_type: 'auto_resolved_variant'
    });
    return matchedId;
  }

  // 3. No match found, create new person
  const { data: newPerson, error: insertError } = await supabase
    .from('persons')
    .insert({
      full_name_ar: person.fullNameAr,
      full_name_fr: person.fullNameFr,
      current_role: 'other',
      current_role_title_ar: person.roleContext
    })
    .select('id')
    .single();

  if (insertError || !newPerson) {
    throw new Error(`Failed to create person: ${insertError?.message}`);
  }

  return newPerson.id;
}

export async function resolveInstitution(
  supabase: SupabaseClient<Database>,
  institution: ExtractedInstitution
): Promise<string> {
  const { data: exact } = await supabase
    .from('institutions')
    .select('id')
    .eq('name_ar', institution.nameAr)
    .limit(1);

  if (exact && exact.length > 0) return exact[0].id;

  const { data: fuzzy, error } = await supabase.rpc('match_institution_fuzzy', {
    p_name: institution.nameAr,
    p_threshold: SIMILARITY_THRESHOLD
  });

  if (!error && fuzzy && fuzzy.length > 0) {
    return fuzzy[0].id;
  }

  // Map NER type to DB Enum
  const categoryMap: Record<string, any> = {
    'ministry': 'ministry',
    'authority': 'public_agency',
    'company': 'public_enterprise',
    'committee': 'other',
    'other': 'other'
  };

  const { data: newInst, error: insErr } = await supabase
    .from('institutions')
    .insert({
      name_ar: institution.nameAr,
      name_fr: institution.nameFr,
      category: categoryMap[institution.type] || 'other'
    })
    .select('id')
    .single();

  if (insErr || !newInst) throw new Error(`Failed to create institution: ${insErr?.message}`);

  return newInst.id;
}

export async function resolveDocument(
  supabase: SupabaseClient<Database>,
  referenceText: string,
  docNumber?: string
): Promise<string | null> {
  // Try exact match on official_number first if we have a clean number
  if (docNumber) {
    const { data: exact } = await supabase
      .from('documents')
      .select('id')
      .eq('official_number', docNumber)
      .limit(1);

    if (exact && exact.length > 0) return exact[0].id;

    // Try a LIKE query for partial match (e.g. "2010-022" matches "Loi N° 2010-022")
    const { data: partial } = await supabase
      .from('documents')
      .select('id')
      .ilike('official_number', `%${docNumber}%`)
      .limit(1);

    if (partial && partial.length > 0) return partial[0].id;
  }

  // If no number or number failed, try trigram fuzzy match on the full reference text
  // against the official_number
  const { data: fuzzy } = await supabase
    .from('documents')
    .select('id')
    // We use a raw text search or pg_trgm similarity here.
    // Assuming official_number has trigram index, we can do:
    .filter('official_number', 'ilike', `%${referenceText}%`)
    .limit(1);

  if (fuzzy && fuzzy.length > 0) return fuzzy[0].id;

  return null;
}
