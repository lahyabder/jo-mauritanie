const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({ model: 'gemini-flash-latest' });
  try {
    const result = await model.generateContent("hello");
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
