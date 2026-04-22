'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-indigo-600">Outcome Rate: <strong>{payload[0].value}%</strong></p>
      </div>
    );
  }
  return null;
};

export default function BiasChart({ metrics }) {
  const data = metrics.groups.map(group => ({
    group: group.charAt(0).toUpperCase() + group.slice(1),
    rate: parseFloat((metrics.positiveRates[group] * 100).toFixed(1)),
    count: metrics.distribution[group],
    isPrivileged: group === metrics.privilegedGroup,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-800">Outcome Rate by Group</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Positive outcome (%) per <span className="font-medium text-indigo-600">{metrics.protectedAttribute}</span> group
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />Privileged</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" />Disadvantaged</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="group" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={80}>
            <LabelList dataKey="rate" position="top" formatter={v => `${v}%`} style={{ fontSize: 12, fontWeight: 600, fill: '#475569' }} />
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.isPrivileged ? '#6366f1' : '#fb7185'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.map(d => (
          <div key={d.group} className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">{d.group}</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{d.count}</p>
            <p className="text-xs text-slate-400">samples</p>
          </div>
        ))}
      </div>
    </div>
  );
}
