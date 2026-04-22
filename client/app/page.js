'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import BiasChart from '../components/BiasChart';
import WhatIfSimulator from '../components/WhatIfSimulator';
import GlossaryTab from '../components/GlossaryTab';
import HistoryTab from '../components/HistoryTab';
import SampleDataTab from '../components/SampleDataTab';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const SENSITIVE_KEYWORDS = ['gender','sex','race','ethnicity','age','religion','nationality','caste','disability','marital','color','origin','pregnancy'];
const OUTCOME_KEYWORDS   = ['hired','approved','accepted','granted','passed','selected','outcome','result','decision','label','target','class','loan','credit'];

const RISK_CONFIG = {
  HIGH:   { badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    banner: 'bg-red-50 border-red-200',    icon: '🚨', glow: 'shadow-red-100' },
  MEDIUM: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500',  banner: 'bg-amber-50 border-amber-200',  icon: '⚠️', glow: 'shadow-amber-100' },
  LOW:    { badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500',  banner: 'bg-green-50 border-green-200',  icon: '✅', glow: 'shadow-green-100' },
};

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

function getGrade(di) {
  if (di >= 0.9) return { grade: 'A', label: 'Excellent',  bg: 'from-green-400 to-emerald-500',  text: 'text-emerald-700' };
  if (di >= 0.8) return { grade: 'B', label: 'Good',       bg: 'from-teal-400 to-green-500',     text: 'text-teal-700' };
  if (di >= 0.7) return { grade: 'C', label: 'Moderate',   bg: 'from-amber-400 to-yellow-500',   text: 'text-amber-700' };
  if (di >= 0.6) return { grade: 'D', label: 'Poor',       bg: 'from-orange-400 to-amber-500',   text: 'text-orange-700' };
  return           { grade: 'F', label: 'Critical',    bg: 'from-red-500 to-rose-600',       text: 'text-red-700' };
}

function getConfidence(rows) {
  if (rows < 30)  return { label: 'Low',    pct: 38, color: 'bg-amber-400' };
  if (rows < 100) return { label: 'Medium', pct: 68, color: 'bg-blue-400' };
  return                  { label: 'High',  pct: 94, color: 'bg-green-400' };
}

function Tip({ text, children }) {
  return (
    <span className="group relative inline-block cursor-help">
      {children}
      <span className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl bg-slate-900 text-white text-xs p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity text-center leading-relaxed">
        {text}
      </span>
    </span>
  );
}

export default function Home() {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [file, setFile]                   = useState(null);
  const [csvHeaders, setCsvHeaders]       = useState([]);
  const [detected, setDetected]           = useState({ sensitive: [], outcomes: [] });
  const [protectedAttr, setProtectedAttr] = useState('');
  const [outcomeCol, setOutcomeCol]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [results, setResults]             = useState(null);
  const [error, setError]                 = useState(null);
  const [dragging, setDragging]           = useState(false);
  const [history, setHistory]             = useState([]);
  const fileRef    = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('biaslens_history') || '[]')); } catch {}
  }, []);

  const parseHeaders = useCallback((text) => {
    const headers = text.split('\n')[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const sensitive = headers.filter(h => SENSITIVE_KEYWORDS.some(k => h.toLowerCase().includes(k)));
    const outcomes  = headers.filter(h => OUTCOME_KEYWORDS.some(k => h.toLowerCase().includes(k)));
    setCsvHeaders(headers);
    setDetected({ sensitive, outcomes });
    if (sensitive.length && !protectedAttr) setProtectedAttr(sensitive[0]);
    if (outcomes.length && !outcomeCol)     setOutcomeCol(outcomes[0]);
  }, [protectedAttr, outcomeCol]);

  const handleFile = useCallback((f) => {
    if (!f?.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFile(f); setError(null); setResults(null);
    const r = new FileReader();
    r.onload = e => parseHeaders(e.target.result);
    r.readAsText(f);
  }, [parseHeaders]);

  const loadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const f = new File([blob], 'sample_hiring_data.csv', { type: 'text/csv' });
    setFile(f); setError(null); setResults(null);
    parseHeaders(SAMPLE_CSV);
    setActiveTab('dashboard');
  };

  const handleAnalyze = async () => {
    if (!file || !protectedAttr.trim() || !outcomeCol.trim()) {
      setError('Please upload a CSV and select both columns.'); return;
    }
    setError(null); setLoading(true); setResults(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('protectedAttribute', protectedAttr.trim());
      form.append('outcomeColumn', outcomeCol.trim());
      const res  = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResults(data);
      const entry   = { ...data, timestamp: new Date().toLocaleString(), filename: file.name };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('biaslens_history', JSON.stringify(updated));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const exportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'biaslens-report.json' });
    a.click();
  };

  const { metrics, report } = results ?? {};
  const risk  = metrics ? RISK_CONFIG[metrics.riskLevel] : null;
  const grade = metrics ? getGrade(metrics.disparateImpact) : null;
  const conf  = metrics ? getConfidence(metrics.totalRows) : null;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} historyCount={history.length} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 no-print shadow-sm">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-slate-800 capitalize text-sm">{activeTab === 'sample' ? 'Sample Dataset' : activeTab}</h1>
              <p className="text-xs text-slate-400">AI-powered algorithmic fairness platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-indigo-200/60 rounded-full px-4 py-1.5">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-500 flex items-center justify-center">
                <span className="text-white text-[7px] font-black">G</span>
              </div>
              <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Powered by Gemini 2.5 Flash
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history'  && <HistoryTab history={history} onRestore={r => { setResults(r); setActiveTab('dashboard'); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200); }} />}
          {activeTab === 'glossary' && <GlossaryTab />}
          {activeTab === 'sample'   && <SampleDataTab onUseDataset={loadSample} />}

          {activeTab === 'dashboard' && (
            <div className="max-w-4xl space-y-5">

              {/* Upload Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    </div>
                    <h2 className="font-semibold text-slate-800">Upload & Configure</h2>
                  </div>
                  <button onClick={loadSample}
                    className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                    ✨ Try Sample Dataset
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {/* Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragging ? 'border-indigo-400 bg-indigo-50/60' :
                      file     ? 'border-emerald-300 bg-emerald-50/50' :
                                 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">📄</div>
                        <div className="text-left">
                          <p className="font-semibold text-emerald-700 text-sm">{file.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{(file.size/1024).toFixed(1)} KB · {csvHeaders.length} columns · click to replace</p>
                        </div>
                        <div className="ml-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>
                      </div>
                    ) : (
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mx-auto mb-3">📂</div>
                        <p className="text-sm font-semibold text-slate-600">Drop your CSV here or click to browse</p>
                        <p className="text-xs text-slate-400 mt-1">Max 5MB · CSV format</p>
                      </div>
                    )}
                  </div>

                  {/* Smart Detection */}
                  {(detected.sensitive.length > 0 || detected.outcomes.length > 0) && (
                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/60 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">🔍</span>
                        <p className="text-sm font-semibold text-indigo-800">Smart Column Detection</p>
                        <span className="ml-auto text-[10px] bg-indigo-600 text-white rounded-full px-2 py-0.5 font-semibold">AI AUTO-DETECTED</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detected.sensitive.map(col => (
                          <button key={col} onClick={() => setProtectedAttr(col)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${protectedAttr === col ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>
                            🔒 {col}
                          </button>
                        ))}
                        {detected.outcomes.map(col => (
                          <button key={col} onClick={() => setOutcomeCol(col)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${outcomeCol === col ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                            🎯 {col}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Column Selectors */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Protected Attribute', key: 'protected', val: protectedAttr, set: setProtectedAttr, tip: 'Sensitive column to audit (gender, race, age…)', ph: 'e.g. gender' },
                      { label: 'Outcome Column', key: 'outcome', val: outcomeCol, set: setOutcomeCol, tip: 'Decision variable — must be 0/1 or yes/no', ph: 'e.g. hired' },
                    ].map(({ label, val, set, tip, ph }) => (
                      <div key={label}>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          {label}
                          <Tip text={tip}>
                            <span className="ml-1.5 text-slate-400 text-xs border border-slate-300 rounded-full px-1.5 cursor-help">?</span>
                          </Tip>
                        </label>
                        {csvHeaders.length > 0 ? (
                          <select value={val} onChange={e => set(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                            <option value="">Select column…</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder={ph} value={val} onChange={e => set(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        )}
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                      <span>⚠️</span>{error}
                    </div>
                  )}

                  <button onClick={handleAnalyze} disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        Analyzing with Gemini 2.5 Flash…
                      </>
                    ) : '🔍 Analyze for Bias'}
                  </button>
                </div>
              </div>

              {/* Results */}
              {metrics && (
                <div ref={resultsRef} className="space-y-5">

                  {/* Warning Banner */}
                  {metrics.riskLevel !== 'LOW' && (
                    <div className={`border rounded-2xl p-5 ${risk.banner}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{risk.icon}</span>
                        <p className="font-bold text-slate-800">
                          {metrics.riskLevel === 'HIGH' ? 'High-Risk Discrimination Pattern Detected' : 'Moderate Bias Detected — Action Recommended'}
                        </p>
                        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full border ${risk.badge}`}>{metrics.riskLevel} RISK</span>
                      </div>
                      {metrics.riskLevel === 'HIGH' && (
                        <div className="space-y-1.5 pl-9 text-sm text-slate-700">
                          <p>🚨 Violates the <strong>EEOC 80% Rule</strong> — DI of <strong>{metrics.disparateImpact}</strong> is far below the legal threshold of 0.8</p>
                          <p>⚠️ <strong className="text-rose-700">{metrics.unprivilegedGroup}</strong> group receives positive outcomes at only <strong>{(metrics.positiveRates[metrics.unprivilegedGroup]*100).toFixed(0)}%</strong> of the <strong>{metrics.privilegedGroup}</strong> rate</p>
                          <p>📋 Immediate remediation required before deployment</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {/* Grade */}
                    <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fairness Grade</p>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grade.bg} flex items-center justify-center text-white text-3xl font-black shadow-lg mb-2`}>
                        {grade.grade}
                      </div>
                      <p className={`text-xs font-bold ${grade.text}`}>{grade.label}</p>
                    </div>

                    {/* Risk */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Risk Level</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${risk.dot} animate-pulse`}/>
                        <p className="text-lg font-black text-slate-800">{metrics.riskLevel}</p>
                      </div>
                    </div>

                    {/* DI */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <Tip text="Disparate Impact: ratio of lowest to highest group outcome rate. Legal threshold ≥ 0.8 (EEOC 80% rule).">
                          <span className="underline decoration-dotted cursor-help">Disparate Impact</span>
                        </Tip>
                      </p>
                      <p className="text-2xl font-black text-slate-800">
                        {metrics.disparateImpact === 0 ? '0.000' : metrics.disparateImpact.toFixed ? metrics.disparateImpact.toFixed(3) : metrics.disparateImpact}
                      </p>
                      {metrics.disparateImpact === 0 && (
                        <p className="text-[10px] text-red-500 font-semibold mt-0.5">0% positive outcomes in disadvantaged group</p>
                      )}
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
                        <div className={`h-full rounded-full transition-all ${metrics.disparateImpact >= 0.8 ? 'bg-green-400' : metrics.disparateImpact >= 0.6 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.max(Math.min(metrics.disparateImpact * 100, 100), metrics.disparateImpact > 0 ? 4 : 0)}%` }}/>
                      </div>
                    </div>

                    {/* SPD */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <Tip text="Statistical Parity Difference: outcome rate gap between most and least favored groups. Closer to 0 = fairer.">
                          <span className="underline decoration-dotted cursor-help">Parity Diff</span>
                        </Tip>
                      </p>
                      <p className="text-2xl font-black text-slate-800">{Number(metrics.statisticalParityDiff).toFixed(3)}</p>
                      <p className="text-[10px] text-slate-400 mt-1">threshold ≤ 0.1</p>
                    </div>

                    {/* Confidence */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <Tip text="Confidence in this analysis based on dataset size. More rows = higher statistical confidence.">
                          <span className="underline decoration-dotted cursor-help">Confidence</span>
                        </Tip>
                      </p>
                      <p className="text-2xl font-black text-slate-800">{conf.pct}%</p>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
                        <div className={`h-full rounded-full ${conf.color}`} style={{ width: `${conf.pct}%` }}/>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dataset</p>
                      <p className="text-2xl font-black text-slate-800">{metrics.totalRows}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{metrics.groups.length} groups found</p>
                    </div>
                  </div>

                  {/* Selection Rate Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">Selection Rates by Group</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Outcome distribution across <span className="font-semibold text-indigo-600">{metrics.protectedAttribute}</span> attribute</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={exportJSON}
                          className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                          ⬇️ Export JSON
                        </button>
                        <button onClick={() => window.print()}
                          className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 no-print">
                          🖨️ Print PDF
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {metrics.groups.map(group => {
                        const rate   = metrics.positiveRates[group];
                        const isPriv = group === metrics.privilegedGroup;
                        return (
                          <div key={group} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="w-36 shrink-0 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isPriv ? 'bg-indigo-500' : 'bg-rose-400'}`}/>
                              <span className="text-sm font-semibold text-slate-700">{group}</span>
                              {isPriv && <span className="text-[9px] text-indigo-500 bg-indigo-50 rounded px-1.5 py-0.5 font-bold">PRIV</span>}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ${isPriv ? 'bg-gradient-to-r from-indigo-400 to-violet-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`}
                                    style={{ width: `${rate * 100}%` }}/>
                                </div>
                                <span className={`text-sm font-black w-12 text-right ${isPriv ? 'text-indigo-600' : 'text-rose-600'}`}>{(rate * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-slate-700">{metrics.positiveCounts[group]}<span className="text-slate-400 font-normal">/{metrics.distribution[group]}</span></p>
                              <p className="text-[10px] text-slate-400">positive/total</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart */}
                  <BiasChart metrics={metrics} />

                  {/* What-If */}
                  <WhatIfSimulator metrics={metrics} />

                  {/* AI Report */}
                  {report && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                            <span className="text-white text-xs font-black">✦</span>
                          </div>
                          <h3 className="font-semibold text-slate-800">AI Remediation Report</h3>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"/>
                          Generated by Gemini 2.5 Flash
                        </div>
                      </div>

                      <div className="p-6 space-y-5">
                        {[
                          { icon: '📋', title: 'What Bias Was Found?',  content: report.summary },
                          { icon: '🔬', title: 'Why Does It Happen?',   content: report.whyItHappens },
                          { icon: '👥', title: 'Who Is Affected?',      content: report.whoIsAffected },
                        ].map(({ icon, title, content }) => (
                          <div key={title}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-base">{icon}</span>
                              <p className="text-sm font-bold text-slate-700">{title}</p>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed pl-6">{content}</p>
                          </div>
                        ))}

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">🛠️</span>
                            <p className="text-sm font-bold text-slate-700">Step-by-Step Fix Plan</p>
                          </div>
                          <div className="space-y-3 pl-6">
                            {report.fixes?.map((fix, i) => (
                              <div key={i} className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200 rounded-xl p-4 flex gap-3">
                                <span className="text-xs font-black text-white bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">{i+1}</span>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{fix.title}</p>
                                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{fix.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 flex gap-3 ml-0">
                          <span className="text-red-500 text-lg shrink-0">⚡</span>
                          <div>
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Real-World Impact If Unaddressed</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{report.impactStatement}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
