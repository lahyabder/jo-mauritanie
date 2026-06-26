// lib/processing/legal-ner.ts
// AI Named Entity Recognition specifically for Legal Relationships

import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExtractedLegalRelation {
  relationType: 'amends' | 'repeals' | 'replaces' | 'supplements' | 'modifies' | 'implements' | 'creates' | 'abolishes' | 'extends';
  targetDocumentReferenceAr: string; // The text referring to the target doc (e.g., "Loi N° 2010-022" or "قانون رقم 2010-022")
  targetDocumentNumber?: string;     // Extracted number if clear
  sourceArticles?: string[];         // Which articles in the CURRENT document enact this relation
  targetArticles?: string[];         // Which articles in the TARGET document are affected
  descriptionAr?: string;            // Brief description of the relation/effect
}

const LegalRelationSchema: any = {
  type: SchemaType.OBJECT,
  properties: {
    relations: {
      type: SchemaType.ARRAY,
      description: "List of legal relationships between the current document and prior/other documents.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          relationType: { 
            type: SchemaType.STRING, 
            description: "The type of relationship. e.g. if this document cancels a previous one, it's 'repeals'.",
            enum: ['amends', 'repeals', 'replaces', 'supplements', 'modifies', 'implements', 'creates', 'abolishes', 'extends'] 
          },
          targetDocumentReferenceAr: { 
            type: SchemaType.STRING, 
            description: "The exact text reference to the target document in Arabic or French (e.g. 'قانون رقم 2010-022')" 
          },
          targetDocumentNumber: { 
            type: SchemaType.STRING, 
            description: "Just the number of the target document (e.g. '2010-022')",
            nullable: true
          },
          sourceArticles: { 
            type: SchemaType.ARRAY, 
            items: { type: SchemaType.STRING },
            description: "The article numbers in the CURRENT document that state this relation (e.g. ['Article 1', 'Article 2'])",
            nullable: true
          },
          targetArticles: { 
            type: SchemaType.ARRAY, 
            items: { type: SchemaType.STRING },
            description: "The article numbers in the TARGET document being affected (if specified)",
            nullable: true
          },
          descriptionAr: { 
            type: SchemaType.STRING, 
            description: "A short description of what is changing.",
            nullable: true
          }
        },
        required: ["relationType", "targetDocumentReferenceAr"]
      }
    }
  },
  required: ["relations"]
};

export async function extractLegalRelations(text: string): Promise<ExtractedLegalRelation[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Skipping Legal Relation extraction.");
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: LegalRelationSchema as any,
        temperature: 0.1,
      }
    });

    const prompt = `
Analyze the following official gazette legal document.
Your task is to detect explicit legal relationships where this document affects or references other documents.
Look for Arabic phrases like "يلغى" (repeals), "يعدل" (amends), "يكمل" (supplements), "تطبيقا لـ" (implements) 
or French equivalents like "abroge", "modifie", "complète", "en application de".

Document Text:
----------------
${text}
----------------
    `;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());
    return data.relations as ExtractedLegalRelation[];
  } catch (error) {
    console.error("Error during Legal Relation extraction:", error);
    return [];
  }
}
