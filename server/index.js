require('dotenv').config();
const express = require('express');
const cors = require('cors');
const busboy = require('busboy');
const { analyzeCSV } = require('./lib/biasAnalyzer');
const { generateReport } = require('./lib/geminiClient');
const { auditJSONL } = require('./lib/sftAuditor');
const { generateCounterfactual } = require('./lib/counterfactual');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });
    const fields = {};
    let fileBuffer = null;

    bb.on('file', (_name, file) => {
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('close', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('field', (name, value) => { fields[name] = value; });
    bb.on('close', () => resolve({ fields, fileBuffer }));
    bb.on('error', reject);

    if (req.rawBody) { bb.end(req.rawBody); } else { req.pipe(bb); }
  });
}

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.post('/analyze', async (req, res) => {
  try {
    const { fields, fileBuffer } = await parseMultipart(req);
    if (!fileBuffer) return res.status(400).json({ error: 'No file uploaded' });

    const { protectedAttribute, outcomeColumn } = fields;
    if (!protectedAttribute || !outcomeColumn) {
      return res.status(400).json({ error: 'protectedAttribute and outcomeColumn are required' });
    }

    const metrics = analyzeCSV(fileBuffer, protectedAttribute, outcomeColumn);
    const report = await generateReport(metrics);

    res.json({ metrics, report });
  } catch (err) {
    console.error('[analyze error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---- Feature 1: SFT Instruction Dataset Auditor ----
router.post('/audit-jsonl', async (req, res) => {
  try {
    const { fileBuffer } = await parseMultipart(req);
    if (!fileBuffer) return res.status(400).json({ error: 'No JSONL file uploaded' });

    const audit = await auditJSONL(fileBuffer);
    res.json({ audit });
  } catch (err) {
    console.error('[audit-jsonl error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---- Feature 2: Counterfactual What-If Engine ----
router.post('/counterfactual', async (req, res) => {
  try {
    const { rows, protectedAttribute, outcomeColumn, targetRow, flipTo } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }
    if (!protectedAttribute || !outcomeColumn) {
      return res.status(400).json({ error: 'protectedAttribute and outcomeColumn are required' });
    }
    if (!targetRow || typeof targetRow !== 'object') {
      return res.status(400).json({ error: 'targetRow is required' });
    }

    const result = generateCounterfactual(rows, protectedAttribute, outcomeColumn, targetRow, flipTo);
    res.json(result);
  } catch (err) {
    console.error('[counterfactual error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', router);

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`BiasLens server running on http://localhost:${PORT}`));
}

module.exports = app;
