const functions = require('firebase-functions');
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

    if (req.rawBody) {
      bb.end(req.rawBody);
    } else {
      req.pipe(bb);
    }
  });
}

app.post('/analyze', async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

exports.api = functions.https.onRequest(app);
