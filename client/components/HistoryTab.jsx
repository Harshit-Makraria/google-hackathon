'use client';

const RISK_STYLES = {
  LOW:    'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH:   'bg-red-100 text-red-700',
};

const GRADE_STYLES = {
  A: 'bg-green-500', B: 'bg-emerald-500', C: 'bg-amber-500', D: 'bg-orange-500', F: 'bg-red-500',
};

function getGrade(di) {
  if (di >= 0.9) return 'A';
  if (di >= 0.8) return 'B';
  if (di >= 0.7) return 'C';
  if (di >= 0.6) return 'D';
  return 'F';
}

export default function HistoryTab({ history, onRestore }) {
  if (history.length === 0) {
    return (
      <div className="max-w-3xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Analysis History</h2>
          <p className="text-slate-500 mt-1">Your recent analyses are saved here automatically.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-slate-500">No analyses yet.</p>
          <p className="text-sm text-slate-400 mt-1">Run your first analysis from the Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Analysis History</h2>
        <p className="text-slate-500 mt-1">{history.length} recent {history.length === 1 ? 'analysis' : 'analyses'} saved.</p>
      </div>

      <div className="space-y-3">
        {history.map((item, i) => {
          const grade = getGrade(item.metrics.disparateImpact);
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${GRADE_STYLES[grade]} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                {grade}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-800 text-sm">
                    <span className="text-indigo-600">{item.metrics.protectedAttribute}</span>
                    {' '}→{' '}
                    <span className="text-slate-600">{item.metrics.outcomeColumn}</span>
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RISK_STYLES[item.metrics.riskLevel]}`}>
                    {item.metrics.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.metrics.totalRows} rows · DI = {item.metrics.disparateImpact} · {item.timestamp}
                </p>
              </div>
              <button
                onClick={() => onRestore(item)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                View
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
