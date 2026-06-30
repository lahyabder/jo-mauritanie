const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent("hello");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error with gemini-1.5-pro-latest:", err.message);
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent("hello");
      console.log("Success with gemini-1.5-pro:", result.response.text());
    } catch (e2) {
      console.error("Error with gemini-1.5-pro:", e2.message);
    }
  }
}

test();
