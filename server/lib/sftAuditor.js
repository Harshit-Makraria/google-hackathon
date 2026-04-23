const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const BIAS_CATEGORIES = [
  'gendered_assumption',
  'racial_stereotype',
  'cultural_homogenization',
  'toxic_language',
  'religious_bias',
  'age_bias',
  'socioeconomic_bias',
  'ableist_language',
];

/**
 * Parse JSONL file — each line is a JSON object representing an instruction/response pair.
 * Typical SFT formats supported:
 *   {"instruction": "...", "response": "..."}
 *   {"prompt": "...", "completion": "..."}
 *   {"messages": [{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
 */
function parseJSONL(buffer) {
  const text = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const entries = [];
  const parseErrors = [];

  lines.forEach((line, idx) => {
    try {
      const obj = JSON.parse(line);
      let prompt = '';
      let response = '';

      if (obj.messages && Array.isArray(obj.messages)) {
        const user = obj.messages.find(m => m.role === 'user' || m.role === 'human');
        const asst = obj.messages.find(m => m.role === 'assistant' || m.role === 'bot');
        prompt = user?.content ?? '';
        response = asst?.content ?? '';
      } else {
        prompt = obj.instruction ?? obj.prompt ?? obj.input ?? obj.question ?? '';
        response = obj.response ?? obj.completion ?? obj.output ?? obj.answer ?? '';
      }

      if (obj.context) prompt = `[CTX] ${obj.context}\n${prompt}`;

      entries.push({ lineNumber: idx + 1, prompt: String(prompt), response: String(response) });
    } catch (e) {
      parseErrors.push({ lineNumber: idx + 1, error: e.message });
    }
  });

  return { entries, parseErrors };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function scanBatchWithGemini(batch) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const payload = batch.map(e => ({
    line: e.lineNumber,
    prompt: e.prompt.slice(0, 600),
    response: e.response.slice(0, 600),
  }));

  const systemPrompt = `You are a strict SFT fine-tuning dataset auditor. Scan each instruction/response pair for bias and return ONLY a valid JSON array — no markdown, no commentary.

Detect these bias categories:
${BIAS_CATEGORIES.map(c => `- ${c}`).join('\n')}

For each pair, output one object:
{
  "line": <lineNumber>,
  "contains_bias": <true|false>,
  "bias_types": ["gendered_assumption", ...],
  "severity": "low" | "medium" | "high",
  "excerpt": "<≤15 words quoting the exact biased phrase>",
  "explanation": "<1 sentence on why it is biased>"
}

If no bias, still emit the object with contains_bias:false and empty bias_types array. Be precise — do not flag neutral factual content.

INPUT PAIRS:
${JSON.stringify(payload, null, 2)}

Return ONLY the JSON array.`;

  const result = await model.generateContent(systemPrompt);
  let text = result.response.text().trim();
  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    console.error('[sft] Gemini returned unparseable response:', text.slice(0, 200));
    return batch.map(e => ({ line: e.lineNumber, contains_bias: false, bias_types: [], severity: 'low', excerpt: '', explanation: '' }));
  }
}

async function auditJSONL(buffer, { maxLines = 300, batchSize = 20 } = {}) {
  const { entries, parseErrors } = parseJSONL(buffer);

  if (entries.length === 0) {
    throw new Error('No valid JSON lines found in file');
  }

  const sampled = entries.slice(0, maxLines);
  const batches = chunk(sampled, batchSize);
  const results = [];

  for (const batch of batches) {
    try {
      const flags = await scanBatchWithGemini(batch);
      results.push(...flags);
    } catch (err) {
      console.error('[sft] batch failed:', err.message);
      batch.forEach(e => results.push({ line: e.lineNumber, contains_bias: false, bias_types: [], severity: 'low', excerpt: '', explanation: `[scan error: ${err.message}]` }));
    }
  }

  // Aggregate
  const flagged = results.filter(r => r.contains_bias);
  const byCategory = {};
  const bySeverity = { low: 0, medium: 0, high: 0 };

  flagged.forEach(r => {
    (r.bias_types || []).forEach(cat => { byCategory[cat] = (byCategory[cat] || 0) + 1; });
    if (r.severity && bySeverity[r.severity] !== undefined) bySeverity[r.severity] += 1;
  });

  const toxicityScore = sampled.length > 0
    ? parseFloat(((flagged.length / sampled.length) * 100).toFixed(1))
    : 0;

  let riskLevel;
  if (toxicityScore >= 20 || bySeverity.high >= 5) riskLevel = 'HIGH';
  else if (toxicityScore >= 8 || bySeverity.high >= 1) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // Merge flagged results with original prompt/response text for UI display
  const byLine = new Map(sampled.map(e => [e.lineNumber, e]));
  const flaggedWithContext = flagged.map(f => {
    const src = byLine.get(f.line);
    return {
      ...f,
      prompt: src?.prompt?.slice(0, 400) ?? '',
      response: src?.response?.slice(0, 400) ?? '',
    };
  });

  return {
    totalLines: entries.length,
    scannedLines: sampled.length,
    flaggedCount: flagged.length,
    toxicityScore,
    riskLevel,
    byCategory,
    bySeverity,
    flaggedExamples: flaggedWithContext.slice(0, 50),
    parseErrors: parseErrors.slice(0, 10),
  };
}

module.exports = { auditJSONL };
