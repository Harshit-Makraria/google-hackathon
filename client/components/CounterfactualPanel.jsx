'use client';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export default function CounterfactualPanel({ metrics }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [flipTo, setFlipTo]           = useState('');

  const candidates = metrics.counterfactualCandidates || [];
  const rawRows    = metrics.rawRows || [];

  const runCounterfactual = async (cand) => {
    setLoading(true); setError(null); setResult(null); setSelectedIdx(cand.rowId);
    try {
      const { rowId, ...targetRow } = cand;
      const res = await fetch(`${API_URL}/counterfactual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rawRows,
          protectedAttribute: metrics.protectedAttribute,
          outcomeColumn: metrics.outcomeColumn,
          targetRow,
          flipTo: flipTo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Counterfactual failed');
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (candidates.length === 0) return null;

  const verdictStyle = {
    DIRECT_DISCRIMINATION:          { bg: 'from-red-500 to-rose-600',       text: '🚨 DIRECT DISCRIMINATION — Outcome flipped on protected attribute alone', color: 'text-white' },
    SIGNIFICANT_DISPARATE_TREATMENT:{ bg: 'from-amber-500 to-orange-500',   text: '⚠️ SIGNIFICANT DISPARATE TREATMENT — Probability shifted materially', color: 'text-white' },
    NO_MATERIAL_CHANGE:             { bg: 'from-emerald-500 to-green-500', text: '✅ NO MATERIAL CHANGE — Decision robust to the protected attribute', color: 'text-white' },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-fuchsia-50/60 to-rose-50/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
              <span className="text-white text-sm">🧪</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Counterfactual "What-If" Engine</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pick a row, flip <strong className="text-fuchsia-600">{metrics.protectedAttribute}</strong>, hold everything else identical. If the outcome changes — that's proof of direct discrimination.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-fuchsia-600 text-white rounded-full px-2.5 py-1">ROOT-CAUSE ANALYSIS</span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Flip-to selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold text-slate-700">Flip {metrics.protectedAttribute} to:</label>
          <select value={flipTo} onChange={e => setFlipTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
            <option value="">Auto (most privileged)</option>
            {metrics.groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Candidate list */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select a prediction to analyze</p>
          <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
            {candidates.map((c) => {
              const isSelected = selectedIdx === c.rowId;
              const outcomeVal = c[metrics.outcomeColumn];
              const isNeg = !['1','1.0','true','yes','y','hired','approved','accepted','passed','positive','granted'].includes(String(outcomeVal).toLowerCase());
              return (
                <button key={c.rowId} onClick={() => runCounterfactual(c)} disabled={loading}
                  className={`text-left border rounded-xl px-3 py-2 text-xs font-mono transition-all ${
                    isSelected ? 'border-fuchsia-400 bg-fuchsia-50/60 ring-2 ring-fuchsia-200' : 'border-slate-200 hover:border-fuchsia-300 hover:bg-slate-50'
                  } disabled:opacity-50`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${isNeg ? 'bg-rose-500' : 'bg-emerald-500'}`}/>
                      <span className="text-slate-400">#{c.rowId}</span>
                      <span className="font-bold text-slate-700">{metrics.protectedAttribute}={String(c[metrics.protectedAttribute])}</span>
                      <span className="text-slate-500 truncate">
                        {Object.entries(c).filter(([k]) => k !== 'rowId' && k !== metrics.protectedAttribute && k !== metrics.outcomeColumn).slice(0,3).map(([k,v]) => `${k}=${v}`).join(' · ')}
                      </span>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold rounded px-2 py-0.5 ${isNeg ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {metrics.outcomeColumn}={String(outcomeVal)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">⚠️ {error}</div>}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-4">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            Generating counterfactual…
          </div>
        )}

        {/* Side-by-side comparison */}
        {result && (
          <div className="space-y-4">
            {/* Verdict banner */}
            <div className={`bg-gradient-to-r ${verdictStyle[result.delta.verdict].bg} rounded-2xl p-4 shadow-lg`}>
              <p className={`font-bold text-sm ${verdictStyle[result.delta.verdict].color}`}>{verdictStyle[result.delta.verdict].text}</p>
              <p className={`text-xs mt-1 opacity-90 ${verdictStyle[result.delta.verdict].color}`}>
                Probability shift: <strong>{(result.delta.probabilityChange * 100).toFixed(1)}%</strong> when flipping {metrics.protectedAttribute}: <strong>{result.delta.flippedFrom}</strong> → <strong>{result.delta.flippedTo}</strong>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { key: 'original', label: 'ORIGINAL', data: result.original, accent: 'border-rose-200 bg-rose-50/40', pillBg: 'bg-rose-100 text-rose-700' },
                { key: 'counterfactual', label: 'COUNTERFACTUAL', data: result.counterfactual, accent: 'border-emerald-200 bg-emerald-50/40', pillBg: 'bg-emerald-100 text-emerald-700' },
              ].map(p => (
                <div key={p.key} className={`border-2 rounded-2xl p-4 ${p.accent}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.label}</p>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${p.pillBg}`}>{p.data.prediction}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {(p.data.probability * 100).toFixed(1)}<span className="text-sm text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-3">predicted probability of positive outcome</p>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(p.data).filter(([k]) => !['probability','prediction'].includes(k)).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-mono">{k}</span>
                        <span className={`font-semibold font-mono ${k === metrics.protectedAttribute ? 'text-fuchsia-700 bg-fuchsia-100 px-1.5 rounded' : 'text-slate-700'}`}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500">Only <strong className="text-fuchsia-600 font-mono">{metrics.protectedAttribute}</strong> was changed. All other features are held mathematically identical.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
