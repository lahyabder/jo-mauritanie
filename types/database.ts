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
  source_id: string | null
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
  source_id: string | null
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

export interface LegalSource {
  id: string
  code: string
  name_ar: string
  name_fr: string | null
  is_active: boolean
  created_at: string
}

export interface Article {
  id: string
  document_id: string
  article_number: string
  article_title: string | null
  order_index: number
  page_number: number | null
  original_text: string | null
  ai_summary: string | null
  keywords: string[] | null
  status: string
  created_at: string
  updated_at: string
}

export interface AppointmentHistory {
  id: string
  person_id: string
  institution_id: string | null
  instrument_document_id: string | null
  instrument_issue_id: string | null
  position_title_ar: string
  position_title_fr: string | null
  appointment_type: string | null
  appointment_date: string | null
  is_current: boolean
  confidence: number
  created_at: string
}

export interface LegalRelation {
  id: string
  source_type: string
  source_id: string
  target_type: string
  target_id: string
  relation_type: string
  confidence: number
  detected_sentence: string | null
  ai_explanation: string | null
  created_at: string
}

export interface LegalCitation {
  id: string
  source_document_id: string
  source_article_id: string | null
  target_document_id: string
  target_article_id: string | null
  citation_type: string | null
  citation_sentence: string | null
  ai_explanation: string | null
  confidence: number
  created_at: string
}

export interface LegalTopic {
  id: string
  code: string
  name_ar: string
  name_fr: string | null
  created_at: string
}

export interface DocumentTopic {
  document_id: string
  topic_id: string
  confidence: number
}

export interface SyncLog {
  id: string
  source_id: string | null
  file_name: string | null
  pdf_url: string | null
  status: string
  issue_id: string | null
  trigger_type: string
  triggered_by: string | null
  issues_found: number
  new_issues_downloaded: number
  site_reachable: boolean
  layout_changed: boolean
  documents_extracted: number
  articles_extracted: number
  persons_extracted: number
  institutions_extracted: number
  appointments_extracted: number
  relations_extracted: number
  citations_extracted: number
  ai_model_used: string | null
  extraction_version: string | null
  error_message: string | null
  error_details: Record<string, unknown> | null
  started_at: string
  completed_at: string | null
}

