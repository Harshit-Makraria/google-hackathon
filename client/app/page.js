'use client';
import { useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const RISK_STYLES = {
  LOW:    { badge: 'bg-green-500/20 text-green-400 border border-green-500/30',  dot: 'bg-green-400',  label: 'LOW RISK' },
  MEDIUM: { badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', dot: 'bg-yellow-400', label: 'MEDIUM RISK' },
  HIGH:   { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',       dot: 'bg-red-400',    label: 'HIGH RISK' },
};

export default function Home() {
  const [file, setFile]                   = useState(null);
  const [protectedAttr, setProtectedAttr] = useState('');
  const [outcomeCol, setOutcomeCol]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [results, setResults]             = useState(null);
  const [error, setError]                 = useState(null);
  const [dragging, setDragging]           = useState(false);
  const fileRef                           = useRef(null);
  const resultsRef                        = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) setFile(dropped);
  }

  async function handleAnalyze() {
    if (!file || !protectedAttr.trim() || !outcomeCol.trim()) {
      setError('Please upload a CSV file and fill in both column names.');
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('protectedAttribute', protectedAttr.trim());
      form.append('outcomeColumn', outcomeCol.trim());

      const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResults(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setProtectedAttr('');
    setOutcomeCol('');
    setResults(null);
    setError(null);
  }

  const { metrics, report } = results ?? {};
  const risk = metrics ? RISK_STYLES[metrics.riskLevel] : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">

      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BiasLens</h1>
            <p className="text-xs text-gray-500">AI Fairness Auditor</p>
          </div>
        </div>
        <span className="text-xs text-gray-600 hidden sm:block">Google Solution Challenge 2026</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs text-indigo-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by Gemini AI
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Detect bias in your<br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              datasets & models
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Upload a CSV, specify your sensitive column, and get plain-English bias metrics + AI-generated fixes in seconds.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6 ${
              dragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-[#3a3a3a] hover:border-[#555]'
            } ${file ? 'border-green-500/50 bg-green-500/5' : ''}`}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl">📄</span>
                <p className="font-medium text-green-400">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl text-gray-600">📂</span>
                <p className="text-gray-300 font-medium">Drop your CSV here or click to browse</p>
                <p className="text-xs text-gray-600">Max 5MB — CSV format only</p>
              </div>
            )}
          </div>

          {/* Inputs */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Protected Attribute Column</label>
              <input
                type="text"
                placeholder='e.g. "gender", "race", "age"'
                value={protectedAttr}
                onChange={e => setProtectedAttr(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Outcome Column</label>
              <input
                type="text"
                placeholder='e.g. "hired", "approved", "loan"'
                value={outcomeCol}
                onChange={e => setOutcomeCol(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing with Gemini...
              </span>
            ) : 'Analyze for Bias'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div ref={resultsRef} className="mt-10 space-y-6">

            {/* Risk Banner */}
            <div className={`rounded-2xl p-6 flex items-center justify-between ${risk.badge}`}>
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${risk.dot}`} />
                <div>
                  <p className="text-xs font-semibold tracking-widest opacity-70">BIAS RISK LEVEL</p>
                  <p className="text-3xl font-bold">{risk.label}</p>
                </div>
              </div>
              <button onClick={handleReset} className="text-xs opacity-60 hover:opacity-100 underline">
                New Analysis
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Disparate Impact', value: metrics.disparateImpact, note: '≥ 0.8 is fair' },
                { label: 'Stat. Parity Diff', value: metrics.statisticalParityDiff, note: '≤ 0.1 is fair' },
                { label: 'Total Rows', value: metrics.totalRows.toLocaleString(), note: 'dataset size' },
                { label: 'Groups Found', value: metrics.groups.length, note: `in "${metrics.protectedAttribute}"` },
              ].map(({ label, value, note }) => (
                <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-gray-600 mt-1">{note}</p>
                </div>
              ))}
            </div>

            {/* Distribution Table */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Group Distribution &amp; Outcome Rates</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                      <th className="text-left pb-3">Group</th>
                      <th className="text-right pb-3">Count</th>
                      <th className="text-right pb-3">Positive Outcomes</th>
                      <th className="text-right pb-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.groups.map(group => (
                      <tr key={group} className="border-b border-[#2a2a2a] last:border-0">
                        <td className="py-3 font-medium">{group}</td>
                        <td className="py-3 text-right text-gray-400">{metrics.distribution[group]}</td>
                        <td className="py-3 text-right text-gray-400">{metrics.positiveCounts[group]}</td>
                        <td className="py-3 text-right">
                          <span className={`font-mono font-bold ${
                            group === metrics.privilegedGroup ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(metrics.positiveRates[group] * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Report */}
            {report && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-indigo-400">✦</span>
                  <h3 className="text-sm font-semibold text-gray-300">AI Remediation Report</h3>
                  <span className="text-xs text-gray-600 ml-auto">Generated by Gemini</span>
                </div>

                <Section title="What bias was found?" content={report.summary} />
                <Section title="Why does it happen?" content={report.whyItHappens} />
                <Section title="Who is affected?" content={report.whoIsAffected} />

                {/* Fixes */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Actionable Fixes</p>
                  <div className="space-y-3">
                    {report.fixes?.map((fix, i) => (
                      <div key={i} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm mb-1">{fix.title}</p>
                            <p className="text-gray-400 text-sm">{fix.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Statement */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-400 mb-1">Real-World Impact If Unaddressed</p>
                  <p className="text-gray-300 text-sm">{report.impactStatement}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-700 py-8">
        BiasLens — Google Solution Challenge 2026
      </footer>
    </div>
  );
}

function Section({ title, content }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
    </div>
  );
}
