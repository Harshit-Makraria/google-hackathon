'use client';

const TERMS = [
  {
    term: 'Disparate Impact (DI)',
    formula: 'min_group_rate / max_group_rate',
    description: 'Measures whether a policy, procedure, or practice has a disproportionately negative effect on a protected class. A DI below 0.8 is considered discriminatory under the "80% rule" (EEOC guidelines).',
    example: 'DI = 0.2 means the disadvantaged group is hired at 20% the rate of the privileged group.',
    color: 'indigo',
  },
  {
    term: 'Statistical Parity Difference (SPD)',
    formula: 'P(outcome=1 | privileged) − P(outcome=1 | unprivileged)',
    description: 'The difference in positive outcome rates between the most and least favored groups. A value of 0 indicates perfect fairness. Values above 0.1 are generally considered concerning.',
    example: 'SPD = 0.8 means there is an 80% gap in outcome rates between groups.',
    color: 'violet',
  },
  {
    term: 'Privileged Group',
    formula: null,
    description: 'The demographic group that receives the highest positive outcome rate in the dataset. This does not imply moral judgment — it is a statistical observation.',
    example: '"Male" applicants being hired at 100% makes them the privileged group.',
    color: 'blue',
  },
  {
    term: 'Selection Rate',
    formula: 'positive_outcomes / total_in_group',
    description: 'The proportion of individuals in each group who receive a positive outcome. Comparing selection rates across groups reveals the magnitude of bias.',
    example: 'Female selection rate = 20% vs Male selection rate = 100%.',
    color: 'teal',
  },
  {
    term: 'The 80% Rule',
    formula: 'DI ≥ 0.8',
    description: 'A legal guideline from the U.S. Equal Employment Opportunity Commission (EEOC). A selection rate for a protected group that is less than 80% (or 4/5) of the highest group\'s rate is considered evidence of adverse impact.',
    example: 'If the majority group is hired at 50%, the minority group must be hired at ≥ 40% to pass.',
    color: 'amber',
  },
  {
    term: 'Protected Attribute',
    formula: null,
    description: 'A characteristic of individuals that legally cannot be used as the basis for decisions in employment, lending, housing, etc. Common examples include gender, race, age, religion, and national origin.',
    example: 'Gender, Race, Age, Disability Status.',
    color: 'rose',
  },
];

const COLOR_MAP = {
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
};

export default function GlossaryTab() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Fairness Glossary</h2>
        <p className="text-slate-500 mt-1">Key terms and metrics used in algorithmic fairness auditing.</p>
      </div>

      <div className="space-y-4">
        {TERMS.map(({ term, formula, description, example, color }) => (
          <div key={term} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-semibold text-slate-800">{term}</h3>
              {formula && (
                <code className={`text-xs px-2.5 py-1 rounded-lg border font-mono shrink-0 ${COLOR_MAP[color]}`}>
                  {formula}
                </code>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{description}</p>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-slate-500">Example: </span>
              <span className="text-xs text-slate-600">{example}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
