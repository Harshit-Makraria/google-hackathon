'use client';
import { useState } from 'react';

// Maps each risk condition to regulatory frameworks. This is what turns raw bias
// findings into a defensible audit trail a compliance officer can hand to a regulator.
const FRAMEWORK_MAPPINGS = {
  HIGH: [
    { framework: 'EU AI Act (Reg. 2024/1689)',     article: 'Art. 9–15',   classification: 'High-Risk AI System',           requirement: 'Mandatory risk management, data governance, and human oversight before deployment.' },
    { framework: 'US EEOC — Uniform Guidelines',   article: '29 CFR §1607.4(D)', classification: '80% Rule Violation',      requirement: 'Selection rate below 80% of highest group constitutes adverse impact. Remediation required.' },
    { framework: 'NIST AI RMF 1.0',                article: 'MAP 5.1 / MEASURE 2.11', classification: 'Unacceptable bias risk', requirement: 'Document harms, retrain, and implement ongoing fairness monitoring.' },
    { framework: 'ISO/IEC 42001:2023',              article: 'Clause 6.1.2', classification: 'AI risk action required',      requirement: 'Organization must update AI Management System with concrete mitigation actions.' },
    { framework: 'OECD AI Principles',             article: 'Principle 1.2', classification: 'Human-centred values violation', requirement: 'Deploying without remediation violates fairness and non-discrimination principle.' },
  ],
  MEDIUM: [
    { framework: 'EU AI Act (Reg. 2024/1689)',     article: 'Art. 10',     classification: 'Data Quality Obligation',       requirement: 'Training datasets must be relevant, representative, and free of errors. Review required.' },
    { framework: 'NIST AI RMF 1.0',                article: 'MEASURE 2.11', classification: 'Fairness measurement concern',  requirement: 'Implement ongoing bias tracking and consider remediation before scaling.' },
    { framework: 'ISO/IEC 42001:2023',              article: 'Clause 8.3',  classification: 'Monitoring recommended',        requirement: 'Increase monitoring frequency and document rationale for continued operation.' },
  ],
  LOW: [
    { framework: 'EU AI Act (Reg. 2024/1689)',     article: 'Art. 72',     classification: 'Post-market monitoring',        requirement: 'Maintain post-market monitoring plan and log fairness metrics periodically.' },
    { framework: 'NIST AI RMF 1.0',                article: 'GOVERN 1.4',  classification: 'Standard governance',           requirement: 'Continue regular fairness audits as part of governance cadence.' },
  ],
};

