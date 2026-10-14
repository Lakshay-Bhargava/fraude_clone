import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Save,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  CheckCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Network,
  Printer,
  ListChecks,
  Phone,
  MessageSquare,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementDetail } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { generateCaseReportPdf } from '../services/pdfReportGenerator';

// Helper to translate technical evidence categories to human-friendly labels
const categoryTitles: Record<string, string> = {
  ACCOUNT_TAKEOVER: 'Unauthorized Account Sale / KYC Bypass',
  CARD_FRAUD: 'Cloned or Pre-loaded Payment Card Offer',
  PHISHING: 'Credential Harvesting & Sensitive Data Request',
  MONEY_LAUNDERING: 'Money Mule Recruitment & Wire Laundering',
  ADVANCE_FEE: 'Advance-Fee Loan or Investment Scheme',
  SOCIAL_ENGINEERING: 'Urgency & Pressure Tactics',
  OFFSHORE_CONTACT: 'Untraceable Communication Channel',
};

export const InvestigationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<AdvertisementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Status updating state
  const [selectedStatus, setSelectedStatus] = useState<string>('NEEDS_REVIEW');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Collapsible advanced details
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Copy notification state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const loadRecord = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getAdDetail(id);
      setRecord(data);
      setSelectedStatus(data.review_status);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load investigation record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setSavingStatus(true);
    setSaveSuccess(false);

    try {
      await api.updateAdStatus(record.id, selectedStatus, dispositionNotes, 'Analyst Alpha');
      setSaveSuccess(true);
      await loadRecord();
    } catch (err: any) {
      alert(err.message || 'Failed to update investigation status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(identifier);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Helper to highlight triggered phrases in original text
  const renderHighlightedText = () => {
    if (!record) return null;
    const text = record.original_text;
    const phrases = record.analysis?.suspicious_phrases || [];

    if (phrases.length === 0) {
      return <span>{text}</span>;
    }

    const escaped = phrases
      .filter((p) => p.trim().length > 0)
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    if (!escaped) return <span>{text}</span>;

    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className="leading-relaxed">
        {parts.map((part, index) => {
          const isMatch = phrases.some((p) => p.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <mark
                key={index}
                className="bg-[#FF5964]/25 text-white px-1.5 py-0.5 rounded font-semibold border border-[#FF5964]/50"
                title="Flagged suspicious phrase"
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-[#748197] space-y-3">
        <div className="w-6 h-6 border-2 border-[#FF7547] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading investigation details...</p>
      </div>
    );
  }

  if (errorMsg || !record) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto floating-card">
        <p className="text-[#FF5964] text-xs font-mono">{errorMsg || 'Investigation record not found'}</p>
        <Link to="/investigations" className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Investigations</span>
        </Link>
      </div>
    );
  }

  const riskScore = record.analysis?.risk_score ?? 0;
  const riskLevel = record.analysis?.risk_level ?? 'LOW';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* SECTION A: HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(185,200,220,0.1)]">
        <div className="flex items-center gap-3">
          <Link
            to="/investigations"
            className="p-2.5 rounded-xl bg-[#141C2B] border border-[rgba(185,200,220,0.12)] text-[#9BA7B8] hover:text-white transition-colors"
            title="Back to Investigations Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#748197]">
              <Link to="/investigations" className="hover:text-white">Investigations</Link>
              <span>/</span>
              <span className="text-[#FF7547] font-semibold">
                {record.custom_id || `AD-${record.id}`}
              </span>
              <StatusBadge status={record.review_status} size="sm" />
              {record.is_demo || record.data_source === 'SYNTHETIC_DATASET' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  DEMO BENCHMARK DATA
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  LIVE USER SCAN
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
              Evidence & Risk Dossier
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (record) {
                generateCaseReportPdf(record, {
                  analystNotes: dispositionNotes || 'Official FraudScope AI forensic dossier review complete.',
                });
              }
            }}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-md shadow-[#6366F1]/20"
            title="Download Case Report PDF"
          >
            <span>Generate Case Report (PDF)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Print dossier summary"
          >
            <Printer className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="hidden sm:inline">Print Record</span>
          </button>
          <RiskBadge level={riskLevel} score={riskScore} size="lg" />
        </div>
      </div>

      {/* SYNTHETIC DEMO RECORD DISCLAIMER BANNER */}
      {(record.is_demo || record.data_source === 'SYNTHETIC_DATASET') && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-200 font-mono">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong>DEMO / SYNTHETIC DATASET RECORD:</strong> This record was imported from the Indian social media financial ad benchmark dataset for research and model evaluation. It does not represent a live real-world law enforcement incident.
          </span>
        </div>
      )}

      {/* SECTION B: PROMINENT RISK OVERVIEW CARD */}
      <div className="floating-card-elevated space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(185,200,220,0.1)] pb-3">
          <div>
            <span className="text-xs font-mono uppercase text-[#9BA7B8]">Risk Assessment Overview</span>
            <h3 className="text-lg font-bold font-display text-white">
              Composite Risk Score: {Math.round(riskScore)} / 100
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9BA7B8]">Status:</span>
            <StatusBadge status={record.review_status} size="sm" />
          </div>
        </div>

        {/* Visual score bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-[#0E1522] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                riskLevel === 'HIGH'
                  ? 'bg-[#FF5964]'
                  : riskLevel === 'MEDIUM'
                  ? 'bg-[#F4BC52]'
                  : 'bg-[#45D6A3]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-[#748197]">
            <span>Low Risk (0–34)</span>
            <span>Medium Risk (35–64)</span>
            <span>High Risk (65–100)</span>
          </div>
        </div>

        {/* High-level summary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.08)]">
            <span className="text-[11px] font-mono text-[#748197] block">Detected Warning Signs</span>
            <span className="text-base font-bold font-display text-white">
              {record.evidence_items.length} items flagged
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.08)]">
            <span className="text-[11px] font-mono text-[#748197] block">Contact Identifiers Found</span>
            <span className="text-base font-bold font-display text-white">
              {record.entities.length} handles / numbers
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.08)]">
            <span className="text-[11px] font-mono text-[#748197] block">Related Campaign Ads</span>
            <span className="text-base font-bold font-display text-white">
              {record.related_ads.length} linked records
            </span>
          </div>
        </div>

        {/* Plain-Language Explanation */}
        {record.analysis && (
          <div className="p-4 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.1)] space-y-1.5">
            <h4 className="text-xs font-semibold text-[#FF7547] uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Analyst Explanation</span>
            </h4>
            <p className="text-xs sm:text-sm text-[#F4F6FA] leading-relaxed">
              {record.analysis.explanation}
            </p>
          </div>
        )}

        {/* Clear Disclaimer */}
        <div className="p-3 rounded-xl bg-[#0E1522]/60 border border-[rgba(185,200,220,0.06)] text-xs text-[#9BA7B8] leading-relaxed flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#FF7547] shrink-0" />
          <span>
            <strong>Investigative Notice:</strong> A risk score indicates suspicious signals and does not independently prove fraud. All dispositions require human review.
          </span>
        </div>
      </div>

      {/* SECTION C: DEDICATED "ADVERTISEMENT TEXT" CARD */}
      <div className="floating-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgba(185,200,220,0.08)]">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Advertisement Text
            </h3>
            <span className="text-[11px] text-[#748197]">
              Highlighted text marks detected suspicious phrases
            </span>
          </div>
          <button
            onClick={() => handleCopy(record.original_text, 'ad_text')}
            className="text-xs text-[#9BA7B8] hover:text-white flex items-center gap-1 font-mono p-1 rounded"
            title="Copy advertisement text"
          >
            {copiedText === 'ad_text' ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#45D6A3]" />
                <span className="text-[#45D6A3]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.1)] text-sm text-[#F4F6FA] whitespace-pre-wrap leading-relaxed select-text font-sans">
          {renderHighlightedText()}
        </div>

        {record.submitted_url && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.08)] text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-[#FF7547] shrink-0" />
              <span className="text-[#9BA7B8]">Associated URL:</span>
              <span className="text-white truncate select-all">{record.submitted_url}</span>
            </div>
            <button
              onClick={() => handleCopy(record.submitted_url!, 'url')}
              className="text-[#748197] hover:text-white shrink-0 ml-2"
              title="Copy URL string"
            >
              {copiedText === 'url' ? <Check className="w-3.5 h-3.5 text-[#45D6A3]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* SECTION D: WHY WAS IT FLAGGED? SEPARATE EVIDENCE CARDS */}
      <div className="floating-card space-y-4">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider pb-2 border-b border-[rgba(185,200,220,0.08)]">
          Why Was It Flagged? ({record.evidence_items.length} Detection Indicators)
        </h3>

        {record.evidence_items.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#0E1522] border border-[#45D6A3]/20 text-xs text-[#45D6A3] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>✓ No suspicious heuristic indicators triggered. Text conforms to standard promotional copy.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {record.evidence_items.map((ev) => {
              const friendlyTitle = categoryTitles[ev.evidence_type] || ev.evidence_type.replace(/_/g, ' ');
              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.1)] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold font-display text-white text-sm">
                      {friendlyTitle}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FF5964]/10 text-[#FF5964] border border-[#FF5964]/25 uppercase font-semibold">
                      Flagged Pattern
                    </span>
                  </div>

                  {ev.matched_text && (
                    <div className="text-xs text-[#9BA7B8]">
                      Matched phrase:{' '}
                      <span className="font-mono bg-[#FF5964]/15 text-[#FF5964] px-1.5 py-0.5 rounded border border-[#FF5964]/30 font-semibold">
                        "{ev.matched_text}"
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-[#F4F6FA] leading-relaxed">
                    {ev.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION E: EXTRACTED CONTACTS AND INDICATORS */}
      <div className="floating-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgba(185,200,220,0.08)]">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Extracted Contacts & Technical Identifiers ({record.entities.length})
          </h3>
          <span className="text-[11px] text-[#748197]">
            Not independently verified as authentic accounts
          </span>
        </div>

        {record.entities.length === 0 ? (
          <p className="text-xs text-[#748197] p-2">
            No phone numbers, Telegram handles, WhatsApp contacts, or URLs detected in this advertisement.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {record.entities.map((e, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.1)] flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-mono text-[#748197] uppercase block">{e.entity_type}</span>
                  <span className="font-mono font-semibold text-[#45D6A3] truncate block select-all">
                    {e.entity_value}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(e.entity_value, `entity_${idx}`)}
                  className="p-1.5 text-[#748197] hover:text-white rounded-lg hover:bg-[#141C2B] transition-colors"
                  title="Copy identifier"
                >
                  {copiedText === `entity_${idx}` ? (
                    <Check className="w-3.5 h-3.5 text-[#45D6A3]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION F: RELATED ADVERTISEMENTS */}
      <div className="floating-card space-y-3">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider pb-2 border-b border-[rgba(185,200,220,0.08)]">
          Related Advertisements ({record.related_ads.length})
        </h3>

        {record.related_ads.length === 0 ? (
          <p className="text-xs text-[#748197] p-2">
            No near-duplicate advertisements or shared contact channels were discovered for this record.
          </p>
        ) : (
          <div className="space-y-2">
            {record.related_ads.map((rel) => (
              <div
                key={rel.id}
                className="p-3.5 rounded-xl bg-[#0E1522] border border-[rgba(185,200,220,0.1)] flex items-center justify-between text-xs"
              >
                <div className="min-w-0 max-w-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white font-mono">{rel.custom_id || `AD-${rel.id}`}</span>
                    <span className="text-[10px] text-[#FF7547] bg-[#FF7547]/10 px-2 py-0.5 rounded font-mono">
                      {rel.relation_type}
                    </span>
                    <StatusBadge status={rel.review_status} size="sm" />
                  </div>
                  <p className="text-xs text-[#9BA7B8] truncate">{rel.preview}</p>
                </div>

                <Link
                  to={`/investigations/${rel.custom_id || rel.id}`}
                  className="btn-secondary text-xs py-1.5 px-3 shrink-0 ml-3"
                >
                  <span>View Dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION G: RECOMMENDED NEXT STEPS CHECKLIST & DISPOSITION FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Next Steps Checklist */}
        <div className="floating-card space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[rgba(185,200,220,0.08)]">
            <ListChecks className="w-4 h-4 text-[#FF7547]" />
            <span>Recommended Next Steps</span>
          </h3>

          <ul className="space-y-2.5 text-xs text-[#9BA7B8]">
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FF7547]/15 text-[#FF7547] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Review the highlighted phrases in the advertisement text above.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FF7547]/15 text-[#FF7547] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Inspect extracted contact handles in the Threat Network for shared syndicates.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FF7547]/15 text-[#FF7547] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Update the investigation disposition below and record analyst notes.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FF7547]/15 text-[#FF7547] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>Export or print a dossier summary for compliance and audit reporting.</span>
            </li>
          </ul>

          <div className="pt-3 border-t border-[rgba(185,200,220,0.08)]">
            <Link
              to="/network"
              className="text-xs text-[#FF7547] hover:underline font-mono flex items-center gap-1 font-semibold"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Explore Connections in Threat Network →</span>
            </Link>
          </div>
        </div>

        {/* Update Disposition Form */}
        <div className="floating-card space-y-3 border-[#FF7547]/30">
          <h3 className="text-xs font-semibold text-[#FF7547] uppercase tracking-wider pb-2 border-b border-[rgba(185,200,220,0.08)]">
            Update Investigation Status
          </h3>

          <form onSubmit={handleUpdateStatus} className="space-y-3">
            <div>
              <label className="block text-xs text-[#9BA7B8] mb-1 font-medium">Disposition</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2.5 input-surface text-xs font-mono"
              >
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="ESCALATED">Escalated</option>
                <option value="CLOSED">Closed</option>
                <option value="FALSE_POSITIVE">False Alarm / Safe</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#9BA7B8] mb-1 font-medium">Analyst Notes</label>
              <textarea
                rows={2}
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                placeholder="Add notes for audit and compliance trail..."
                className="w-full p-2.5 input-surface text-xs resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={savingStatus}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingStatus ? 'Saving...' : 'Save Disposition'}</span>
              </button>

              {saveSuccess && (
                <span className="text-xs text-[#45D6A3] font-mono flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Status saved</span>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* SECTION H: COLLAPSIBLE ADVANCED DETAILS */}
      <div className="floating-card p-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
          className="w-full flex items-center justify-between text-xs text-[#9BA7B8] hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2 font-mono">
            <Cpu className="w-4 h-4 text-[#75A7FF]" />
            <span className="uppercase tracking-wider font-semibold">Advanced Diagnostics & Technical Metadata</span>
          </div>
          {showAdvancedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedDetails && (
          <div className="pt-3 border-t border-[rgba(185,200,220,0.08)] space-y-3 text-xs font-mono text-[#9BA7B8]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#0E1522] border border-[rgba(185,200,220,0.08)] space-y-1">
                <span className="text-[10px] text-[#748197] uppercase block">Content SHA-256 Hash</span>
                <span className="text-white text-[11px] select-all break-all">{record.content_hash || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1522] border border-[rgba(185,200,220,0.08)] space-y-1">
                <span className="text-[10px] text-[#748197] uppercase block">ML Model Raw Signal</span>
                <span className="text-white text-[11px]">
                  {record.analysis?.model_signal !== null && record.analysis?.model_signal !== undefined
                    ? `${(record.analysis.model_signal * 100).toFixed(2)}% probability (TF-IDF + Logistic Regression)`
                    : 'Model signal unavailable'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E1522] border border-[rgba(185,200,220,0.08)] space-y-1">
              <span className="text-[10px] text-[#748197] uppercase block">Triggered Rule IDs</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {record.analysis?.triggered_rules?.map((r) => (
                  <span key={r.rule_id} className="px-2 py-0.5 rounded bg-[#141C2B] border border-white/10 text-white text-[11px]">
                    {r.rule_id} (weight: +{r.weight})
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
