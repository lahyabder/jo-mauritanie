import { Client } from 'typesense';

// Provide defaults for local docker environment, override in production
const host = process.env.TYPESENSE_HOST || 'localhost';
const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);
const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
const apiKey = process.env.TYPESENSE_API_KEY || 'xyz'; // Match the docker-compose API key

export const typesenseClient = new Client({
  nodes: [
    {
      host,
      port,
      protocol,
    },
  ],
  apiKey,
  connectionTimeoutSeconds: 5,
});

/**
 * Collection Schema for Legal Documents
 * We use 768 dimensions because Google Gemini's text-embedding-004 model outputs 768 dimensions.
 */
export const DOCUMENTS_SCHEMA = {
  name: 'documents',
  fields: [
    { name: 'id', type: 'string' as const }, // Supabase Document UUID
    { name: 'official_number', type: 'string' as const, optional: true },
    { name: 'type', type: 'string' as const, facet: true },
    { name: 'publication_date', type: 'int64' as const, facet: true }, // Unix timestamp for filtering
    { name: 'title_ar', type: 'string' as const },
    { name: 'title_fr', type: 'string' as const, optional: true },
    { name: 'content_ar', type: 'string' as const },
    { name: 'institutions', type: 'string[]' as const, facet: true, optional: true },
    { name: 'persons', type: 'string[]' as const, facet: true, optional: true },
    { name: 'keywords', type: 'string[]' as const, facet: true, optional: true },
    { name: 'status', type: 'string' as const, facet: true },
    {
      name: 'embedding',
      type: 'float[]' as const,
      num_dim: 768, 
    },
  ],
};

/**
 * Initialize Typesense collections.
 * Should be called once during setup or deployment.
 */
export async function initializeTypesense() {
  try {
    const exists = await typesenseClient.collections('documents').retrieve();
    console.log("Documents collection already exists in Typesense");
  } catch (err: any) {
    if (err.httpStatus === 404) {
      console.log("Creating documents collection in Typesense...");
      await typesenseClient.collections().create(DOCUMENTS_SCHEMA);
      console.log("Collection created.");
    } else {
      console.error("Error initializing Typesense:", err);
    }
  }
}
