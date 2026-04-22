const Papa = require('papaparse');

const POSITIVE_VALUES = new Set(['1', 'true', 'yes', 'True', 'Yes', 'TRUE', 'YES', '1.0']);

function analyzeCSV(buffer, protectedAttribute, outcomeColumn) {
  const csv = buffer.toString('utf-8');
  const { data, errors } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  if (errors.length > 0 && data.length === 0) {
    throw new Error('Invalid CSV file');
  }

  const firstRow = data[0];
  if (!firstRow.hasOwnProperty(protectedAttribute)) {
    throw new Error(`Column "${protectedAttribute}" not found. Available: ${Object.keys(firstRow).join(', ')}`);
  }
  if (!firstRow.hasOwnProperty(outcomeColumn)) {
    throw new Error(`Column "${outcomeColumn}" not found. Available: ${Object.keys(firstRow).join(', ')}`);
  }

  const groups = [...new Set(data.map(r => r[protectedAttribute]).filter(Boolean))];

  const distribution = {};
  const positiveRates = {};
  const positiveCounts = {};

  groups.forEach(group => {
    const rows = data.filter(r => r[protectedAttribute] === group);
    const positiveCount = rows.filter(r => POSITIVE_VALUES.has(String(r[outcomeColumn]).trim())).length;
    distribution[group] = rows.length;
    positiveCounts[group] = positiveCount;
    positiveRates[group] = rows.length > 0 ? parseFloat((positiveCount / rows.length).toFixed(4)) : 0;
  });

  const rates = Object.values(positiveRates);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);

  const disparateImpact = maxRate > 0 ? parseFloat((minRate / maxRate).toFixed(4)) : 1;

  const sorted = Object.entries(positiveRates).sort((a, b) => b[1] - a[1]);
  const statisticalParityDiff = parseFloat((sorted[0][1] - sorted[sorted.length - 1][1]).toFixed(4));

  const privilegedGroup = sorted[0][0];
  const unprivilegedGroup = sorted[sorted.length - 1][0];

  let riskLevel;
  if (disparateImpact >= 0.8) riskLevel = 'LOW';
  else if (disparateImpact >= 0.6) riskLevel = 'MEDIUM';
  else riskLevel = 'HIGH';

  return {
    totalRows: data.length,
    protectedAttribute,
    outcomeColumn,
    groups,
    distribution,
    positiveRates,
    positiveCounts,
    disparateImpact,
    statisticalParityDiff,
    privilegedGroup,
    unprivilegedGroup,
    riskLevel,
  };
}

module.exports = { analyzeCSV };
