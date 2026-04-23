'use client';

const NAV = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/></svg>,
  },
  {
    id: 'sample', label: 'Sample Dataset',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z"/></svg>,
  },
  {
    id: 'sft', label: 'SFT Auditor',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  },
  {
    id: 'history', label: 'History',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    id: 'glossary', label: 'Glossary',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
  },
];

export default function Sidebar({ activeTab, setActiveTab, historyCount }) {
  return (
    <aside className="w-60 bg-[#0a0f1e] flex flex-col h-screen sticky top-0 shrink-0 no-print">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-black text-sm">B</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none tracking-wide">BiasLens</p>
            <p className="text-xs text-slate-500 mt-0.5">Fairness Auditor</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
        {NAV.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}>
              <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
              {item.label}
              {item.id === 'history' && historyCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-slate-700 text-slate-300 rounded-full px-1.5 py-0.5">{historyCount}</span>
              )}
              {item.id === 'sample' && (
                <span className="ml-auto text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-full px-1.5 py-0.5">NEW</span>
              )}
              {item.id === 'sft' && (
                <span className="ml-auto text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 rounded-full px-1.5 py-0.5">LLM</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Gemini Badge */}
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 flex items-center justify-center">
              <span className="text-white text-[8px] font-black">G</span>
            </div>
            <span className="text-xs font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Powered by Gemini
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Gemini 2.5 Flash · Google AI Studio
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">Model active</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 border-t border-white/5 pt-3">
        <p className="text-[10px] text-slate-600 text-center">Google Solution Challenge 2026</p>
      </div>
    </aside>
  );
}
