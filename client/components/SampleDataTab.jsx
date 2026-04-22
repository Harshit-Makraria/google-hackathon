'use client';

const SAMPLE_CSV = `gender,age,department,experience_years,hired
male,28,Engineering,3,1
male,32,Engineering,7,1
male,25,Marketing,2,1
male,35,Engineering,10,1
male,27,HR,4,1
male,30,Engineering,5,1
male,29,Marketing,3,1
male,31,Finance,6,1
male,26,Engineering,2,1
male,33,HR,8,1
male,24,Marketing,1,1
male,36,Finance,9,1
female,26,Engineering,2,0
female,30,Marketing,5,0
female,24,Engineering,1,1
female,28,HR,4,0
female,35,Finance,9,0
female,27,Marketing,3,0
female,31,Engineering,6,0
female,29,HR,2,0
female,25,Finance,1,1
female,32,Marketing,7,0
female,23,Engineering,1,0
female,34,HR,8,0`;

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i]]));
  });
  return { headers, rows };
}

const STATS = [
  { label: 'Total Rows', value: '24', icon: '📊', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  { label: 'Columns', value: '5', icon: '🗂️', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  { label: 'Male Hired', value: '100%', icon: '👨', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { label: 'Female Hired', value: '17%', icon: '👩', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  { label: 'Disparate Impact', value: '0.17', icon: '⚖️', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { label: 'Bias Risk', value: 'HIGH', icon: '🚨', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
];

export default function SampleDataTab({ onUseDataset }) {
  const { headers, rows } = parseCSV(SAMPLE_CSV);
  const outcomeCol = 'hired';
  const protectedCol = 'gender';

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sample Dataset</h2>
          <p className="text-slate-500 mt-1">
            A synthetic hiring dataset demonstrating <span className="font-semibold text-red-600">severe gender bias</span>.
            Use it to explore BiasLens without uploading your own data.
          </p>
        </div>
        <button onClick={onUseDataset}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200">
          <span>✨</span> Analyze This Dataset
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATS.map(({ label, value, icon, color, bg }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
            <div className="text-xl mb-1">{icon}</div>
            <p className={`text-lg font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Bias callout */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
        <span className="text-red-500 text-xl shrink-0">🚨</span>
        <div>
          <p className="font-semibold text-red-800 text-sm">Intentional Bias for Demo</p>
          <p className="text-sm text-red-700 mt-0.5 leading-relaxed">
            This dataset is deliberately biased: all 12 male applicants were hired (100%), while only 2 of 12 female applicants were hired (17%).
            Disparate Impact = 0.17 — far below the legal threshold of 0.8. Perfect for demonstrating BiasLens detection capabilities.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Data Preview</h3>
            <p className="text-xs text-slate-400 mt-0.5">All {rows.length} rows · columns: {headers.join(', ')}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" />Hired</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />Not Hired</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                {headers.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className={`${h === protectedCol ? 'text-indigo-600' : h === outcomeCol ? 'text-emerald-600' : ''}`}>
                      {h}
                      {h === protectedCol && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-600 px-1 rounded">protected</span>}
                      {h === outcomeCol && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-600 px-1 rounded">outcome</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => {
                const hired = row[outcomeCol] === '1';
                return (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${hired ? '' : 'bg-red-50/30'}`}>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    {headers.map(h => (
                      <td key={h} className="px-4 py-2.5">
                        {h === protectedCol ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row[h] === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {row[h]}
                          </span>
                        ) : h === outcomeCol ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hired ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {hired ? '✓ Hired' : '✗ Rejected'}
                          </span>
                        ) : (
                          <span className="text-slate-700">{row[h]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Column Guide</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { col: 'gender', type: 'Protected Attribute', desc: 'The sensitive column to audit. Values: male / female', badge: 'bg-indigo-100 text-indigo-700' },
            { col: 'hired', type: 'Outcome Column', desc: 'The decision variable. 1 = hired, 0 = rejected', badge: 'bg-emerald-100 text-emerald-700' },
            { col: 'age', type: 'Feature', desc: 'Applicant age (25–36). Can also be audited as protected attribute', badge: 'bg-slate-100 text-slate-600' },
            { col: 'department', type: 'Feature', desc: 'Engineering / Marketing / HR / Finance', badge: 'bg-slate-100 text-slate-600' },
            { col: 'experience_years', type: 'Feature', desc: 'Years of professional experience (1–10)', badge: 'bg-slate-100 text-slate-600' },
          ].map(({ col, type, desc, badge }) => (
            <div key={col} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <code className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${badge}`}>{col}</code>
              <div>
                <p className="text-xs font-semibold text-slate-700">{type}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
