const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateReport(metrics) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an AI fairness auditor. Analyze the following bias metrics from a dataset and return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

METRICS:
- Protected Attribute: ${metrics.protectedAttribute}
- Outcome Column: ${metrics.outcomeColumn}
- Total Rows: ${metrics.totalRows}
- Group Distribution: ${JSON.stringify(metrics.distribution)}
- Positive Outcome Rates per Group: ${JSON.stringify(metrics.positiveRates)}
- Disparate Impact Score: ${metrics.disparateImpact} (fair threshold ≥ 0.8, known as the "80% rule")
- Statistical Parity Difference: ${metrics.statisticalParityDiff}
- Most Privileged Group: ${metrics.privilegedGroup}
- Most Disadvantaged Group: ${metrics.unprivilegedGroup}
- Risk Level: ${metrics.riskLevel}

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain English summary of what bias exists and its severity",
  "whyItHappens": "2-3 sentences explaining the likely root cause of this bias in the data",
  "whoIsAffected": "Specific description of which groups are disadvantaged and by how much",
  "fixes": [
    { "title": "Fix 1 title", "description": "Detailed actionable description of this fix" },
    { "title": "Fix 2 title", "description": "Detailed actionable description of this fix" },
    { "title": "Fix 3 title", "description": "Detailed actionable description of this fix" }
  ],
  "impactStatement": "One powerful sentence on the real-world harm if this bias is not addressed"
}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini returned an unparseable response');
  }
}

module.exports = { generateReport };
