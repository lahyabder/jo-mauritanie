// lib/processing/ai-classifier.ts
// Uses Gemini to classify and extract metadata from individual legal documents

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { DocumentType } from '@/types/database';

// Initialize Gemini
// Ensure process.env.GEMINI_API_KEY is set in production
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AIExtractionResult {
  type: DocumentType;
  officialNumber?: string;
  documentDate?: string; // YYYY-MM-DD
  titleAr?: string;
  titleFr?: string;
  institutionNameAr?: string;
  institutionNameFr?: string;
  signatories?: string[];
  summaryAr?: string;
  summaryFr?: string;
  keywords?: string[];
  confidenceScore: number; // 0-100
  reasoning: string;
}

const ExtractionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      description: "The type of the legal document. Must be one of: 'law', 'decree', 'decision', 'regulation', 'circular', 'announcement', 'notification', 'appointment', 'other'",
      enum: ['law', 'decree', 'decision', 'regulation', 'circular', 'announcement', 'notification', 'appointment', 'other']
    },
    officialNumber: {
      type: SchemaType.STRING,
      description: "The official number of the document (e.g. '2024-001', '045/MIN')",
      nullable: true
    },
    documentDate: {
      type: SchemaType.STRING,
      description: "The date the document was signed or issued, in YYYY-MM-DD format",
      nullable: true
    },
    titleAr: {
      type: SchemaType.STRING,
      description: "The title or subject of the document in Arabic",
      nullable: true
    },
    titleFr: {
      type: SchemaType.STRING,
      description: "The title or subject of the document in French",
      nullable: true
    },
    institutionNameAr: {
      type: SchemaType.STRING,
      description: "The name of the issuing institution or ministry in Arabic",
      nullable: true
    },
    institutionNameFr: {
      type: SchemaType.STRING,
      description: "The name of the issuing institution or ministry in French",
      nullable: true
    },
    signatories: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of names of people who signed the document",
      nullable: true
    },
    summaryAr: {
      type: SchemaType.STRING,
      description: "A brief summary of the document's content in Arabic (1-2 sentences)",
      nullable: true
    },
    summaryFr: {
      type: SchemaType.STRING,
      description: "A brief summary of the document's content in French (1-2 sentences)",
      nullable: true
    },
    keywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of relevant keywords or tags (in Arabic or French) for search indexing",
      nullable: true
    },
    confidenceScore: {
      type: SchemaType.INTEGER,
      description: "Your confidence in the accuracy of this extraction, from 0 to 100"
    },
    reasoning: {
      type: SchemaType.STRING,
      description: "A short explanation of how you determined the document type and metadata"
    }
  },
  required: ["type", "confidenceScore", "reasoning"]
};

export async function extractDocumentMetadata(text: string): Promise<AIExtractionResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Skipping AI classification.");
    return null;
  }

  try {
    // We use gemini-1.5-flash as it is fast and supports JSON schema
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ExtractionSchema as any,
        temperature: 0.1, // Low temperature for factual extraction
      }
    });

    const prompt = `
You are an expert legal data extraction assistant for the Mauritanian Official Gazette (Journal Officiel).
Analyze the following text, which is an extracted document from the gazette. It may contain Arabic, French, or both.
Please extract the required structured metadata accurately based on the provided JSON schema.
If a field is not present in the text, leave it null. Do not invent information.

Text to analyze:
----------------
${text}
----------------
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // The response is guaranteed to be valid JSON matching the schema
    const data = JSON.parse(responseText) as AIExtractionResult;
    
    // Ensure the type is cast properly to our internal Enum
    if (!['law', 'decree', 'decision', 'regulation', 'circular', 'announcement', 'notification', 'appointment', 'other'].includes(data.type)) {
      data.type = 'other';
    }

    return data;
  } catch (error) {
    console.error("Error during AI extraction:", error);
    return null;
  }
}
