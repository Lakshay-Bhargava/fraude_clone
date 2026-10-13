import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Globe,
  Tag,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Briefcase,
  Share2,
  Copy,
  ExternalLink,
  Save,
  MessageSquare,
  Hash
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementDetail } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

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

  // Case linking state
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [linkingCase, setLinkingCase] = useState(false);

  const loadRecord = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getAdDetail(parseInt(id, 10));
      setRecord(data);
      setSelectedStatus(data.review_status);

      // Load cases for link dropdown
      const caseList = await api.listCases();
      setCases(caseList);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load advertisement investigation record.');
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
      alert(err.message || 'Failed to update disposition');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleLinkToCase = async () => {
    if (!record || !selectedCaseId) return;
    setLinkingCase(true);
    try {
      await api.updateCase(parseInt(selectedCaseId, 10), {
        add_ad_ids: [record.id]
      });
      await loadRecord();
      setSelectedCaseId('');
    } catch (err: any) {
      alert(err.message || 'Failed to link to case');
    } finally {
      setLinkingCase(false);
    }
  };

  // Helper to highlight triggered phrases in original text
  const renderHighlightedText = () => {
    if (!record) return null;
    const text = record.original_text;
    const phrases = record.analysis?.suspicious_phrases || [];

    if (phrases.length === 0) {
      return <span>{text}</span>;
    }

    // Build regex of unique phrases sorted by length descending
    const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
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
                className="bg-[#FF4D5A]/25 text-white px-1 py-0.5 rounded border border-[#FF4D5A]/50 font-semibold"
                title="Investigative rule trigger phrase"
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
      <div className="py-20 text-center font-mono text-xs text-[#9297A4]">
        Loading forensic evidence dossier...
      </div>
    );
  }

  if (errorMsg || !record) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-400 font-mono text-xs">{errorMsg || 'Record not found'}</p>
        <Link to="/advertisements" className="text-xs font-mono text-[#FF7547] underline">
          ← Return to Advertisement Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-[#171A22] border border-white/10 text-[#9297A4] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#9297A4]">INVESTIGATION DOSSIER</span>
              <span className="text-xs font-mono font-bold text-white">
                {record.custom_id || `AD-${record.id}`}
              </span>
              <StatusBadge status={record.review_status} size="sm" />
            </div>
            <h2 className="text-xl font-bold font-display text-white mt-0.5">
              Evidence & Forensic Breakdown
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RiskBadge
            level={record.analysis?.risk_level}
            score={record.analysis?.risk_score}
            size="md"
          />
        </div>
      </div>

      {/* Main Grid: Left Dossier / Right Disposition Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Text & Evidence Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Text with Trigger Highlights */}
          <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono text-[#9297A4] uppercase font-semibold">
                Original Submitted Text (Interactive Evidence Highlights)
              </span>
              <span className="text-[10px] font-mono text-[#626775]">
                Source: {record.source_type}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#08090D] border border-white/5 font-mono text-xs text-[#F5F5F7] whitespace-pre-wrap">
              {renderHighlightedText()}
            </div>

            {/* Submitted URL */}
            {record.submitted_url && (
              <div className="flex items-center gap-2 text-xs font-mono pt-2 border-t border-white/5">
                <Globe className="w-4 h-4 text-[#FF7547] shrink-0" />
                <span className="text-[#9297A4]">Target URL String:</span>
                <span className="text-white select-all">{record.submitted_url}</span>
              </div>
            )}
          </div>

          {/* AI Explanation & Methodology */}
          {record.analysis && (
            <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-3">
              <span className="text-xs font-mono text-[#FF7547] uppercase font-semibold">
                AI Risk Scoring Explanation & Recommended Action
              </span>
              <p className="text-xs text-[#F5F5F7] leading-relaxed bg-[#171A22] p-3.5 rounded-lg border border-white/5">
                {record.analysis.explanation}
              </p>
              <div className="text-[11px] font-mono text-[#9297A4] pt-2 border-t border-white/5">
                <strong className="text-white uppercase">Recommended Review Action: </strong>
                {record.analysis.recommended_review_action}
              </div>
            </div>
          )}

          {/* Triggered Rule Evidence Items */}
          <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono text-[#9297A4] uppercase font-semibold">
                Evidence Inventory ({record.evidence_items.length} Trigger Items)
              </span>
            </div>

            {record.evidence_items.length === 0 ? (
              <p className="text-xs font-mono text-[#626775]">
                No specific suspicious heuristic triggers were logged for this record.
              </p>
            ) : (
              <div className="space-y-3">
                {record.evidence_items.map((ev) => (
                  <div key={ev.id} className="p-3.5 rounded-lg bg-[#08090D] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#FF4D5A] font-bold">{ev.evidence_type}</span>
                      <span className="text-[#626775]">{ev.source_location || 'Body'}</span>
                    </div>
                    <p className="text-xs text-white">
                      Matched Phrase: <span className="font-mono bg-[#FF4D5A]/15 text-[#FF4D5A] px-1 py-0.5 rounded">"{ev.matched_text}"</span>
                    </p>
                    <p className="text-[11px] text-[#9297A4] leading-relaxed">{ev.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Records / Near Duplicates */}
          <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-4">
            <span className="text-xs font-mono text-[#9297A4] uppercase font-semibold block border-b border-white/[0.06] pb-3">
              Correlated Advertisement Records ({record.related_ads.length})
            </span>

            {record.related_ads.length === 0 ? (
              <p className="text-xs font-mono text-[#626775]">
                No related records or shared contact channels discovered in repository.
              </p>
            ) : (
              <div className="space-y-2.5">
                {record.related_ads.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 rounded-lg bg-[#08090D] border border-white/10 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="truncate max-w-md">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white">{rel.custom_id || `AD-${rel.id}`}</span>
                        <span className="text-[10px] text-[#FF7547] bg-[#FF7547]/10 px-1.5 py-0.5 rounded">
                          {rel.relation_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9297A4] truncate">{rel.preview}</p>
                    </div>

                    <Link
                      to={`/investigations/${rel.id}`}
                      className="px-2.5 py-1 rounded bg-[#171A22] text-[#FF7547] hover:underline text-[11px] shrink-0 ml-3"
                    >
                      Inspect →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Human Disposition, Identifiers & Case Linking */}
        <div className="space-y-6">
          {/* Human Review Disposition Action Box */}
          <div className="bg-[#101218] border border-[#FF7547]/30 rounded-xl p-6 space-y-4">
            <span className="text-xs font-mono text-[#FF7547] uppercase font-semibold block">
              Human Analyst Disposition
            </span>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#9297A4] uppercase mb-1">
                  Investigation Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-2 bg-[#171A22] border border-white/10 rounded text-xs font-mono text-white focus:outline-none focus:border-[#FF7547]"
                >
                  <option value="NEW">NEW</option>
                  <option value="NEEDS_REVIEW">NEEDS REVIEW</option>
                  <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9297A4] uppercase mb-1">
                  Analyst Rationale / Notes
                </label>
                <textarea
                  rows={3}
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                  placeholder="Record investigative reasoning..."
                  className="w-full p-2.5 bg-[#171A22] border border-white/10 rounded text-xs font-mono text-white placeholder-[#626775] focus:outline-none focus:border-[#FF7547]"
                />
              </div>

              <button
                type="submit"
                disabled={savingStatus}
                className="w-full py-2.5 rounded bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingStatus ? 'Persisting...' : 'Save Disposition'}</span>
              </button>

              {saveSuccess && (
                <p className="text-[11px] font-mono text-[#49D6A5] text-center">
                  ✓ Review disposition persisted to audit ledger.
                </p>
              )}
            </form>
          </div>

          {/* Extracted Identifiers */}
          <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-3">
            <span className="text-xs font-mono text-[#9297A4] uppercase font-semibold block border-b border-white/[0.06] pb-2">
              Extracted Threat Identifiers ({record.entities.length})
            </span>

            {record.entities.length === 0 ? (
              <p className="text-xs font-mono text-[#626775]">No phone, handle, or crypto entities.</p>
            ) : (
              <div className="space-y-2">
                {record.entities.map((e, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-[#08090D] border border-white/5 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-[10px] text-[#9297A4]">{e.entity_type}</span>
                    <span className="text-[#49D6A5] font-semibold select-all">{e.entity_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Cases */}
          <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-4">
            <span className="text-xs font-mono text-[#9297A4] uppercase font-semibold block border-b border-white/[0.06] pb-2">
              Linked Cases ({record.cases.length})
            </span>

            {record.cases.length > 0 && (
              <div className="space-y-2">
                {record.cases.map((c) => (
                  <Link
                    key={c.id}
                    to="/cases"
                    className="p-2.5 rounded bg-[#08090D] border border-white/10 block hover:border-[#FF7547]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{c.case_ref}</span>
                      <span className="text-[10px] text-[#FF7547]">{c.priority}</span>
                    </div>
                    <p className="text-[11px] text-[#9297A4] mt-0.5 truncate">{c.title}</p>
                  </Link>
                ))}
              </div>
            )}

            {/* Link to existing case form */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="block text-[11px] font-mono text-[#9297A4]">
                Associate with an Existing Case:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="flex-1 p-2 bg-[#171A22] border border-white/10 rounded text-xs font-mono text-white focus:outline-none"
                >
                  <option value="">Select Case...</option>
                  {cases.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.case_ref} — {cs.title.slice(0, 30)}...
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLinkToCase}
                  disabled={!selectedCaseId || linkingCase}
                  className="px-3 py-2 rounded bg-[#171A22] border border-white/10 hover:border-[#FF7547] text-white text-xs font-mono"
                >
                  Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
