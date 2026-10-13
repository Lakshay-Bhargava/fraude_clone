import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Download,
  FileDown,
  Printer,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { generateCaseReportPdf } from '../services/pdfReportGenerator';

interface CaseReport {
  caseId: string;
  adId: string;
  rawId: number;
  title: string;
  originalText: string;
  platform: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  summary: string;
  indicators: string[];
  status: string;
  generatedDate: string;
  analyst: string;
}

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<CaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const fetchReports = () => {
    setLoading(true);
    setErrorMsg(null);
    api.listAds({ limit: 20, sort_by: 'created_at', sort_order: 'desc' })
      .then((res) => {
        const mappedReports: CaseReport[] = res.items.map((item) => {
          // Extract indicators from text or URL
          const text = item.original_text || '';
          const detectedIndicators: string[] = [];

          if (item.submitted_url) {
            detectedIndicators.push(item.submitted_url);
          }

          // Basic extraction from text
          const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
          if (phoneMatch) detectedIndicators.push(phoneMatch[0].trim());

          const upiMatch = text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/);
          if (upiMatch) detectedIndicators.push(upiMatch[0].trim());

          const tgMatch = text.match(/(?:@|t\.me\/)[a-zA-Z0-9_]{4,32}/i);
          if (tgMatch) detectedIndicators.push(tgMatch[0].trim());

          const uniqueIndicators = Array.from(new Set(detectedIndicators));

          return {
            caseId: `CASE-2026-${String(item.id).padStart(4, '0')}`,
            adId: item.custom_id || `AD-${item.id}`,
            rawId: item.id,
            title: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
            originalText: text,
            platform: item.platform_detected || (item as any).platform || 'Unknown',
            riskLevel: ((item.risk_level as any) || 'LOW'),
            riskScore: item.risk_score !== null && item.risk_score !== undefined ? Math.round(item.risk_score) : 0,
            summary: `Automated forensic evaluation for record ${item.custom_id || item.id}. Assessed risk level: ${item.risk_level || 'LOW'} (${item.risk_score ? Math.round(item.risk_score) : 0}/100).`,
            indicators: uniqueIndicators.length > 0 ? uniqueIndicators : ['Text fingerprint stored'],
            status: item.review_status || 'NEW',
            generatedDate: new Date(item.created_at).toLocaleDateString(),
            analyst: 'Analyst Alpha',
          };
        });
        setReports(mappedReports);
      })
      .catch((err: any) => {
        console.error('Failed to load reports', err);
        setErrorMsg(err.message || 'Unable to load investigation reports from backend database.');
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportPdf = (rep: CaseReport) => {
    const success = generateCaseReportPdf(
      {
        id: rep.rawId,
        custom_id: rep.adId,
        original_text: rep.originalText,
        platform_detected: rep.platform,
        risk_score: rep.riskScore,
        risk_level: rep.riskLevel,
        review_status: rep.status,
        created_at: new Date().toISOString(),
        source_type: 'social_media_ad',
      } as any,
      {
        caseId: rep.caseId,
        analystNotes: rep.summary,
      }
    );

    if (success) {
      setDownloadSuccessId(rep.caseId);
      setTimeout(() => setDownloadSuccessId(null), 4000);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.caseId.toLowerCase().includes(search.toLowerCase()) ||
      r.adId.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Case Reports & PDF Export</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] font-semibold">
              Database Records
            </span>
          </div>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Export forensically verified Case Report PDF dossiers for compliance escalation, legal records, and threat sharing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => {
              if (reports.length > 0) handleExportPdf(reports[0]);
            }}
            disabled={reports.length === 0}
            className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-[#6366F1]/20 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Latest Case Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-between text-xs text-[#EF4444] font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchReports}
            className="px-3 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Notification */}
      {downloadSuccessId && (
        <div className="p-3.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-mono text-[#10B981] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Case Report PDF for {downloadSuccessId} generated and downloaded successfully!</span>
        </div>
      )}

      {/* 2. Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#131C2E] border border-[rgba(148,163,184,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Case ID, Ad ID, or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0D182B] border border-[rgba(148,163,184,0.2)] rounded-xl text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-[#94A3B8]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0D182B] border border-[rgba(148,163,184,0.2)] rounded-xl text-xs text-white px-3 py-2 font-mono focus:outline-none focus:border-[#6366F1]"
          >
            <option value="All">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
            <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* 3. Reports List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-[#64748B] space-y-2">
          <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p>Loading database case reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-center text-[#64748B] mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">No reports found</h3>
          <p className="text-xs text-[#94A3B8]">
            No records matched your search query or filter criteria in the current database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((rep) => (
            <div
              key={rep.caseId}
              className="p-5 rounded-2xl bg-[#131C2E] border border-[rgba(148,163,184,0.12)] hover:border-[#6366F1]/40 transition-colors space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-white">{rep.caseId}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18243A] text-[#94A3B8] border border-[rgba(148,163,184,0.15)]">
                      {rep.adId}
                    </span>
                  </div>
                  <h3 className="text-xs font-medium text-[#E5E9F2] line-clamp-2 leading-relaxed">
                    {rep.title}
                  </h3>
                </div>
                <RiskBadge level={rep.riskLevel} score={rep.riskScore} size="sm" />
              </div>

              <div className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.08)] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#94A3B8] font-mono text-[11px]">
                  <span>Platform: {rep.platform}</span>
                  <span>Date: {rep.generatedDate}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rep.indicators.slice(0, 3).map((ind, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#18243A] text-[#22D3EE] font-mono text-[10px] border border-[#22D3EE]/20 truncate max-w-[200px]"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[rgba(148,163,184,0.1)]">
                <StatusBadge status={rep.status} size="sm" />
                <button
                  onClick={() => handleExportPdf(rep)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-[#6366F1]/60"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
