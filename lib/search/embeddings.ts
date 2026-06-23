// lib/search/embeddings.ts
// Generates vector embeddings for semantic search using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Returning zeroed embedding.");
    return Array(768).fill(0);
  }

  try {
    // text-embedding-004 supports 768 dimensions and works well for multlingual semantics
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw error;
  }
}
