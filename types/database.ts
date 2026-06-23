// ============================================================
// types/database.ts
// Auto-typed schema definitions matching the PostgreSQL schema.
// Update this file when migrations change.
// ============================================================

export type DocumentType =
  | 'law'
  | 'decree'
  | 'decision'
  | 'regulation'
  | 'circular'
  | 'announcement'
  | 'notification'
  | 'appointment'
  | 'other'

export type DocumentStatus =
  | 'draft'
  | 'published'
  | 'amended'
  | 'repealed'
  | 'suspended'
  | 'archived'

export type LanguageCode = 'ar' | 'fr' | 'en'

export type RelationType =
  | 'amends'
  | 'repeals'
  | 'implements'
  | 'supplements'
  | 'references'
  | 'supersedes'
  | 'consolidates'
  | 'suspends'

export type InstitutionCategory =
  | 'ministry'
  | 'presidency'
  | 'parliament'
  | 'constitutional_council'
  | 'supreme_court'
  | 'public_agency'
  | 'regional_authority'
  | 'municipality'
  | 'public_enterprise'
  | 'other'

export type PersonRole =
  | 'president'
  | 'prime_minister'
  | 'minister'
  | 'secretary_general'
  | 'director'
  | 'judge'
  | 'official'
  | 'ambassador'
  | 'governor'
  | 'other'

export type AppointmentType =
  | 'nomination'
  | 'promotion'
  | 'transfer'
  | 'dismissal'
  | 'retirement'
  | 'delegation'
  | 'other'

export type StatsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type UserRole = 'reader' | 'editor' | 'admin' | 'super_admin'

// ============================================================
// Table Row Types
// ============================================================

