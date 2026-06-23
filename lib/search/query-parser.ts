// lib/search/query-parser.ts
// Uses Gemini to parse a Natural Language query and execute a Hybrid Vector/Keyword search on Typesense.

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { typesenseClient } from './typesense-client';
import { generateEmbedding } from './embeddings';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ParsedQuery {
  extractedKeywords: string;
  filters: string; // Typesense filter_by string (e.g. 'type:decree && publication_date:>=1672531200')
  isQuestion: boolean;
}

const QueryParserSchema = {
  type: SchemaType.OBJECT,
  properties: {
    extractedKeywords: {
      type: SchemaType.STRING,
      description: "The core search terms extracted from the query, translated to Arabic if necessary."
    },
    filters: {
      type: SchemaType.STRING,
      description: "A Typesense 'filter_by' string. Use fields: type, status, institutions, persons, publication_date (unix). Return empty string if no filters."
    },
    isQuestion: {
      type: SchemaType.BOOLEAN,
      description: "True if the user is asking a question (e.g., 'Who is the director?'). False if just a standard keyword search."
    }
  },
  required: ["extractedKeywords", "filters", "isQuestion"]
};

export async function executeSemanticSearch(userQuery: string) {
  // 1. Ask Gemini to parse the query into keywords and filters
  let parsed: ParsedQuery = { extractedKeywords: userQuery, filters: '', isQuestion: false };
  
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: QueryParserSchema,
          temperature: 0,
        }
      });
      const prompt = `
        Parse this search query for a Mauritanian Official Gazette search engine.
        Query: "${userQuery}"
      `;
      const result = await model.generateContent(prompt);
      parsed = JSON.parse(result.response.text());
    } catch (e) {
      console.error("AI Query Parsing failed, falling back to raw query", e);
    }
  }

  // 2. Generate vector embedding for the query
  const queryVector = await generateEmbedding(userQuery);

  // 3. Execute Typesense Multi-Search (Hybrid: Vector + Keyword)
  const searchParameters = {
    q: parsed.extractedKeywords,
    query_by: 'title_ar,content_ar,keywords,persons,institutions',
    filter_by: parsed.filters || undefined,
    vector_query: `embedding:([${queryVector.join(',')}], k:10)`, // Find top 10 closest vectors
    sort_by: '_text_match:desc', // Hybrid sort weighting
    page: 1,
    per_page: 10
  };

  try {
    const searchResults = await typesenseClient.collections('documents').documents().search(searchParameters);
    
    // 4. If it was a question, generate an AI answer based on the top results (RAG)
    let aiAnswer = null;
    if (parsed.isQuestion && searchResults.hits && searchResults.hits.length > 0 && process.env.GEMINI_API_KEY) {
      const contextDocs = searchResults.hits.slice(0, 3).map(h => {
        const doc: any = h.document;
        return `Title: ${doc.title_ar}\nNumber: ${doc.official_number}\nContent: ${doc.content_ar.substring(0, 500)}`;
      }).join("\n\n---\n\n");

      const answerModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const answerPrompt = `
        Based on the following official gazette documents, answer the user's question.
        If the answer is not in the context, say "لا توجد معلومات كافية في الأرشيف للإجابة على هذا السؤال."
        Keep the answer concise and cite the document number if possible.
        
        Question: ${userQuery}
        
        Documents:
        ${contextDocs}
      `;
      
      const answerResult = await answerModel.generateContent(answerPrompt);
      aiAnswer = answerResult.response.text();
    }

    return {
      results: searchResults.hits,
      total: searchResults.found,
      parsedQuery: parsed,
      aiAnswer
    };

  } catch (error) {
    console.error("Typesense search failed:", error);
    throw error;
  }
}
