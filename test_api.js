const fs = require('fs');

async function test() {
  const csv = fs.readFileSync('C:/Users/harsh/Claude Cowork/google_hktn/sample_data.csv');

  const form = new globalThis.FormData();
  form.append('file', new globalThis.File([csv], 'sample_data.csv', { type: 'text/csv' }));
  form.append('protectedAttribute', 'gender');
  form.append('outcomeColumn', 'hired');

  const res = await fetch('http://127.0.0.1:5001/biaslens-app/us-central1/api/analyze', {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log('STATUS:', res.status);
    console.log('FULL RESPONSE:', JSON.stringify(data, null, 2));
  } catch {
    console.log('RAW:', text.slice(0, 800));
  }
}

test().catch(console.error);
