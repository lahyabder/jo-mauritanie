// lib/search/indexer.ts
// Pushes documents from Supabase to Typesense with vector embeddings

import { typesenseClient } from './typesense-client';
import { generateEmbedding } from './embeddings';

export interface IndexableDocument {
  id: string;
  official_number?: string;
  type: string;
  publication_date?: string; // YYYY-MM-DD
  title_ar: string;
  title_fr?: string;
  content_ar: string;
  institutions?: string[];
  persons?: string[];
  keywords?: string[];
  status: string;
}

export async function indexDocument(doc: IndexableDocument) {
  // 1. Prepare text for embedding (combine title, keywords, and summary/content chunk)
  // To avoid hitting token limits, we embed the title, metadata, and the first 1000 chars of content.
  const textToEmbed = `
    Type: ${doc.type}
    Title: ${doc.title_ar} ${doc.title_fr || ''}
    Number: ${doc.official_number || 'N/A'}
    Keywords: ${(doc.keywords || []).join(', ')}
    Content: ${doc.content_ar.substring(0, 1000)}
  `.trim();

  // 2. Generate Vector
  const embedding = await generateEmbedding(textToEmbed);

  // 3. Format Date to Unix timestamp for Typesense filtering
  let timestamp = 0;
  if (doc.publication_date) {
    timestamp = new Date(doc.publication_date).getTime() / 1000;
  }

  // 4. Push to Typesense
  const documentToIndex = {
    id: doc.id,
    official_number: doc.official_number || '',
    type: doc.type,
    publication_date: timestamp,
    title_ar: doc.title_ar,
    title_fr: doc.title_fr || '',
    content_ar: doc.content_ar,
    institutions: doc.institutions || [],
    persons: doc.persons || [],
    keywords: doc.keywords || [],
    status: doc.status,
    embedding: embedding
  };

  try {
    await typesenseClient.collections('documents').documents().upsert(documentToIndex);
    console.log(`Successfully indexed document ${doc.id} to Typesense`);
  } catch (error) {
    console.error(`Failed to index document ${doc.id} to Typesense:`, error);
  }
}
