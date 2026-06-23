"""
Pipeline Configuration & Version Registry
==========================================
All version strings and constants live here.
Changing a version triggers re-extraction on next run.
"""

PIPELINE_VERSION   = "3.0.0"
EXTRACTION_VERSION = "3.0.0"
AI_MODEL_VERSION   = "gemini-2.5-pro"
PROMPT_VERSION     = "3.0.0"

DOCUMENT_TYPES = [
    "law", "decree", "regulation", "decision",
    "circular", "notification", "announcement", "appointment"
]

RELATION_TYPES = [
    "amends", "repeals", "replaces", "complements", "implements",
    "creates", "cancels", "refers_to", "related_to",
    "appoints", "dismisses", "transfers", "decorates",
    "assigns", "revokes", "suspends", "renews", "extends"
]

CITATION_TYPES = [
    "amends", "repeals", "replaces", "complements",
    "implements", "refers_to", "suspends", "renews",
    "extends", "cancels", "revokes", "related_to"
]

APPOINTMENT_TYPES = [
    "appointment", "dismissal", "transfer",
    "delegation", "decoration", "suspension", "renewal"
]

# Quality control thresholds
QC_MIN_CONFIDENCE       = 0.6   # Below this → warning
QC_CRITICAL_CONFIDENCE  = 0.4   # Below this → block
QC_MIN_OCR_CONFIDENCE   = 0.75  # For OCR'd pages

# Processing limits per run (prevent GitHub Actions timeout)
MAX_ISSUES_PER_RUN = 3

# Official Gazette source
OG_SOURCE_CODE = "official_gazette"
OG_TARGET_URL  = "https://msgg.gov.mr/ar/ar-droit-mauritanien/le-journal-officiel-ar.html"
