'use client';
import { useState } from 'react';

function getRiskLevel(di) {
  if (di >= 0.8) return 'LOW';
  if (di >= 0.6) return 'MEDIUM';
  return 'HIGH';
}

const RISK_STYLES = {
  LOW:    'bg-green-100 text-green-700 border-green-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH:   'bg-red-100 text-red-700 border-red-200',
};

export default function WhatIfSimulator({ metrics }) {
  const unprivGroup = metrics.unprivilegedGroup;
  const privGroup = metrics.privilegedGroup;

  const totalUnpriv = metrics.distribution[unprivGroup];
  const currentPositiveUnpriv = metrics.positiveCounts[unprivGroup];
  const privRate = metrics.positiveRates[privGroup];

  const [addPositive, setAddPositive] = useState(0);
  const maxAdd = totalUnpriv - currentPositiveUnpriv;

  const newPositive = currentPositiveUnpriv + addPositive;
  const newRate = newPositive / totalUnpriv;
  const newDI = privRate > 0 ? parseFloat((newRate / privRate).toFixed(3)) : 1;
  const newRisk = getRiskLevel(newDI);
  const currentRisk = metrics.riskLevel;

  const improved = newRisk !== currentRisk;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🧪</span>
        <h3 className="font-semibold text-slate-800">What-If Simulator</h3>
        <span className="ml-auto text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">Interactive</span>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Simulate adding more positive outcomes for the <span className="font-semibold text-rose-600">{unprivGroup}</span> group and see how bias changes in real time.
      </p>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700">
              Add positive outcomes for <span className="text-rose-600">{unprivGroup}</span>
            </label>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">+{addPositive}</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxAdd}
            value={addPositive}
            onChange={e => setAddPositive(+e.target.value)}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Current ({currentPositiveUnpriv} positives)</span>
            <span>Max ({totalUnpriv} positives)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Current DI</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.disparateImpact}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block ${RISK_STYLES[currentRisk]}`}>{currentRisk}</span>
          </div>

          <div className="flex items-center justify-center text-2xl text-slate-300">→</div>

          <div className={`rounded-xl p-4 text-center border-2 transition-all ${improved ? 'border-green-300 bg-green-50' : 'bg-slate-50 border-transparent'}`}>
            <p className="text-xs text-slate-500 mb-1">Projected DI</p>
            <p className="text-2xl font-bold text-slate-800">{Math.min(newDI, 1).toFixed(3)}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block ${RISK_STYLES[newRisk]}`}>{newRisk}</span>
          </div>
        </div>

        {improved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-500 text-lg mt-0.5">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Bias would reduce!</p>
              <p className="text-sm text-green-700 mt-0.5">
                Adding <strong>{addPositive}</strong> positive outcomes for <strong>{unprivGroup}</strong> would shift risk from <strong>{currentRisk}</strong> → <strong>{newRisk}</strong>.
                This means collecting more balanced training data or applying re-sampling techniques.
              </p>
            </div>
          </div>
        )}

        {newDI >= 0.8 && addPositive > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
            🎯 <strong>Fair threshold reached!</strong> At +{addPositive} samples, the model would pass the 80% rule (DI ≥ 0.8).
          </div>
        )}
      </div>
    </div>
  );
}
