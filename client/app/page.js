'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import BiasChart from '../components/BiasChart';
import WhatIfSimulator from '../components/WhatIfSimulator';
import GlossaryTab from '../components/GlossaryTab';
import HistoryTab from '../components/HistoryTab';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

// ── Constants ──────────────────────────────────────────────────────────────
const SENSITIVE_KEYWORDS = ['gender','sex','race','ethnicity','age','religion','nationality','caste','disability','marital','color','origin','pregnancy'];
const OUTCOME_KEYWORDS   = ['hired','approved','accepted','granted','passed','selected','outcome','result','decision','label','target','class','loan','credit'];

const RISK_CONFIG = {
  HIGH:   { badge: 'bg-red-100 text-red-700 border border-red-200',    dot: 'bg-red-500',   banner: 'bg-red-50 border-red-200',   icon: '🚨' },
  MEDIUM: { badge: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500', banner: 'bg-amber-50 border-amber-200', icon: '⚠️' },
  LOW:    { badge: 'bg-green-100 text-green-700 border border-green-200', dot: 'bg-green-500', banner: 'bg-green-50 border-green-200', icon: '✅' },
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
  if (di >= 0.9) return { grade: 'A', label: 'Excellent', color: 'text-green-600', bg: 'bg-green-500' };
  if (di >= 0.8) return { grade: 'B', label: 'Good',      color: 'text-emerald-600', bg: 'bg-emerald-500' };
  if (di >= 0.7) return { grade: 'C', label: 'Moderate',  color: 'text-amber-600', bg: 'bg-amber-500' };
  if (di >= 0.6) return { grade: 'D', label: 'Poor',      color: 'text-orange-600', bg: 'bg-orange-500' };
  return            { grade: 'F', label: 'Critical',    color: 'text-red-600',    bg: 'bg-red-500' };
}

function Tooltip({ text, children }) {
  return (
    <span className="group relative inline-block cursor-help">
      {children}
      <span className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-slate-800 text-white text-xs p-2.5 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity text-center">
        {text}
      </span>
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
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
    try {
      const saved = JSON.parse(localStorage.getItem('biaslens_history') || '[]');
      setHistory(saved);
    } catch {}
  }, []);

  const parseHeaders = useCallback((text) => {
    const firstLine = text.split('\n')[0];
    const headers = firstLine.split(',').map(h => h.trim().replace(/['"]/g, ''));
    const sensitive = headers.filter(h => SENSITIVE_KEYWORDS.some(k => h.toLowerCase().includes(k)));
    const outcomes  = headers.filter(h => OUTCOME_KEYWORDS.some(k => h.toLowerCase().includes(k)));
    setCsvHeaders(headers);
    setDetected({ sensitive, outcomes });
    if (sensitive.length > 0 && !protectedAttr) setProtectedAttr(sensitive[0]);
    if (outcomes.length > 0 && !outcomeCol) setOutcomeCol(outcomes[0]);
  }, [protectedAttr, outcomeCol]);

  const handleFile = useCallback((f) => {
    if (!f || !f.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFile(f);
    setError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (e) => parseHeaders(e.target.result);
    reader.readAsText(f);
  }, [parseHeaders]);

  const loadSampleData = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const f = new File([blob], 'sample_hiring_data.csv', { type: 'text/csv' });
    setFile(f);
    setError(null);
    setResults(null);
    parseHeaders(SAMPLE_CSV);
  };

  const handleAnalyze = async () => {
    if (!file || !protectedAttr.trim() || !outcomeCol.trim()) {
      setError('Please upload a CSV file and select both column names.');
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
      const res  = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResults(data);

      const entry = { ...data, timestamp: new Date().toLocaleString(), filename: file.name };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('biaslens_history', JSON.stringify(updated));

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const restoreHistory = (item) => {
    setResults(item);
    setActiveTab('dashboard');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const { metrics, report } = results ?? {};
  const risk  = metrics ? RISK_CONFIG[metrics.riskLevel] : null;
  const grade = metrics ? getGrade(metrics.disparateImpact) : null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} historyCount={history.length} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 no-print">
          <div>
            <h1 className="font-semibold text-slate-800 capitalize">{activeTab}</h1>
            <p className="text-xs text-slate-400">AI-powered algorithmic fairness auditing</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-3 py-1 font-medium">
              Powered by Gemini 2.5 Flash
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history'  && <HistoryTab history={history} onRestore={restoreHistory} />}
          {activeTab === 'glossary' && <GlossaryTab />}
          {activeTab === 'dashboard' && (
            <div className="max-w-4xl space-y-6">

              {/* Upload Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Upload & Configure</h2>
                  <button
                    onClick={loadSampleData}
                    className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>✨</span> Try Sample Dataset
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  {/* Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragging ? 'border-indigo-400 bg-indigo-50 drag-active' :
                      file     ? 'border-green-300 bg-green-50' :
                                 'border-slate-200 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div className="text-left">
                          <p className="font-medium text-green-700">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · {csvHeaders.length} columns detected</p>
                        </div>
                        <span className="text-xs text-slate-400 ml-2">Click to replace</span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-2">📂</div>
                        <p className="text-sm font-medium text-slate-600">Drop your CSV here or click to browse</p>
                        <p className="text-xs text-slate-400 mt-1">Max 5MB · CSV format only</p>
                      </div>
                    )}
                  </div>

                  {/* Smart Detection Banner */}
                  {(detected.sensitive.length > 0 || detected.outcomes.length > 0) && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-500">🔍</span>
                        <p className="text-sm font-semibold text-indigo-800">Smart Column Detection</p>
                        <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5">Auto-detected</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detected.sensitive.map(col => (
                          <button key={col} onClick={() => setProtectedAttr(col)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${protectedAttr === col ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>
                            🔒 {col}
                          </button>
                        ))}
                        {detected.outcomes.map(col => (
                          <button key={col} onClick={() => setOutcomeCol(col)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${outcomeCol === col ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                            🎯 {col}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-indigo-600 mt-2">Click a column to select it, or choose manually below.</p>
                    </div>
                  )}

                  {/* Column Selectors */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Protected Attribute
                        <Tooltip text="The sensitive column to audit for bias (e.g. gender, race, age)">
                          <span className="ml-1.5 text-xs text-slate-400 underline decoration-dotted">?</span>
                        </Tooltip>
                      </label>
                      {csvHeaders.length > 0 ? (
                        <select value={protectedAttr} onChange={e => setProtectedAttr(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                          <option value="">Select column...</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      ) : (
                        <input type="text" placeholder='e.g. "gender", "race"' value={protectedAttr} onChange={e => setProtectedAttr(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Outcome Column
                        <Tooltip text="The column representing the decision or label (must be 0/1 or yes/no)">
                          <span className="ml-1.5 text-xs text-slate-400 underline decoration-dotted">?</span>
                        </Tooltip>
                      </label>
                      {csvHeaders.length > 0 ? (
                        <select value={outcomeCol} onChange={e => setOutcomeCol(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                          <option value="">Select column...</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      ) : (
                        <input type="text" placeholder='e.g. "hired", "approved"' value={outcomeCol} onChange={e => setOutcomeCol(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                      <span>⚠️</span> {error}
                    </div>
                  )}

                  <button onClick={handleAnalyze} disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                        Analyzing with Gemini 2.5 Flash...
                      </>
                    ) : '🔍 Analyze for Bias'}
                  </button>
                </div>
              </div>

              {/* Results */}
              {metrics && (
                <div ref={resultsRef} className="space-y-5">

                  {/* Warning Alerts */}
                  {metrics.riskLevel !== 'LOW' && (
                    <div className={`border rounded-xl p-4 ${risk.banner} space-y-2`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{risk.icon}</span>
                        <p className="font-bold text-slate-800">
                          {metrics.riskLevel === 'HIGH' ? 'High Risk of Discrimination Detected' : 'Moderate Bias Detected'}
                        </p>
                      </div>
                      {metrics.riskLevel === 'HIGH' && (
                        <div className="space-y-1 pl-7">
                          <p className="text-sm text-slate-700">🚨 <strong>This model may violate anti-discrimination laws</strong> (EEOC 80% rule)</p>
                          <p className="text-sm text-slate-700">⚠️ Disadvantaged group (<strong>{metrics.unprivilegedGroup}</strong>) receives positive outcomes at only <strong>{(metrics.positiveRates[metrics.unprivilegedGroup] * 100).toFixed(0)}%</strong> of the privileged group's rate</p>
                          <p className="text-sm text-slate-700">📋 Immediate remediation action is strongly recommended before deployment</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score + Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {/* Fairness Grade */}
                    <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fairness Grade</p>
                      <div className={`w-16 h-16 rounded-2xl ${grade.bg} flex items-center justify-center text-white text-3xl font-black mb-2`}>
                        {grade.grade}
                      </div>
                      <p className={`text-sm font-semibold ${grade.color}`}>{grade.label}</p>
                    </div>

                    {/* Risk Level */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Risk Level</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${risk.dot}`} />
                        <p className="text-lg font-bold text-slate-800">{metrics.riskLevel}</p>
                      </div>
                    </div>

                    {/* DI */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Tooltip text="Disparate Impact: ratio of lowest to highest outcome rate. ≥ 0.8 is fair.">
                          <span className="underline decoration-dotted cursor-help">Disparate Impact</span>
                        </Tooltip>
                      </p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{metrics.disparateImpact}</p>
                      <p className="text-xs text-slate-400 mt-1">threshold ≥ 0.8</p>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${metrics.disparateImpact >= 0.8 ? 'bg-green-400' : metrics.disparateImpact >= 0.6 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(metrics.disparateImpact * 100, 100)}%` }} />
                      </div>
                    </div>

                    {/* SPD */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Tooltip text="Statistical Parity Difference: outcome rate gap between groups. Closer to 0 is fairer.">
                          <span className="underline decoration-dotted cursor-help">Parity Diff</span>
                        </Tooltip>
                      </p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{metrics.statisticalParityDiff}</p>
                      <p className="text-xs text-slate-400 mt-1">threshold ≤ 0.1</p>
                    </div>

                    {/* Rows */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Dataset</p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{metrics.totalRows.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-1">{metrics.groups.length} groups</p>
                    </div>
                  </div>

                  {/* Selection Rate Table */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-800">Group Selection Rates</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Outcome distribution across <span className="font-medium text-indigo-600">{metrics.protectedAttribute}</span> groups</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {metrics.groups.map(group => {
                        const rate = metrics.positiveRates[group];
                        const isPriv = group === metrics.privilegedGroup;
                        return (
                          <div key={group} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-32 shrink-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isPriv ? 'bg-indigo-500' : 'bg-rose-400'}`} />
                                <span className="text-sm font-medium text-slate-700">{group}</span>
                                {isPriv && <span className="text-xs text-indigo-500 bg-indigo-50 rounded px-1">privileged</span>}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${isPriv ? 'bg-indigo-500' : 'bg-rose-400'}`}
                                    style={{ width: `${rate * 100}%` }} />
                                </div>
                                <span className={`text-sm font-bold w-12 text-right ${isPriv ? 'text-indigo-600' : 'text-rose-600'}`}>
                                  {(rate * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm text-slate-600">{metrics.positiveCounts[group]}/{metrics.distribution[group]}</p>
                              <p className="text-xs text-slate-400">positive / total</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <BiasChart metrics={metrics} />

                  {/* What-If Simulator */}
                  <WhatIfSimulator metrics={metrics} />

                  {/* AI Report */}
                  {report && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-500">✦</span>
                          <h3 className="font-semibold text-slate-800">AI Remediation Report</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Gemini 2.5 Flash</span>
                          <button onClick={handlePrint}
                            className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 no-print">
                            🖨️ Print / Save PDF
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        <ReportSection icon="📋" title="What Bias Was Found?" content={report.summary} />
                        <ReportSection icon="🔍" title="Why Does It Happen?" content={report.whyItHappens} />
                        <ReportSection icon="👥" title="Who Is Affected?" content={report.whoIsAffected} />

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span>🛠️</span>
                            <p className="text-sm font-semibold text-slate-700">Actionable Fix Plan</p>
                          </div>
                          <div className="space-y-3">
                            {report.fixes?.map((fix, i) => (
                              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{fix.title}</p>
                                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{fix.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                          <span className="text-red-500 text-lg shrink-0">⚡</span>
                          <div>
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Real-World Impact If Unaddressed</p>
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

function ReportSection({ icon, title, content }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pl-6">{content}</p>
    </div>
  );
}
