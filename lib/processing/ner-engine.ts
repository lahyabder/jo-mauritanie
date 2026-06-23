// lib/processing/ner-engine.ts
// AI Named Entity Recognition (NER) for Persons, Institutions, and Events

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExtractedPerson {
  fullNameAr: string;
  fullNameFr?: string;
  roleContext?: string; // How they are mentioned (e.g. "Ministre de l'Intérieur")
}

export interface ExtractedInstitution {
  nameAr: string;
  nameFr?: string;
  type: 'ministry' | 'authority' | 'company' | 'committee' | 'other';
}

export interface ExtractedEvent {
  eventType: 'nomination' | 'promotion' | 'transfer' | 'dismissal' | 'retirement' | 'delegation' | 'decoration' | 'other';
  personNameAr: string;
  personNameFr?: string;
  newPositionTitleAr?: string;
  newPositionTitleFr?: string;
  institutionNameAr?: string;
  institutionNameFr?: string;
  previousPositionAr?: string;
  previousInstitutionAr?: string;
  replacedPersonNameAr?: string;
  effectiveDate?: string;
}

export interface NERResult {
  persons: ExtractedPerson[];
  institutions: ExtractedInstitution[];
  events: ExtractedEvent[];
}

const NERSchema = {
  type: SchemaType.OBJECT,
  properties: {
    persons: {
      type: SchemaType.ARRAY,
      description: "List of all distinct people mentioned in the document",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          fullNameAr: { type: SchemaType.STRING, description: "Full name in Arabic" },
          fullNameFr: { type: SchemaType.STRING, description: "Full name in French (if present)" },
          roleContext: { type: SchemaType.STRING, description: "The role or title they hold as mentioned" }
        },
        required: ["fullNameAr"]
      }
    },
    institutions: {
      type: SchemaType.ARRAY,
      description: "List of all distinct institutions (ministries, authorities, companies, committees) mentioned",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          nameAr: { type: SchemaType.STRING, description: "Institution name in Arabic" },
          nameFr: { type: SchemaType.STRING, description: "Institution name in French (if present)" },
          type: { 
            type: SchemaType.STRING, 
            description: "Type of institution", 
            enum: ['ministry', 'authority', 'company', 'committee', 'other'] 
          }
        },
        required: ["nameAr", "type"]
      }
    },
    events: {
      type: SchemaType.ARRAY,
      description: "Historical events altering a person's status: appointments, dismissals, transfers, decorations, etc.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          eventType: { 
            type: SchemaType.STRING, 
            enum: ['nomination', 'promotion', 'transfer', 'dismissal', 'retirement', 'delegation', 'decoration', 'other'] 
          },
          personNameAr: { type: SchemaType.STRING, description: "Name of the person affected in Arabic" },
          personNameFr: { type: SchemaType.STRING, description: "Name of the person affected in French" },
          newPositionTitleAr: { type: SchemaType.STRING, description: "New title/position (if applicable)" },
          newPositionTitleFr: { type: SchemaType.STRING },
          institutionNameAr: { type: SchemaType.STRING, description: "Institution they are appointed to or dismissed from" },
          institutionNameFr: { type: SchemaType.STRING },
          previousPositionAr: { type: SchemaType.STRING, description: "Previous position held before this event" },
          previousInstitutionAr: { type: SchemaType.STRING, description: "Previous institution" },
          replacedPersonNameAr: { type: SchemaType.STRING, description: "Name of the person they are replacing (if applicable)" },
          effectiveDate: { type: SchemaType.STRING, description: "Effective date of the event in YYYY-MM-DD" }
        },
        required: ["eventType", "personNameAr"]
      }
    }
  },
  required: ["persons", "institutions", "events"]
};

export async function runNERExtraction(text: string): Promise<NERResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Skipping NER extraction.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: NERSchema,
        temperature: 0.1,
      }
    });

    const prompt = `
Perform advanced Named Entity Recognition (NER) on the following official gazette document text.
Identify all distinct Persons and Institutions.
More importantly, identify all historical Events: Appointments (nominations), Dismissals, Transfers, Promotions, and Decorations (medals/awards).
For every event, extract the person involved, their new position/institution, who they are replacing, and their previous position if mentioned.
Ensure Arabic and French names are captured accurately.

Document Text:
----------------
${text}
----------------
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as NERResult;
  } catch (error) {
    console.error("Error during NER extraction:", error);
    return null;
  }
}