export interface UploadJob {
  id: string
  issue_id: string | null
  original_filename: string
  pdf_storage_path: string
  pdf_public_url: string | null
  pdf_file_size_bytes: number | null
  pdf_page_count: number | null
  pdf_checksum: string | null
  status: 'pending' | 'extracting_text' | 'running_ocr' | 'detecting_structure' | 'classifying' | 'review' | 'publishing' | 'completed' | 'failed'
  progress_percent: number
  current_step_label: string | null
  total_pages_processed: number
  documents_extracted: number
  documents_approved: number
  documents_published: number
  documents_rejected: number
  required_ocr: boolean
  ocr_language: string
  avg_text_confidence: number | null
  detected_issue_number: number | null
  detected_pub_date: string | null
  issue_confirmed: boolean
  error_message: string | null
  error_details: Record<string, unknown> | null
  retry_count: number
  upload_completed_at: string | null
  processing_started_at: string | null
  processing_ended_at: string | null
  uploaded_by: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface UploadJobLog {
  id: string
  job_id: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface ExtractedDocument {
  id: string
  job_id: string
  document_id: string | null
  sequence_in_issue: number
  pdf_page_start: number | null
  pdf_page_end: number | null
  detected_type: DocumentType | null
  confirmed_type: DocumentType | null
  classification_confidence: number | null
  classification_model: string | null
  classification_reasons: Record<string, unknown> | null
  detected_official_number: string | null
  confirmed_official_number: string | null
  detected_date: string | null
  confirmed_date: string | null
  detected_institution_name_ar: string | null
  detected_institution_name_fr: string | null
  confirmed_institution_id: string | null
  detected_title_ar: string | null
  detected_title_fr: string | null
  confirmed_title_ar: string | null
  confirmed_title_fr: string | null
  raw_text_ar: string | null
  raw_text_fr: string | null
  raw_text_mixed: string | null
  cleaned_text_ar: string | null
  cleaned_text_fr: string | null
  ocr_used: boolean
  ocr_confidence: number | null
  ocr_word_count: number | null
  low_confidence_regions: Record<string, unknown> | null
  has_articles: boolean
  articles_count: number | null
  has_preamble: boolean
  has_signatures: boolean
  detected_signatories: string[] | null
  detected_keywords: string[] | null
  ai_summary_ar: string | null
  ai_summary_fr: string | null
  ai_keywords: string[] | null
  review_status: 'pending_review' | 'approved' | 'rejected' | 'published' | 'needs_correction'
  reviewer_notes: string | null
  corrections: Record<string, unknown> | null
  reviewed_at: string | null
  reviewed_by: string | null
  published_at: string | null
  extraction_quality_score: number | null
  raw_metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface LegalEvent {
  id: string
  event_type: string
  category: string
  title_ar: string
  title_fr: string | null
  description_ar: string | null
  description_fr: string | null
  event_date: string | null
  event_date_end: string | null
  document_id: string | null
  article_id: string | null
  person_id: string | null
  institution_id: string | null
  issue_id: string | null
  ai_generated: boolean
  confidence: number
  knowledge_version: string | null
  created_at: string
}

export interface KnowledgeCard {
  id: string
  entity_type: string
  entity_id: string
  card_type: string
  title_ar: string
  title_fr: string | null
  content_ar: string
  content_fr: string | null
  stats_json: Record<string, unknown> | null
  ai_model_version: string | null
  knowledge_version: string | null
  created_at: string
  updated_at: string
}

export interface DocumentCollection {
  id: string
  code: string | null
  title_ar: string
  title_fr: string | null
  description_ar: string | null
  description_fr: string | null
  collection_type: string
  filter_json: Record<string, unknown> | null
  document_count: number
  color: string | null
  icon: string | null
  is_auto: boolean
  is_featured: boolean
  knowledge_version: string | null
  created_at: string
  updated_at: string
}

export interface CollectionDocument {
  collection_id: string
  document_id: string
  order_index: number
  relevance_score: number
}

export interface SemanticLink {
  id: string
  source_type: string
  source_id: string
  target_type: string
  target_id: string
  similarity_score: number
  link_type: string | null
  explanation_ar: string | null
  knowledge_version: string | null
  created_at: string
}

export interface AiNarrative {
  id: string
  entity_type: string
  entity_id: string
  narrative_type: string
  narrative_ar: string
  narrative_fr: string | null
  period_start: string | null
  period_end: string | null
  ai_model_version: string | null
  knowledge_version: string | null
  created_at: string
  updated_at: string
}

export interface KnowledgeScore {
  document_id: string
  citation_score: number
  amendment_score: number
  reference_score: number
  entity_score: number
  total_score: number
  percentile_rank: number | null
  knowledge_version: string | null
  last_computed_at: string | null
}

export interface KgNode {
  id: string
  source_id: string
  node_type: string
  label: string
  properties: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface KgEdge {
  id: string
  source_node: string
  target_node: string
  relationship_type: string
  properties: Record<string, unknown>
  created_at: string
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
type FixRow<R> = R extends undefined ? undefined : { [K in keyof R]: R[K] };

type FixTable<T> = {
  Row: FixRow<T extends { Row: any } ? T['Row'] : undefined>
  Insert: FixRow<T extends { Insert: any } ? T['Insert'] : undefined>
  Update: FixRow<T extends { Update: any } ? T['Update'] : undefined>
  Relationships: T extends { Relationships: any } ? T['Relationships'] : []
};

type FixDatabase<DB extends { public: { Tables: any; Views: any; Functions: any; Enums: any } }> = {
  public: {
    Tables: {
      [TableName in keyof DB['public']['Tables']]: FixTable<DB['public']['Tables'][TableName]>
    }
    Views: {
      [ViewName in keyof DB['public']['Views']]: FixTable<DB['public']['Views'][ViewName]>
    }
    Functions: DB['public']['Functions']
    Enums: DB['public']['Enums']
  }
}

// ============================================================
// Database type (for Supabase client typing)
// ============================================================
type RawDatabase = {
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
      legal_sources:        { Row: LegalSource;    Insert: Partial<LegalSource>;    Update: Partial<LegalSource> }
      articles:             { Row: Article;        Insert: Partial<Article>;        Update: Partial<Article> }
      appointment_history:  { Row: AppointmentHistory; Insert: Partial<AppointmentHistory>; Update: Partial<AppointmentHistory> }
      legal_relations:      { Row: LegalRelation;  Insert: Partial<LegalRelation>;  Update: Partial<LegalRelation> }
      legal_citations:      { Row: LegalCitation;  Insert: Partial<LegalCitation>;  Update: Partial<LegalCitation> }
      legal_topics:         { Row: LegalTopic;     Insert: Partial<LegalTopic>;     Update: Partial<LegalTopic> }
      document_topics:      { Row: DocumentTopic;  Insert: Partial<DocumentTopic>;  Update: Partial<DocumentTopic> }
      sync_logs:            { Row: SyncLog;        Insert: Partial<SyncLog>;        Update: Partial<SyncLog> }
      upload_jobs:          { Row: UploadJob;      Insert: Partial<UploadJob>;      Update: Partial<UploadJob> }
      upload_job_logs:      { Row: UploadJobLog;   Insert: Partial<UploadJobLog>;   Update: Partial<UploadJobLog> }
      extracted_documents:  { Row: ExtractedDocument; Insert: Partial<ExtractedDocument>; Update: Partial<ExtractedDocument> }
      legal_events:         { Row: LegalEvent;     Insert: Partial<LegalEvent>;     Update: Partial<LegalEvent> }
      knowledge_cards:      { Row: KnowledgeCard;  Insert: Partial<KnowledgeCard>;  Update: Partial<KnowledgeCard> }
      document_collections: { Row: DocumentCollection; Insert: Partial<DocumentCollection>; Update: Partial<DocumentCollection> }
      collection_documents: { Row: CollectionDocument; Insert: Partial<CollectionDocument>; Update: Partial<CollectionDocument> }
      semantic_links:       { Row: SemanticLink;    Insert: Partial<SemanticLink>;    Update: Partial<SemanticLink> }
      ai_narratives:        { Row: AiNarrative;     Insert: Partial<AiNarrative>;     Update: Partial<AiNarrative> }
      knowledge_scores:     { Row: KnowledgeScore;  Insert: Partial<KnowledgeScore>;  Update: Partial<KnowledgeScore> }
      kg_nodes:             { Row: KgNode;          Insert: Partial<KgNode>;          Update: Partial<KgNode> }
      kg_edges:             { Row: KgEdge;          Insert: Partial<KgEdge>;          Update: Partial<KgEdge> }
    }
    Views: {
      v_latest_issues:           { Row: Issue & { total_documents: number } }
      v_documents_with_institution: { Row: DocumentWithMeta }
      v_recent_appointments:     { Row: AppointmentWithRelations }
      entities:                  { Row: { id: string; name_ar: string; name_fr: string | null; entity_type: 'person' | 'institution' } }
      document_entities:         { Row: { document_id: string; entity_id: string; entity_type: 'person' | 'institution'; role: string | null } }
      timeline_events:           { Row: { id: string; date: string; title: string; description: string | null; type: string; entity: string | null; reference_number: string | null; color: string } }
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
      match_person_fuzzy: {
        Args: {
          p_name: string
          p_threshold?: number
        }
        Returns: Array<{ id: string; full_name_ar: string; similarity: number }>
      }
      match_institution_fuzzy: {
        Args: {
          p_name: string
          p_threshold?: number
        }
        Returns: Array<{ id: string; name_ar: string; similarity: number }>
      }
      compute_extraction_quality_for_job: {
        Args: {
          p_job_id: string
        }
        Returns: unknown
      }
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

export type Database = FixDatabase<RawDatabase>;
