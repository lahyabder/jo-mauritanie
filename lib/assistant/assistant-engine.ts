import { GoogleGenerativeAI } from '@google/generative-ai';
import { LEGAL_ASSISTANT_PROMPT } from './system-prompt';
import { executeSemanticSearch } from '@/lib/search/query-parser';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function askLegalAssistant(query: string, chatHistory: any[] = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured.");
  }

  // 1. Retrieve Context from Typesense Search
  // We use our semantic search engine to fetch the most relevant documents
  const searchResults = await executeSemanticSearch(query);
  
  const results = searchResults.results || [];
  
  // 2. Format Context
  const contextText = results.map((hit: any) => {
    const doc = hit.document;
    return `[Document ID: ${doc.id}]\nSource System: Official Gazette\nOfficial Number: ${doc.official_number || 'N/A'}\nTitle: ${doc.title_ar}\nDate: ${new Date(doc.publication_date * 1000).toISOString().split('T')[0]}\nContent Summary/Excerpt: ${doc.content_ar.substring(0, 800)}`;
  }).join('\n\n---\n\n');

  // 3. Prepare AI Request
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro", // Pro model for complex reasoning and comparison
    systemInstruction: LEGAL_ASSISTANT_PROMPT
  });

  const prompt = `
    Context Documents:
    ${contextText}

    User Question:
    ${query}
  `;

  // 4. Generate Response
  try {
    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(prompt);
    
    return {
      answer: result.response.text(),
      sources: results.map((h: any) => ({
        id: h.document.id,
        title: h.document.title_ar,
        number: h.document.official_number
      }))
    };
  } catch (error) {
    console.error("Legal Assistant Error:", error);
    throw error;
  }
}
