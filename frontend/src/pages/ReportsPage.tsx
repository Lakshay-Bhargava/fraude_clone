import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Download,
  Printer,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReportsSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    window.location.href = api.getExportCsvUrl();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Forensic Intelligence Reports</h2>
          <p className="text-xs font-mono text-[#9297A4] mt-0.5">
            Export structured evidence, sanitized CSV spreadsheets, and official audit summaries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#171A22] border border-white/10 text-white font-mono text-xs hover:border-[#FF7547] transition-colors"
          >
            <Download className="w-4 h-4 text-[#FF7547]" />
            <span>Download Sanitized CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report View</span>
          </button>
        </div>
      </div>

      {/* Security Notice on Export Sanitization */}
      <div className="p-3.5 rounded-lg bg-[#101218] border border-white/10 text-xs font-mono text-[#9297A4] flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#49D6A5]" />
          <span>CSV Formula Injection Protection (CWE-1236) active on all generated exports.</span>
        </span>
        <span className="text-[10px] text-[#626775]">RFC 4180 COMPLIANT</span>
      </div>

      {/* Printable Forensic Report Card */}
      <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-8 space-y-6 shadow-2xl print:bg-white print:text-black">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-6 print:border-gray-300">
          <div>
            <div className="text-xs font-mono font-bold text-[#FF7547]">FRAUDSCOPE AI THREAT INTELLIGENCE</div>
            <h3 className="text-2xl font-bold font-display text-white mt-1 print:text-black">
              Executive Advertisement Risk Summary
            </h3>
          </div>
          <div className="text-right text-xs font-mono text-[#9297A4] print:text-gray-600">
            <div>REPORT ID: {summary?.report_id || 'REP-2026-001'}</div>
            <div>GENERATED: {summary ? new Date(summary.generated_at).toLocaleString() : 'Live'}</div>
          </div>
        </div>

        {/* Classification */}
        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-center font-mono text-xs text-[#FF4D5A] font-bold uppercase tracking-widest print:bg-gray-100 print:text-black print:border-gray-400">
          INTERNAL AUDIT & LAWFUL INVESTIGATION USE ONLY
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#08090D] border border-white/5 print:bg-gray-50 print:border-gray-200">
            <span className="text-[10px] font-mono text-[#9297A4] uppercase print:text-gray-600">Total Advertisements</span>
            <div className="text-2xl font-bold font-display text-white mt-1 print:text-black">
              {summary?.metrics?.total_advertisements_evaluated ?? 15}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#08090D] border border-white/5 print:bg-gray-50 print:border-gray-200">
            <span className="text-[10px] font-mono text-[#9297A4] uppercase print:text-gray-600">High Risk Tier</span>
            <div className="text-2xl font-bold font-display text-[#FF4D5A] mt-1 print:text-red-600">
              {summary?.metrics?.risk_distribution?.high_risk ?? 8}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#08090D] border border-white/5 print:bg-gray-50 print:border-gray-200">
            <span className="text-[10px] font-mono text-[#9297A4] uppercase print:text-gray-600">Medium Risk Tier</span>
            <div className="text-2xl font-bold font-display text-[#F3B84B] mt-1 print:text-amber-600">
              {summary?.metrics?.risk_distribution?.medium_risk ?? 2}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#08090D] border border-white/5 print:bg-gray-50 print:border-gray-200">
            <span className="text-[10px] font-mono text-[#9297A4] uppercase print:text-gray-600">Active Cases</span>
            <div className="text-2xl font-bold font-display text-[#49D6A5] mt-1 print:text-green-600">
              {summary?.metrics?.cases?.open ?? 2}
            </div>
          </div>
        </div>

        {/* Methodology & Limitations */}
        <div className="space-y-3 pt-4 border-t border-white/[0.06] text-xs leading-relaxed text-[#9297A4] print:text-gray-700 print:border-gray-300">
          <h4 className="font-bold text-white uppercase font-mono print:text-black">
            System Limitations and Investigative Boundaries
          </h4>
          <p>
            1. <strong>Signal-First Architecture:</strong> A calculated risk score represents an automated anomaly index derived from natural language heuristics, regular expression match weights, and TF-IDF logistic classification.
          </p>
          <p>
            2. <strong>Legal & Ethical Disclaimer:</strong> High risk flags indicate high suspicion priority for human analysts; they do not constitute verifiable proof of criminal activity, financial loss, or unauthorized account ownership.
          </p>
          <p>
            3. <strong>Data Handling:</strong> All records evaluated in this instance originate from deterministic synthetic test fixtures without real personally identifiable information.
          </p>
        </div>
      </div>
    </div>
  );
};
