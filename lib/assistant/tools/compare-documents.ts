import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function compareDocuments(docId1: string, text1: string, docId2: string, text2: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `
    You are an expert Legal Analyst. Compare the following two legal documents.
    
    Document 1 (ID: ${docId1}):
    ${text1}

    Document 2 (ID: ${docId2}):
    ${text2}

    Task:
    1. Provide a brief summary of the main differences.
    2. List specific articles or sections that were modified, added, or removed.
    3. Explain the legal implication of these changes if apparent.
    4. Format the output clearly using Markdown.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Comparison Error:", error);
    throw error;
  }
}
