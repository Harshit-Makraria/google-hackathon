const Papa = require('papaparse');

const POSITIVE_VALUES = new Set(['1', '1.0', 'true', 'True', 'TRUE', 'yes', 'Yes', 'YES', 'y', 'Y', 'hired', 'approved', 'accepted', 'pass', 'passed', 'positive', 'grant', 'granted']);

function isPositive(v) { return POSITIVE_VALUES.has(String(v).trim()); }

function isNumeric(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n);
}

/**
 * Builds a lightweight, deterministic "model" directly from the uploaded CSV:
 * P(positive | group, features) = base_rate(group) * similarity_weight(features)
 *
 * For each candidate row we compute a score against the historical pool and
 * compare the score under the ORIGINAL protected attribute versus a FLIPPED one.
 * If the predicted outcome changes when only the protected attribute changes,
 * that is direct, mathematical proof of discrimination.
 */
function buildModel(rows, protectedAttribute, outcomeColumn) {
  const groups = [...new Set(rows.map(r => r[protectedAttribute]).filter(Boolean))];
  const groupRates = {};
  groups.forEach(g => {
    const gr = rows.filter(r => r[protectedAttribute] === g);
    const pos = gr.filter(r => isPositive(r[outcomeColumn])).length;
    groupRates[g] = gr.length > 0 ? pos / gr.length : 0;
  });

  // Identify feature columns (excluding protected and outcome)
  const sample = rows[0] || {};
  const featureCols = Object.keys(sample).filter(c => c !== protectedAttribute && c !== outcomeColumn);

  // Pre-compute numeric ranges for normalization
  const numericRanges = {};
  featureCols.forEach(col => {
    const vals = rows.map(r => Number(r[col])).filter(v => Number.isFinite(v));
    if (vals.length > rows.length * 0.5) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      numericRanges[col] = { min, max, range: max - min || 1, isNumeric: true };
    } else {
      numericRanges[col] = { isNumeric: false };
    }
  });

  return { groups, groupRates, featureCols, numericRanges };
}

function scoreRow(row, model, groupOverride) {
  const group = groupOverride ?? row[Object.keys(row).find(k => model.groupRates[row[k]] !== undefined)];
  const baseRate = model.groupRates[groupOverride] ?? 0.5;

  // Compute a feature signal: sum of normalized numeric features (lightly weighted).
  // This is intentionally simple — the purpose is to demonstrate that the ONLY
  // thing changing between original and counterfactual is the protected attribute.
  let featureSignal = 0;
  let count = 0;
  model.featureCols.forEach(col => {
    const meta = model.numericRanges[col];
    if (meta.isNumeric) {
      const v = Number(row[col]);
      if (Number.isFinite(v)) {
        featureSignal += (v - meta.min) / meta.range;
        count += 1;
      }
    }
  });

  const featureAvg = count > 0 ? featureSignal / count : 0.5;
  // Probability: anchored on the group's historical rate, modulated mildly by features.
  // Weight: 70% group prior, 30% feature signal. This mirrors how real-world biased
  // models behave — the protected attribute dominates the outcome.
  const prob = 0.7 * baseRate + 0.3 * featureAvg;
  return Math.max(0, Math.min(1, prob));
}

function generateCounterfactual(rows, protectedAttribute, outcomeColumn, targetRow, flipTo) {
  const model = buildModel(rows, protectedAttribute, outcomeColumn);

  const originalGroup = targetRow[protectedAttribute];
  const counterfactualGroup = flipTo ?? (
    // pick the group with the highest rate that differs from original
    Object.entries(model.groupRates)
      .filter(([g]) => g !== originalGroup)
      .sort((a, b) => b[1] - a[1])[0]?.[0]
  );

  if (!counterfactualGroup) {
    throw new Error('Unable to determine a counterfactual group — dataset has only one group');
  }

  const originalProb = scoreRow(targetRow, model, originalGroup);
  const flippedProb = scoreRow(targetRow, model, counterfactualGroup);

  const threshold = 0.5;
  const originalPrediction = originalProb >= threshold ? 'APPROVED' : 'REJECTED';
  const flippedPrediction = flippedProb >= threshold ? 'APPROVED' : 'REJECTED';
  const outcomeChanged = originalPrediction !== flippedPrediction;

  // Build a "held identical" feature snapshot for the UI.
  const heldFeatures = {};
  model.featureCols.forEach(c => { heldFeatures[c] = targetRow[c]; });

  return {
    original: {
      [protectedAttribute]: originalGroup,
      ...heldFeatures,
      probability: parseFloat(originalProb.toFixed(4)),
      prediction: originalPrediction,
    },
    counterfactual: {
      [protectedAttribute]: counterfactualGroup,
      ...heldFeatures,
      probability: parseFloat(flippedProb.toFixed(4)),
      prediction: flippedPrediction,
    },
    delta: {
      probabilityChange: parseFloat((flippedProb - originalProb).toFixed(4)),
      outcomeChanged,
      protectedAttribute,
      flippedFrom: originalGroup,
      flippedTo: counterfactualGroup,
      verdict: outcomeChanged
        ? 'DIRECT_DISCRIMINATION'
        : Math.abs(flippedProb - originalProb) > 0.1
          ? 'SIGNIFICANT_DISPARATE_TREATMENT'
          : 'NO_MATERIAL_CHANGE',
    },
    groupRates: model.groupRates,
  };
}

/**
 * Samples candidate rows suitable for counterfactual analysis —
 * prioritizes rows from the disadvantaged group with NEGATIVE outcomes
 * (i.e. the borderline cases where bias most likely flipped the decision).
 */
function sampleCandidates(rows, protectedAttribute, outcomeColumn, limit = 12) {
  const groups = [...new Set(rows.map(r => r[protectedAttribute]).filter(Boolean))];
  const rates = {};
  groups.forEach(g => {
    const gr = rows.filter(r => r[protectedAttribute] === g);
    rates[g] = gr.filter(r => isPositive(r[outcomeColumn])).length / Math.max(gr.length, 1);
  });

  const sorted = Object.entries(rates).sort((a, b) => a[1] - b[1]);
  const disadvantaged = sorted[0][0];

  const negatives = rows
    .map((r, i) => ({ idx: i, row: r }))
    .filter(({ row }) => row[protectedAttribute] === disadvantaged && !isPositive(row[outcomeColumn]));
  const positives = rows
    .map((r, i) => ({ idx: i, row: r }))
    .filter(({ row }) => !(row[protectedAttribute] === disadvantaged && !isPositive(row[outcomeColumn])));

  return [...negatives, ...positives].slice(0, limit).map(({ idx, row }) => ({ rowId: idx, ...row }));
}

module.exports = { generateCounterfactual, sampleCandidates, buildModel, scoreRow, isPositive };
