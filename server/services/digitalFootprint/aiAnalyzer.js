const OpenAI = require("openai");

async function analyzeWithAI(scan) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    input: `
You are the CyberShield privacy analysis assistant.

Analyze this digital-footprint scan.

Rules:
- Do not claim account ownership.
- Do not claim a data breach.
- Do not invent information.
- Clearly distinguish verified, unavailable, and uncertain results.
- Give practical privacy recommendations.

Scan:

${JSON.stringify(scan, null, 2)}

Return:
1. A short summary
2. Key findings
3. Privacy recommendations
`,
  });

  return response.output_text;
}

module.exports = {
  analyzeWithAI,
};