export default function ComplianceExport({ results, sftAudit }) {
  const [generating, setGenerating] = useState(false);

  const exportAIA = async () => {
    if (!results?.metrics) return;
    setGenerating(true);

    try {
      // Dynamic import — keeps these heavy libs out of the initial bundle.
      const { default: jsPDF } = await import('jspdf');
      const autoTableMod       = await import('jspdf-autotable');
      const autoTable          = autoTableMod.default || autoTableMod.autoTable;

      const { metrics, report } = results;
      const mappings  = FRAMEWORK_MAPPINGS[metrics.riskLevel] || FRAMEWORK_MAPPINGS.LOW;

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 48;

      // ---- Header block ----
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, pageW, 110, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Algorithmic Impact Assessment', 40, 48);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Formal bias audit under EU AI Act, NIST AI RMF, and EEOC Uniform Guidelines', 40, 68);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 220);
      doc.text(`Generated ${new Date().toLocaleString()}  ·  Powered by BiasLens + Gemini 2.5 Flash`, 40, 90);

      y = 140;
      doc.setTextColor(20, 20, 30);

      // ---- Executive Summary ----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('1. Executive Summary', 40, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const execSummary = doc.splitTextToSize(
        report?.summary || `Automated fairness audit of a model targeting the "${metrics.outcomeColumn}" outcome across the protected attribute "${metrics.protectedAttribute}" was performed on ${metrics.totalRows} records.`,
        pageW - 80
      );
      doc.text(execSummary, 40, y);
      y += execSummary.length * 13 + 16;

      // ---- Classification box ----
      const riskColor = metrics.riskLevel === 'HIGH' ? [220, 38, 38] : metrics.riskLevel === 'MEDIUM' ? [217, 119, 6] : [5, 150, 105];
      doc.setFillColor(...riskColor);
      doc.roundedRect(40, y, pageW - 80, 52, 6, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`RISK CLASSIFICATION: ${metrics.riskLevel}`, 54, y + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Disparate Impact: ${metrics.disparateImpact}  |  SPD: ${metrics.statisticalParityDiff}  |  Privileged: ${metrics.privilegedGroup}  |  Disadvantaged: ${metrics.unprivilegedGroup}`, 54, y + 38);
      doc.setTextColor(20, 20, 30);
      y += 72;

      // ---- Fairness Metrics Table ----
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value', 'Threshold', 'Status']],
        body: [
          ['Disparate Impact (DI)', String(metrics.disparateImpact), '≥ 0.80', metrics.disparateImpact >= 0.8 ? 'PASS' : 'FAIL'],
          ['Statistical Parity Diff.', String(metrics.statisticalParityDiff), '≤ 0.10', Math.abs(metrics.statisticalParityDiff) <= 0.1 ? 'PASS' : 'FAIL'],
          ['Total Records', String(metrics.totalRows), '≥ 30', metrics.totalRows >= 30 ? 'PASS' : 'LOW CONFIDENCE'],
          ['Groups Evaluated', String(metrics.groups.length), '≥ 2', metrics.groups.length >= 2 ? 'PASS' : 'FAIL'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 24;

      // ---- Group Selection Rate Table ----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('2. Group Selection Rates', 40, y);
      y += 10;
      autoTable(doc, {
        startY: y,
        head: [['Group', 'Positive', 'Total', 'Selection Rate', 'Role']],
        body: metrics.groups.map(g => [
          g,
          String(metrics.positiveCounts[g]),
          String(metrics.distribution[g]),
          `${(metrics.positiveRates[g] * 100).toFixed(1)}%`,
          g === metrics.privilegedGroup ? 'Privileged' : g === metrics.unprivilegedGroup ? 'Disadvantaged' : 'Reference',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 24;

      // ---- Regulatory Mapping ----
      if (y > 640) { doc.addPage(); y = 48; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('3. Regulatory Compliance Mapping', 40, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 110);
      doc.text('Findings mapped to international AI fairness frameworks', 40, y + 12);
      doc.setTextColor(20, 20, 30);
      y += 22;

      autoTable(doc, {
        startY: y,
        head: [['Framework', 'Article / Clause', 'Classification', 'Required Action']],
        body: mappings.map(m => [m.framework, m.article, m.classification, m.requirement]),
        theme: 'striped',
        headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 8, cellPadding: 6 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120 }, 1: { cellWidth: 75 }, 2: { cellWidth: 95 } },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 24;

      // ---- AI Remediation Plan ----
      if (report?.fixes?.length) {
        if (y > 620) { doc.addPage(); y = 48; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('4. Remediation Plan (Gemini-Generated)', 40, y);
        y += 18;
        report.fixes.forEach((fix, i) => {
          if (y > 760) { doc.addPage(); y = 48; }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(79, 70, 229);
          doc.text(`${i + 1}. ${fix.title}`, 40, y);
          y += 14;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 50);
          const desc = doc.splitTextToSize(fix.description, pageW - 80);
          doc.text(desc, 40, y);
          y += desc.length * 12 + 10;
        });
      }

      // ---- Root Cause / Who is affected ----
      if (report?.whyItHappens || report?.whoIsAffected) {
        if (y > 680) { doc.addPage(); y = 48; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('5. Root Cause & Affected Populations', 40, y);
        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 50);
        if (report.whyItHappens) {
          doc.setFont('helvetica', 'bold'); doc.text('Why this bias exists:', 40, y); y += 12;
          doc.setFont('helvetica', 'normal');
          const w = doc.splitTextToSize(report.whyItHappens, pageW - 80);
          doc.text(w, 40, y); y += w.length * 12 + 10;
        }
        if (report.whoIsAffected) {
          doc.setFont('helvetica', 'bold'); doc.text('Populations at risk:', 40, y); y += 12;
          doc.setFont('helvetica', 'normal');
          const w = doc.splitTextToSize(report.whoIsAffected, pageW - 80);
          doc.text(w, 40, y); y += w.length * 12 + 10;
        }
        if (report.impactStatement) {
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(40, y, pageW - 80, 44, 4, 4, 'F');
          doc.setTextColor(153, 27, 27);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('REAL-WORLD IMPACT IF UNADDRESSED:', 52, y + 14);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const w = doc.splitTextToSize(report.impactStatement, pageW - 104);
          doc.text(w, 52, y + 28);
          y += 56;
          doc.setTextColor(20, 20, 30);
        }
      }

      // ---- SFT Audit Section ----
      if (sftAudit) {
        if (y > 640) { doc.addPage(); y = 48; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('6. SFT Fine-Tuning Dataset Audit', 40, y);
        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text(`Scanned ${sftAudit.scannedLines} of ${sftAudit.totalLines} instruction/response pairs. Toxicity Score: ${sftAudit.toxicityScore}%. Risk: ${sftAudit.riskLevel}.`, 40, y);
        y += 16;
        if (Object.keys(sftAudit.byCategory || {}).length) {
          autoTable(doc, {
            startY: y,
            head: [['Bias Category', 'Occurrences']],
            body: Object.entries(sftAudit.byCategory).map(([k, v]) => [k.replace(/_/g, ' '), String(v)]),
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
            bodyStyles: { fontSize: 9 },
            margin: { left: 40, right: 40 },
          });
          y = doc.lastAutoTable.finalY + 16;
        }
      }

      // ---- Attestation ----
      if (y > 700) { doc.addPage(); y = 48; }
      y += 10;
      doc.setDrawColor(200);
      doc.line(40, y, pageW - 40, y);
      y += 16;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Attestation', 40, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 70);
      const attest = doc.splitTextToSize(
        'This Algorithmic Impact Assessment was generated automatically by BiasLens using statistical fairness tests (Disparate Impact, Statistical Parity Difference) and Google Gemini 2.5 Flash for remediation analysis. The findings are offered as a structured starting point for formal compliance review and should be validated by a qualified fairness auditor or legal counsel before submission to a regulator.',
        pageW - 80
      );
      doc.text(attest, 40, y);

      // ---- Footer on every page ----
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 150);
        doc.text(`BiasLens Algorithmic Impact Assessment  ·  Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
      }

      const ts = new Date().toISOString().split('T')[0];
      doc.save(`Algorithmic_Impact_Assessment_${ts}.pdf`);

      // Log to localStorage for audit trail
      try {
        const log = JSON.parse(localStorage.getItem('biaslens_aia_log') || '[]');
        log.unshift({ timestamp: new Date().toISOString(), riskLevel: metrics.riskLevel, disparateImpact: metrics.disparateImpact, protectedAttribute: metrics.protectedAttribute });
        localStorage.setItem('biaslens_aia_log', JSON.stringify(log.slice(0, 25)));
      } catch {}
    } catch (err) {
      console.error('[AIA export]', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 rounded-2xl shadow-lg shadow-indigo-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20">
            <span className="text-2xl">🏛️</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white">Algorithmic Impact Assessment</h3>
              <span className="text-[9px] font-bold bg-white/20 text-white rounded-full px-2 py-0.5 border border-white/30">ENTERPRISE · BETA</span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed mb-3">
              Auto-generate a board-ready, regulator-ready PDF mapping your findings to the <strong>EU AI Act</strong>, <strong>EEOC Uniform Guidelines</strong>, <strong>NIST AI RMF</strong>, and <strong>ISO/IEC 42001</strong>. Turns raw statistics into a defensible compliance audit trail.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={exportAIA} disabled={generating || !results}
                className="bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl shadow hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    Building PDF…
                  </>
                ) : (
                  <>📄 Export AIA as PDF</>
                )}
              </button>
              <div className="flex items-center gap-1 text-[11px] text-white/70 flex-wrap">
                <span className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5">EU AI Act</span>
                <span className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5">EEOC</span>
                <span className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5">NIST AI RMF</span>
                <span className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5">ISO/IEC 42001</span>
                <span className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5">OECD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