export interface Issue {
  id: string
  issue_number: number
  issue_number_display: string | null
  publication_date: string          // ISO date string
  reception_date: string | null
  title_ar: string | null
  title_fr: string | null
  title_en: string | null
  edition_note_ar: string | null
  edition_note_fr: string | null
  edition_note_en: string | null
  pdf_url: string | null
  pdf_storage_path: string | null
  pdf_page_count: number | null
  pdf_file_size_bytes: number | null
  pdf_checksum: string | null
  permanent_url: string             // Generated column
  is_published: boolean
  is_special_edition: boolean
  document_count: number
  law_count: number
  decree_count: number
  source_url: string | null
  scraped_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Institution {
  id: string
  code: string | null
  category: InstitutionCategory
  name_ar: string
  name_fr: string | null
  name_en: string | null
  short_name_ar: string | null
  short_name_fr: string | null
  short_name_en: string | null
  description_ar: string | null
  description_fr: string | null
  description_en: string | null
  parent_id: string | null
  level: number
  website_url: string | null
  logo_url: string | null
  founded_date: string | null
  dissolved_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Person {
  id: string
  national_id: string | null
  full_name_ar: string
  full_name_fr: string | null
  full_name_en: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  first_name_fr: string | null
  last_name_fr: string | null
  current_role: PersonRole
  current_role_title_ar: string | null
  current_role_title_fr: string | null
  current_institution_id: string | null
  birth_date: string | null
  birth_place_ar: string | null
  birth_place_fr: string | null
  nationality: string
  gender: 'M' | 'F' | null
  photo_url: string | null
  biography_ar: string | null
  biography_fr: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Document {
  id: string
  official_number: string | null
  issue_id: string
  type: DocumentType
  category_ar: string | null
  category_fr: string | null
  category_en: string | null
  institution_id: string | null
  document_date: string
  effective_date: string | null
  expiry_date: string | null
  signature_date: string | null
  original_language: LanguageCode
  title_ar: string | null
  title_fr: string | null
  title_en: string | null
  content_ar: string | null
  content_fr: string | null
  content_en: string | null
  summary_ar: string | null
  summary_fr: string | null
  summary_en: string | null
  ai_summary_ar: string | null
  ai_summary_fr: string | null
  ai_summary_en: string | null
  ai_keywords: string[] | null
  ai_entities: Record<string, unknown> | null
  ai_processed_at: string | null
  keywords: string[] | null
  tags: string[] | null
  pdf_page_start: number | null
  pdf_page_end: number | null
  pdf_url: string | null
  pdf_storage_path: string | null
  permanent_url: string | null
  status: DocumentStatus
  version: number
  is_current_version: boolean
  parent_id: string | null
  page_count: number | null
  word_count_ar: number | null
  word_count_fr: number | null
  is_confidential: boolean
  requires_gazette_ref: boolean
  source_url: string | null
  scraped_at: string | null
  raw_metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  published_at: string | null
  created_by: string | null
  updated_by: string | null
}

export interface Law {
  document_id: string
  law_number: string | null
  law_year: number | null
  law_domain_ar: string | null
  law_domain_fr: string | null
  law_domain_en: string | null
  constitutional_basis_ar: string | null
  constitutional_basis_fr: string | null
  parliament_session: string | null
  vote_date: string | null
  vote_result: string | null
  promulgation_date: string | null
  is_organic_law: boolean
  is_finance_law: boolean
  articles_count: number | null
  last_amendment_date: string | null
  amendment_count: number
}

export interface Decree {
  document_id: string
  decree_number: string | null
  decree_year: number | null
  decree_type_ar: string | null
  decree_type_fr: string | null
  signed_by_person_id: string | null
  signed_by_title_ar: string | null
  signed_by_title_fr: string | null
  countersigned_by: string[] | null
  articles_count: number | null
  is_regulatory: boolean
  is_executive: boolean
  implements_law_id: string | null
  implementation_deadline: string | null
}

export interface Decision {
  document_id: string
  decision_number: string | null
  decision_year: number | null
  decision_type_ar: string | null
  decision_type_fr: string | null
  issuing_authority_ar: string | null
  issuing_authority_fr: string | null
  signed_by_person_id: string | null
  is_individual: boolean
  beneficiary_name_ar: string | null
  beneficiary_name_fr: string | null
  beneficiary_person_id: string | null
  subject_ar: string | null
  subject_fr: string | null
}

export interface Regulation {
  document_id: string
  regulation_number: string | null
  regulation_year: number | null
  regulation_type_ar: string | null
  regulation_type_fr: string | null
  domain_ar: string | null
  domain_fr: string | null
  scope_ar: string | null
  scope_fr: string | null
  articles_count: number | null
  annexes_count: number
  is_temporary: boolean
  temporary_duration_months: number | null
}

export interface Circular {
  document_id: string
  circular_number: string | null
  circular_year: number | null
  addressed_to_ar: string[] | null
  addressed_to_fr: string[] | null
  subject_ar: string | null
  subject_fr: string | null
  related_law_id: string | null
  signed_by_person_id: string | null
  signed_by_title_ar: string | null
  signed_by_title_fr: string | null
}

export interface Announcement {
  document_id: string
  announcement_type_ar: string | null
  announcement_type_fr: string | null
  is_tender: boolean
  tender_reference: string | null
  tender_deadline: string | null
  tender_budget_mrm: number | null
  contact_info_ar: string | null
  contact_info_fr: string | null
  contact_email: string | null
  contact_phone: string | null
}

export interface Notification {
  document_id: string
  notification_type_ar: string | null
  notification_type_fr: string | null
  audience_ar: string | null
  audience_fr: string | null
  is_urgent: boolean
  priority_level: number
  response_deadline: string | null
  signed_by_person_id: string | null
}

export interface Appointment {
  id: string
  document_id: string
  person_id: string | null
  person_name_ar: string
  person_name_fr: string | null
  appointment_type: AppointmentType
  position_title_ar: string
  position_title_fr: string | null
  position_title_en: string | null
  position_grade_ar: string | null
  position_grade_fr: string | null
  institution_id: string | null
  institution_name_ar: string | null
  institution_name_fr: string | null
  department_ar: string | null
  department_fr: string | null
  location_ar: string | null
  location_fr: string | null
  wilaya_ar: string | null
  wilaya_fr: string | null
  appointment_date: string
  effective_date: string | null
  end_date: string | null
  previous_position_ar: string | null
  previous_position_fr: string | null
  previous_institution_id: string | null
  replacing_person_id: string | null
  replacing_name_ar: string | null
  salary_index: string | null
  salary_grade: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRelation {
  id: string
  source_id: string
  target_id: string
  relation_type: RelationType
  description_ar: string | null
  description_fr: string | null
  source_articles: string[] | null
  target_articles: string[] | null
  is_ai_inferred: boolean
  confidence: number | null
  created_at: string
  created_by: string | null
}

export interface LawRelation {
  id: string
  law_id: string
  related_law_id: string
  relation_type: RelationType
  law_articles: string[] | null
  related_articles: string[] | null
  notes_ar: string | null
  notes_fr: string | null
  created_at: string
  created_by: string | null
}

export interface DocumentVersion {
  id: string
  document_id: string
  version: number
  change_type: string
  change_summary_ar: string | null
  change_summary_fr: string | null
  snapshot: Record<string, unknown>
  triggered_by_document_id: string | null
  diff_ar: string | null
  diff_fr: string | null
  created_at: string
  created_by: string | null
}

export interface Alias {
  id: string
  person_id: string | null
  institution_id: string | null
  alias_text: string
  language: LanguageCode
  alias_type: string | null
  is_preferred: boolean
  created_at: string
}

export interface SearchIndexEntry {
  id: string
  entity_type: string
  entity_id: string
  display_title_ar: string | null
  display_title_fr: string | null
  display_snippet_ar: string | null
  display_snippet_fr: string | null
  document_type: DocumentType | null
  document_date: string | null
  issue_number: number | null
  institution_name_ar: string | null
  institution_name_fr: string | null
  status: DocumentStatus | null
  popularity_score: number
  relevance_boost: number
  indexed_at: string
  entity_updated_at: string | null
}

export interface Statistic {
  id: string
  stat_key: string
  period: StatsPeriod
  period_start: string
  period_end: string
  dimension_type: string | null
  dimension_value: string | null
  institution_id: string | null
  count: number
  total_pages: number
  total_words: number
  data: Record<string, unknown> | null
  computed_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  preferred_language: LanguageCode
  preferred_theme: 'light' | 'dark' | 'system'
  role: UserRole
  phone: string | null
  organization: string | null
  job_title: string | null
  search_count: number
  last_active_at: string | null
  email_notifications: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// Composite / Joined Types (for API responses)
// ============================================================

/** Document with denormalized institution and issue data */
export interface DocumentWithMeta extends Document {
  institution?: Pick<Institution, 'id' | 'name_ar' | 'name_fr' | 'short_name_ar' | 'short_name_fr' | 'logo_url'>
  issue?: Pick<Issue, 'id' | 'issue_number' | 'publication_date' | 'pdf_url'>
}

/** Appointment with joined person and institution */
export interface AppointmentWithRelations extends Appointment {
  person?: Pick<Person, 'id' | 'full_name_ar' | 'full_name_fr' | 'photo_url' | 'current_role'>
  institution?: Pick<Institution, 'id' | 'name_ar' | 'name_fr' | 'short_name_ar' | 'logo_url'>
  document?: Pick<Document, 'id' | 'official_number' | 'document_date'>
  issue?: Pick<Issue, 'issue_number' | 'publication_date'>
}

/** Person with their appointment history */
export interface PersonWithHistory extends Person {
  institution?: Pick<Institution, 'id' | 'name_ar' | 'name_fr' | 'logo_url'>
  appointments?: AppointmentWithRelations[]
}

/** Search result (from search_all function) */
export interface SearchResult {
  entity_type: string
  entity_id: string
  display_title: string | null
  display_snippet: string | null
  document_type: DocumentType | null
  document_date: string | null
  issue_number: number | null
  institution_name: string | null
  rank: number
}

// ============================================================
// Database type (for Supabase client typing)
// ============================================================
export type Database = {
  public: {
    Tables: {
      issues:               { Row: Issue;          Insert: Partial<Issue>;          Update: Partial<Issue> }
      documents:            { Row: Document;       Insert: Partial<Document>;       Update: Partial<Document> }
      laws:                 { Row: Law;            Insert: Partial<Law>;            Update: Partial<Law> }
      decrees:              { Row: Decree;         Insert: Partial<Decree>;         Update: Partial<Decree> }
      decisions:            { Row: Decision;       Insert: Partial<Decision>;       Update: Partial<Decision> }
      regulations:          { Row: Regulation;     Insert: Partial<Regulation>;     Update: Partial<Regulation> }
      circulars:            { Row: Circular;       Insert: Partial<Circular>;       Update: Partial<Circular> }
      announcements:        { Row: Announcement;   Insert: Partial<Announcement>;   Update: Partial<Announcement> }
      notifications:        { Row: Notification;   Insert: Partial<Notification>;   Update: Partial<Notification> }
      appointments:         { Row: Appointment;    Insert: Partial<Appointment>;    Update: Partial<Appointment> }
      persons:              { Row: Person;         Insert: Partial<Person>;         Update: Partial<Person> }
      institutions:         { Row: Institution;    Insert: Partial<Institution>;    Update: Partial<Institution> }
      aliases:              { Row: Alias;          Insert: Partial<Alias>;          Update: Partial<Alias> }
      document_relations:   { Row: DocumentRelation; Insert: Partial<DocumentRelation>; Update: Partial<DocumentRelation> }
      law_relations:        { Row: LawRelation;    Insert: Partial<LawRelation>;    Update: Partial<LawRelation> }
      document_versions:    { Row: DocumentVersion; Insert: Partial<DocumentVersion>; Update: Partial<DocumentVersion> }
      search_index:         { Row: SearchIndexEntry; Insert: Partial<SearchIndexEntry>; Update: Partial<SearchIndexEntry> }
      statistics:           { Row: Statistic;      Insert: Partial<Statistic>;      Update: Partial<Statistic> }
      profiles:             { Row: Profile;        Insert: Partial<Profile>;        Update: Partial<Profile> }
    }
    Views: {
      v_latest_issues:           { Row: Issue & { total_documents: number } }
      v_documents_with_institution: { Row: DocumentWithMeta }
      v_recent_appointments:     { Row: AppointmentWithRelations }
    }
    Functions: {
      search_all: {
        Args: {
          p_query: string
          p_language?: LanguageCode
          p_entity_types?: string[]
          p_document_type?: DocumentType
          p_status?: DocumentStatus
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: SearchResult[]
      }
      get_document_lineage: {
        Args: { p_document_id: string }
        Returns: Array<{
          id: string
          version: number
          status: DocumentStatus
          official_number: string
          document_date: string
          change_type: string
          change_summary_ar: string
        }>
      }
      get_person_appointment_history: {
        Args: { p_person_id: string }
        Returns: AppointmentWithRelations[]
      }
      is_admin:           { Args: Record<never, never>; Returns: boolean }
      is_editor_or_above: { Args: Record<never, never>; Returns: boolean }
    }
    Enums: {
      document_type:        DocumentType
      document_status:      DocumentStatus
      language_code:        LanguageCode
      relation_type:        RelationType
      institution_category: InstitutionCategory
      person_role:          PersonRole
      appointment_type:     AppointmentType
      stats_period:         StatsPeriod
    }
  }
}
