const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { 
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
      temperature: 0.1
    }
  });

  const prompt = `أنت نظام استخراج بيانات متخصص في القانون الموريتاني.
مهمتك استخراج جميع البيانات بصيغة JSON منظّمة. اتبع الهيكل التالي حرفياً:
{
  "issue": {
    "issue_number": "رقم العدد"
  }
}
إذا لم تجد رقم العدد، أعد null.

النص: هذا نص عشوائي لا يحتوي على رقم العدد.`;

  const res = await model.generateContent(prompt);
  console.log(res.response.text());
}
main();
