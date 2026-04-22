require('dotenv').config();
const express = require('express');
const cors = require('cors');
const busboy = require('busboy');
const { analyzeCSV } = require('./lib/biasAnalyzer');
const { generateReport } = require('./lib/geminiClient');

const app = express();

app.use(cors({ origin: true }));

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });
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

    req.pipe(bb);
  });
}

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.post('/analyze', async (req, res) => {
  try {
    const { fields, fileBuffer } = await parseMultipart(req);

    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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

app.use('/api', router);

// Start server when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`BiasLens server running on http://localhost:${PORT}`));
}

// Export for Vercel serverless
module.exports = app;
