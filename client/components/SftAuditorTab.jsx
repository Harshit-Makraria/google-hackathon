'use client';
import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const CATEGORY_LABELS = {
  gendered_assumption:      { label: 'Gendered Assumption',     icon: '⚤', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  racial_stereotype:        { label: 'Racial Stereotype',       icon: '🌍', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  cultural_homogenization:  { label: 'Cultural Homogenization', icon: '🗺️', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  toxic_language:           { label: 'Toxic Language',          icon: '☠️', color: 'bg-red-100 text-red-700 border-red-200' },
  religious_bias:           { label: 'Religious Bias',          icon: '🕊️', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  age_bias:                 { label: 'Age Bias',                icon: '⏳', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  socioeconomic_bias:       { label: 'Socioeconomic Bias',      icon: '💰', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  ableist_language:         { label: 'Ableist Language',        icon: '♿', color: 'bg-violet-100 text-violet-700 border-violet-200' },
};

const SEVERITY_STYLE = {
  high:   'bg-red-500 text-white',
  medium: 'bg-amber-500 text-white',
  low:    'bg-slate-300 text-slate-700',
};

const DEMO_JSONL = `{"instruction": "Describe a good nurse.", "response": "She is caring, gentle, and always wears a warm smile."}
{"instruction": "What does a doctor do?", "response": "He examines patients and prescribes medication."}
{"instruction": "Write about a CEO.", "response": "He is a strong leader who commands respect."}
{"instruction": "Describe a secretary.", "response": "She organizes the office and takes notes for her boss."}
{"instruction": "Explain what a software engineer does.", "response": "A software engineer builds and maintains software systems."}
{"instruction": "Tell me about Indian food.", "response": "Indian food is always spicy and full of curry."}
{"instruction": "Describe an elderly employee.", "response": "They are slow to learn new technology and resistant to change."}
{"instruction": "What is a hard worker?", "response": "Someone who dedicates effort and time to achieve their goals."}`;

export default function SftAuditorTab() {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [audit, setAudit]     = useState(null);
  const [error, setError]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('biaslens_sft_history') || '[]')); } catch {}
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.jsonl') && !f.name.endsWith('.json')) {
      setError('Please upload a .jsonl or .json file.');
      return;
    }
    setFile(f); setError(null); setAudit(null);
  };

  const loadDemo = () => {
    const blob = new Blob([DEMO_JSONL], { type: 'application/x-ndjson' });
    const f = new File([blob], 'demo_sft_dataset.jsonl', { type: 'application/x-ndjson' });
    setFile(f); setError(null); setAudit(null);
  };

  const runAudit = async () => {
    if (!file) { setError('Upload a JSONL file first'); return; }
    setLoading(true); setError(null); setAudit(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/audit-jsonl`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAudit(data.audit);
      const entry = { ...data.audit, filename: file.name, timestamp: new Date().toLocaleString() };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('biaslens_sft_history', JSON.stringify(updated));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const exportReport = () => {
    if (!audit) return;
    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'sft-audit-report.json' });
    a.click();
  };

  const riskColor = audit?.riskLevel === 'HIGH' ? 'bg-red-50 border-red-200 text-red-700'
                 : audit?.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700'
                 : 'bg-emerald-50 border-emerald-200 text-emerald-700';

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 border border-indigo-200/60 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <span className="text-white text-lg">📜</span>
          </div>
          <div>
            <h2 className="font-bold text-slate-800">SFT Instruction Dataset Auditor</h2>
            <p className="text-xs text-slate-500">Catch bias in fine-tuning data before you burn GPU credits on a biased model.</p>
          </div>
          <span className="ml-auto text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-full px-3 py-1">GEMINI SEMANTIC SCAN</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Drop your <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-indigo-700">.jsonl</code> fine-tuning dataset. Gemini 2.5 Flash scans every instruction/response pair for <strong>toxic terminology</strong>, <strong>gendered assumptions</strong>, <strong>cultural homogenization</strong>, and more — flagging exact line numbers before you run SFT or LoRA.
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <h3 className="font-semibold text-slate-800 text-sm">Upload JSONL Dataset</h3>
          <button onClick={loadDemo} className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
            ✨ Try Biased Demo
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragging ? 'border-indigo-400 bg-indigo-50/60'
              : file ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}>
            <input ref={fileRef} type="file" accept=".jsonl,.json,.ndjson" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">📜</div>
                <div className="text-left">
                  <p className="font-semibold text-emerald-700 text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(file.size/1024).toFixed(1)} KB · click to replace</p>
                </div>
                <div className="ml-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mx-auto mb-3">📜</div>
                <p className="text-sm font-semibold text-slate-600">Drop your .jsonl file here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Max 20MB · up to 300 lines scanned · ChatML / Alpaca / OpenAI formats supported</p>
              </div>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">⚠️ {error}</div>}

          <button onClick={runAudit} disabled={loading || !file}
            className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                Running semantic scan with Gemini…
              </>
            ) : '🔬 Audit SFT Dataset'}
          </button>
        </div>
      </div>

      {/* Results */}
      {audit && (
        <div className="space-y-5">
          {/* Risk banner */}
          <div className={`border rounded-2xl p-5 ${riskColor}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{audit.riskLevel === 'HIGH' ? '🚨' : audit.riskLevel === 'MEDIUM' ? '⚠️' : '✅'}</span>
              <div className="flex-1">
                <p className="font-bold">
                  {audit.riskLevel === 'HIGH' ? 'Dataset contains systemic bias — do NOT fine-tune without remediation'
                  : audit.riskLevel === 'MEDIUM' ? 'Moderate bias detected — clean flagged pairs before fine-tuning'
                  : 'Dataset appears clean — safe to proceed with fine-tuning'}
                </p>
                <p className="text-xs mt-1 opacity-80">
                  Toxicity Score: <strong>{audit.toxicityScore}%</strong> · {audit.flaggedCount} flagged / {audit.scannedLines} scanned pairs
                </p>
              </div>
              <span className="text-xs font-bold bg-white/80 rounded-full px-3 py-1 border border-current/20">{audit.riskLevel} RISK</span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Lines', value: audit.totalLines, color: 'text-slate-800' },
              { label: 'Scanned', value: audit.scannedLines, color: 'text-indigo-700' },
              { label: 'Flagged', value: audit.flaggedCount, color: 'text-rose-600' },
              { label: 'Toxicity %', value: `${audit.toxicityScore}%`, color: audit.toxicityScore > 15 ? 'text-rose-600' : 'text-amber-600' },
              { label: 'High Severity', value: audit.bySeverity?.high ?? 0, color: 'text-red-600' },
            ].map(m => (
              <div key={m.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{m.label}</p>
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {Object.keys(audit.byCategory).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h3 className="font-semibold text-slate-800 text-sm">Bias Categories Detected</h3>
              </div>
              <div className="p-6 flex flex-wrap gap-2">
                {Object.entries(audit.byCategory).sort((a,b)=>b[1]-a[1]).map(([cat, count]) => {
                  const meta = CATEGORY_LABELS[cat] || { label: cat, icon: '⚠️', color: 'bg-slate-100 text-slate-700 border-slate-200' };
                  return (
                    <div key={cat} className={`text-xs font-semibold rounded-full border px-3 py-1.5 flex items-center gap-2 ${meta.color}`}>
                      <span>{meta.icon}</span>
                      {meta.label}
                      <span className="bg-white/70 rounded-full px-1.5 py-0.5 text-[10px] font-black">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flagged lines */}
          {audit.flaggedExamples.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Flagged Pairs ({audit.flaggedExamples.length})</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Fix or remove these before fine-tuning</p>
                </div>
                <button onClick={exportReport} className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  ⬇️ Export JSON
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {audit.flaggedExamples.map((f, i) => (
                  <div key={i} className="p-5 hover:bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-[10px] font-mono font-black bg-slate-800 text-white rounded px-2 py-0.5">LINE {f.line}</span>
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase ${SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low}`}>{f.severity}</span>
                      {(f.bias_types || []).map(t => {
                        const meta = CATEGORY_LABELS[t];
                        return (
                          <span key={t} className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 ${meta?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {meta?.icon} {meta?.label || t}
                          </span>
                        );
                      })}
                    </div>
                    {f.excerpt && (
                      <div className="bg-rose-50 border-l-4 border-rose-400 px-3 py-2 rounded mb-2">
                        <p className="text-xs text-slate-500 font-bold mb-0.5">BIASED EXCERPT</p>
                        <p className="text-sm text-rose-800 italic">"{f.excerpt}"</p>
                      </div>
                    )}
                    {f.explanation && <p className="text-xs text-slate-600 mb-3 pl-1"><strong>Why:</strong> {f.explanation}</p>}
                    <div className="grid md:grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Prompt</p>
                        <p className="text-slate-700 font-mono leading-relaxed">{f.prompt || '—'}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Response</p>
                        <p className="text-slate-700 font-mono leading-relaxed">{f.response || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {audit.flaggedCount === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <span className="text-3xl">🎉</span>
              <p className="font-bold text-emerald-800 mt-2">No bias detected</p>
              <p className="text-xs text-emerald-700 mt-1">This dataset passed Gemini's semantic fairness scan. Safe to fine-tune.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
