import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  FileDown,
  Layers,
  Phone,
  CreditCard,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  CheckCircle2,
  Tag,
  Globe,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { RiskBadge } from '../ui/RiskBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { AdvertisementDetail, AdvertisementSummary } from '../../types';
import { api } from '../../services/api';
import { generateCaseReportPdf } from '../../services/pdfReportGenerator';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ad: AdvertisementDetail | AdvertisementSummary | null;
  onStatusUpdate?: (adId: number | string, newStatus: string) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  ad,
  onStatusUpdate,
}) => {
  const [detail, setDetail] = useState<AdvertisementDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('NEW');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  useEffect(() => {
    if (ad) {
      setCurrentStatus(ad.review_status || 'NEW');
      setLoadingDetail(true);
      api.getAdDetail(ad.id)
        .then((fullData) => {
          setDetail(fullData);
        })
        .catch((err) => {
          console.error('Failed to load ad detail', err);
          if ('evidence_items' in ad) {
            setDetail(ad as AdvertisementDetail);
          }
        })
        .finally(() => setLoadingDetail(false));
    } else {
      setDetail(null);
    }
  }, [ad]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ad) return null;

  const currentAd = detail || ad;
  const customId = currentAd.custom_id || `AD-${currentAd.id}`;
  const rawScore = ('analysis' in currentAd && currentAd.analysis?.risk_score !== undefined)
    ? currentAd.analysis.risk_score
    : (currentAd as any).risk_score;
  const riskScore = rawScore !== null && rawScore !== undefined ? Math.round(rawScore) : 0;
  const riskLevel = ('analysis' in currentAd && currentAd.analysis?.risk_level)
    ? currentAd.analysis.risk_level
    : (currentAd as any).risk_level || 'LOW';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStatusChange = (status: string) => {
    setCurrentStatus(status);
    api.updateAdStatus(ad.id, status)
      .then(() => {
        if (onStatusUpdate) {
          onStatusUpdate(ad.id, status);
        }
      })
      .catch((err) => {
        console.error('Failed to update status', err);
      });
  };

  const handleExportPdf = () => {
    setPdfGenerating(true);
    setPdfSuccess(false);
    setTimeout(() => {
      const success = generateCaseReportPdf(currentAd, {
        analystNotes: `Investigated via FraudScope AI. Evaluated forensic risk: ${riskScore}/100 (${riskLevel}).`,
      });
      setPdfGenerating(false);
      if (success) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 4000);
      }
    }, 400);
  };

  // Multilingual suspicious phrases to highlight
  const suspiciousKeywords = [
    'account for rent',
    'bank account rent',
    'current account available',
    'fresh current',
    'ATM card',
    'card + PIN',
    'card aur PIN',
    'linked SIM',
    'linked SIM ke saath',
    'account kiraye pe',
    'rent par',
    'urgent buyers',
    'urgent buyers only',
    'guaranteed returns',
    'UPI access',
    'UPI ID for rent',
    'merchant UPI',
    'debit card and account',
    'mule account',
  ];

  // Helper to highlight suspicious keywords in text
  const renderHighlightedSnippet = (text: string) => {
    if (!text) return 'No text content available.';
    let parts: { text: string; highlight: boolean }[] = [{ text, highlight: false }];

    suspiciousKeywords.forEach((kw) => {
      const nextParts: { text: string; highlight: boolean }[] = [];
      parts.forEach((part) => {
        if (part.highlight) {
          nextParts.push(part);
          return;
        }
        const lowerPart = part.text.toLowerCase();
        const lowerKw = kw.toLowerCase();
        let startIdx = 0;
        let foundIdx = lowerPart.indexOf(lowerKw, startIdx);

        if (foundIdx === -1) {
          nextParts.push(part);
        } else {
          while (foundIdx !== -1) {
            if (foundIdx > startIdx) {
              nextParts.push({ text: part.text.slice(startIdx, foundIdx), highlight: false });
            }
            nextParts.push({ text: part.text.slice(foundIdx, foundIdx + kw.length), highlight: true });
            startIdx = foundIdx + kw.length;
            foundIdx = lowerPart.indexOf(lowerKw, startIdx);
          }
          if (startIdx < part.text.length) {
            nextParts.push({ text: part.text.slice(startIdx), highlight: false });
          }
        }
      });
      parts = nextParts;
    });

    return parts.map((chunk, idx) =>
      chunk.highlight ? (
        <mark
          key={idx}
          className="bg-[#EF4444]/25 text-[#EF4444] border-b border-[#EF4444] px-0.5 rounded font-semibold"
        >
          {chunk.text}
        </mark>
      ) : (
        <span key={idx}>{chunk.text}</span>
      )
    );
  };

  // Extracted entities from database
  const entities = detail?.entities || ('entities' in ad ? (ad as any).entities : []) || [];
  const phones = entities.filter((e: any) => e.entity_type === 'PHONE');
  const upis = entities.filter((e: any) => e.entity_type === 'UPI');
  const urls = entities.filter((e: any) => e.entity_type === 'URL_DOMAIN' || e.entity_type === 'URL');
  const telegrams = entities.filter((e: any) => e.entity_type === 'TELEGRAM');

  // Matched rules from actual analysis
  const matchedRules = detail?.analysis?.triggered_rules || [];

  // Related ads from database
  const relatedAds = detail?.related_ads || [];

  // Dynamic factor breakdown calculated from real score
  const factorBreakdown = [
    {
      label: 'Financial Terms & Account Solicitation',
      value: matchedRules.some((r) => r.category === 'ACCOUNT_SALE' || r.category === 'FINANCIAL_SOLICITATION')
        ? Math.min(100, Math.round(riskScore * 1.1))
        : Math.round(riskScore * 0.3),
      color: riskScore > 60 ? '#EF4444' : '#F59E0B',
    },
    {
      label: 'Authentication & Credential Risk',
      value: matchedRules.some((r) => r.category === 'CREDENTIAL_HARVESTING' || r.category === 'PIN_ACCESS')
        ? Math.min(100, Math.round(riskScore * 1.05))
        : Math.round(riskScore * 0.25),
      color: '#EF4444',
    },
    {
      label: 'Extracted Financial Identifiers',
      value: phones.length > 0 || upis.length > 0 ? Math.min(100, Math.max(30, riskScore)) : 10,
      color: '#F59E0B',
    },
    {
      label: 'Unverified Online Channels & URLs',
      value: detail?.url_analysis?.is_suspicious ? 80 : urls.length > 0 ? 35 : 10,
      color: '#22D3EE',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Container */}
      <div
        className="relative w-full max-w-2xl bg-[#0E1728] border-l border-[rgba(148,163,184,0.18)] h-full flex flex-col z-10 shadow-2xl overflow-hidden animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Post Evidence Drawer"
      >
        {/* Drawer Header */}
        <div className="h-[76px] px-6 bg-[#091426] border-b border-[rgba(148,163,184,0.15)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white tracking-wider">{customId}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131C2E] border border-[rgba(148,163,184,0.2)] text-[#94A3B8]">
                  {detail?.platform || (currentAd as any).platform || 'Unknown'}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                Evidence Dossier & Forensic Investigation Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RiskBadge level={riskLevel} score={riskScore} size="sm" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#131C2E] transition-colors ml-2"
              aria-label="Close Evidence Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.15)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#94A3B8]">Review Status:</span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-[#0D182B] text-xs font-mono text-white border border-[rgba(148,163,184,0.2)] rounded-lg px-2.5 py-1.5 focus:border-[#6366F1] focus:outline-none"
              >
                <option value="NEW">NEW</option>
                <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                <option value="ESCALATED">ESCALATED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
              </select>
            </div>

            <button
              onClick={handleExportPdf}
              disabled={pdfGenerating}
              className="btn-secondary text-xs flex items-center gap-2 py-1.5 px-3"
            >
              <FileDown className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>{pdfGenerating ? 'Generating PDF...' : 'Download PDF Dossier'}</span>
            </button>
          </div>

          {pdfSuccess && (
            <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-mono text-[#10B981] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Official Forensic Case Report PDF generated and downloaded!</span>
            </div>
          )}

          {/* Section A: Original Post Details */}
          <div className="floating-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Original Advertisement Snippet</span>
              </h3>
              <span className="text-[11px] font-mono text-[#64748B]">
                {currentAd.created_at ? new Date(currentAd.created_at).toLocaleString() : 'Recent'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.12)] text-xs text-[#E5E9F2] leading-relaxed font-sans select-text">
              {renderHighlightedSnippet(currentAd.original_text)}
            </div>

            {/* Explanation box */}
            {detail?.analysis?.explanation && (
              <div className="p-3 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.1)] text-xs text-[#94A3B8] leading-relaxed">
                <span className="font-mono font-bold text-white block mb-1">AI Explanation:</span>
                {detail.analysis.explanation}
              </div>
            )}
          </div>

          {/* Section B: URL Analysis Heuristics */}
          {detail?.url_analysis && (
            <div className="floating-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>URL Security Analysis</span>
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    detail.url_analysis.is_suspicious
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                  }`}
                >
                  {detail.url_analysis.status.toUpperCase()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.12)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">Target Domain:</span>
                  <span className="text-white font-semibold">{detail.url_analysis.domain || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">External Reputation:</span>
                  <span className="text-[#94A3B8]">
                    {detail.url_analysis.reputation_status} ({detail.url_analysis.reputation_provider})
                  </span>
                </div>
                {detail.url_analysis.heuristics.length > 0 && (
                  <div className="pt-2 border-t border-[rgba(148,163,184,0.1)] space-y-1">
                    <span className="text-[11px] font-mono text-[#64748B]">Indicators:</span>
                    {detail.url_analysis.heuristics.map((h, i) => (
                      <p key={i} className="text-xs text-[#E5E9F2] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
                        {h}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section C: Extracted Technical Indicators */}
          <div className="floating-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Extracted Technical Entities ({entities.length})</span>
            </h3>

            {entities.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] text-center text-xs font-mono text-[#64748B]">
                No technical identifiers (phone numbers, UPI IDs, or domains) extracted from this text.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {entities.map((e: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.12)] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-mono text-[#64748B]">{e.entity_type}</p>
                      <p className="text-xs font-mono font-semibold text-[#22D3EE] truncate max-w-[180px]">
                        {e.entity_value}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(e.entity_value, `ent-${idx}`)}
                      className="p-1.5 rounded-lg hover:bg-[#18243A] text-[#94A3B8] hover:text-white"
                      title="Copy entity"
                    >
                      {copiedKey === `ent-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section D: Risk Factor Breakdown Bars */}
          <div className="floating-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono">
                Risk Score Factor Breakdown
              </h3>
              <span className="text-xs font-mono font-bold text-[#EF4444]">{riskScore} / 100</span>
            </div>

            <div className="space-y-3">
              {factorBreakdown.map((factor) => (
                <div key={factor.label} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#94A3B8]">{factor.label}</span>
                    <span className="text-white font-semibold">{factor.value}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#0D182B] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${factor.value}%`, backgroundColor: factor.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section E: Matched Fraud Rules */}
          <div className="floating-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono">
              Triggered Detection Rules ({matchedRules.length})
            </h3>

            {matchedRules.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] text-center text-xs font-mono text-[#64748B]">
                No financial fraud patterns or illicit account solicitation rules triggered.
              </div>
            ) : (
              <div className="space-y-2">
                {matchedRules.map((rule: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.12)] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#EF4444]">
                        {rule.rule_id} ({rule.rule_name})
                      </span>
                      <span className="text-[10px] font-mono text-[#F59E0B] font-semibold">
                        Weight: {rule.weight}
                      </span>
                    </div>
                    <p className="text-xs text-[#E5E9F2] leading-snug">
                      {rule.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section F: Linked Advertisements */}
          <div className="floating-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Linked Advertisements ({relatedAds.length})</span>
              </h3>
            </div>

            {relatedAds.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] text-center text-xs font-mono text-[#64748B]">
                No linked advertisements sharing this text fingerprint or entity found in database.
              </div>
            ) : (
              <div className="space-y-2.5">
                {relatedAds.map((ra: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-white">{ra.custom_id || `AD-${ra.id}`}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18243A] text-[#94A3B8]">
                          {ra.relation_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] truncate max-w-sm">{ra.preview}</p>
                    </div>
                    <StatusBadge status={ra.review_status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="h-16 px-6 bg-[#091426] border-t border-[rgba(148,163,184,0.15)] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-[#64748B]">
            Evidence Record #{currentAd.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#18243A] text-xs font-semibold text-white hover:bg-[#223352] transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
