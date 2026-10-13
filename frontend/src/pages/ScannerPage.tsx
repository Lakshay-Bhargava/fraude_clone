import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanSearch,
  Upload,
  Globe,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Phone,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Cpu,
  Layers,
  FileDown,
  Send,
  Camera,
  Share2
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementDetail } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { generateCaseReportPdf } from '../services/pdfReportGenerator';

export const ScannerPage: React.FC = () => {
  // Input fields
  const [textContent, setTextContent] = useState('');
  const [platform, setPlatform] = useState('Telegram');
  const [submittedUrl, setSubmittedUrl] = useState('');

  // OCR and File Upload
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);

  // Status & Results
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AdvertisementDetail | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Multilingual sample presets matching FinGuard AI targets (English, Hindi, Hinglish)
  const samplePresets = [
    {
      label: 'Hinglish Bank Account Rent',
      badge: 'Account Sale',
      color: 'border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10',
      text: 'Bank account kiraye pe available hai! Fresh current account with linked SIM card aur ATM card + PIN ready for immediate delivery. Payment after verification. Urgent buyers only message on Telegram @CashDropDeal or call +91 98765 43210. 100% genuine.',
      platform: 'Telegram',
      url: 'https://t.me/CashDropDeal',
    },
    {
      label: 'Preloaded ATM Card & PIN',
      badge: 'Card Fraud',
      color: 'border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10',
      text: 'ATM card chahiye with active savings account access? Pre-loaded debit card and account access available. Urgent buyers only. Guaranteed daily cash withdrawal limits. Contact fast for immediate dispatch.',
      platform: 'Instagram',
      url: 'https://instagram.com/fast_cards_hub',
    },
    {
      label: 'UPI Merchant Rental',
      badge: 'UPI Laundering',
      color: 'border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10',
      text: 'Merchant UPI access and verified business current accounts for rent. Daily rotation payment routing. High commission payout daily. Contact @UPI_Rentals on Telegram or WhatsApp +91 91234 56789. Genuine buyers only.',
      platform: 'Telegram',
      url: 'https://t.me/UPI_Rentals',
    },
    {
      label: 'Legitimate Bank Advisory',
      badge: 'Safe Advisory',
      color: 'border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10',
      text: 'FRAUD ADVISORY from RBI & Cyber Crime Cell: Never rent out your savings or current bank accounts. Selling bank accounts or sharing SIM cards linked to banking is a punishable offense under PMLA. Beware of fake Telegram channels.',
      platform: 'Facebook',
      url: 'https://rbi.org.in/cyber-safety',
    },
  ];

  const handleApplyPreset = (p: typeof samplePresets[0]) => {
    setTextContent(p.text);
    setPlatform(p.platform);
    setSubmittedUrl(p.url);
    setErrorMsg(null);
    setResult(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) {
      setErrorMsg('Please paste advertisement text before analyzing.');
      return;
    }

    setScanning(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await api.analyzeAd(
        textContent.trim(),
        'text',
        submittedUrl.trim() || undefined
      );
      // Ensure platform is assigned
      res.platform_detected = platform;
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis failed. Please check backend connection.');
    } finally {
      setScanning(false);
    }
  };

  // Handle OCR screenshot upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagePreview(URL.createObjectURL(file));
      setOcrStatus('Extracting text from image via OCR...');
      setErrorMsg(null);

      try {
        const ocrRes = await api.uploadOcrImage(file);
        setOcrStatus(ocrRes.message);
        if (ocrRes.extracted_text) {
          setTextContent(ocrRes.extracted_text);
        }
      } catch (err: any) {
        setOcrStatus(err.message || 'Could not extract text. Note: PyTesseract OCR is optional on host.');
      }
    }
  };

  const handleExportReport = () => {
    if (!result) return;
    setPdfGenerating(true);
    setTimeout(() => {
      generateCaseReportPdf(result, {
        analystNotes: 'Generated immediately following advertisement scanner triage. High priority mule syndicate markers verified.',
      });
      setPdfGenerating(false);
    }, 400);
  };

  const handleReset = () => {
    setTextContent('');
    setSubmittedUrl('');
    setResult(null);
    setErrorMsg(null);
    setImagePreview(null);
    setOcrStatus(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Advertisement Scanner
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] font-semibold">
            Multilingual AI Triage
          </span>
        </div>
        <p className="text-sm text-[#94A3B8]">
          Submit suspected advertisement content, social media posts, or OCR images for automated indicators extraction and fraud scoring.
        </p>
      </div>

      {/* 2. Main Scanning Card */}
      <div className="floating-card space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-5">
          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#94A3B8] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Quick Multilingual Test Presets (English / Hindi / Hinglish):</span>
              </span>
              {textContent && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-[#64748B] hover:text-[#E5E9F2] underline"
                >
                  Clear text
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {samplePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-xl bg-[#0D182B] border text-left transition-all text-xs flex flex-col justify-between gap-1.5 ${preset.color}`}
                >
                  <span className="font-semibold text-white">{preset.label}</span>
                  <span className="text-[10px] font-mono uppercase opacity-75">{preset.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Selector & Source URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                Source Social Media Platform:
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full p-2.5 input-surface text-xs"
              >
                <option value="Telegram">Telegram Channel / Group</option>
                <option value="Instagram">Instagram Post / Story</option>
                <option value="Facebook">Facebook Marketplace / Group</option>
                <option value="X">X (Twitter)</option>
                <option value="YouTube">YouTube Community / Comments</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                Source Post URL (Optional):
              </label>
              <input
                type="text"
                value={submittedUrl}
                onChange={(e) => setSubmittedUrl(e.target.value)}
                placeholder="https://t.me/channel or post link"
                className="w-full p-2.5 input-surface text-xs"
              />
            </div>
          </div>

          {/* Advertisement Textarea */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">
              Advertisement Content (English, Hindi, or Hinglish):
            </label>
            <textarea
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste suspicious post offering bank accounts, current accounts, ATM cards, debit cards, linked SIMs, or UPI handles..."
              className="w-full p-4 input-surface text-sm leading-relaxed resize-y font-sans"
              required
            />
            <div className="flex justify-between items-center text-xs text-[#64748B] mt-1.5 font-mono">
              <span>Supports multilingual syntax, Hinglish transliterations, and emoji</span>
              <span>{textContent.length} characters</span>
            </div>
          </div>

          {/* OCR Image Upload Panel */}
          <div className="pt-2 border-t border-[rgba(148,163,184,0.1)]">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5 py-1 font-medium transition-colors"
            >
              <span>Optional Media & Image OCR Tools</span>
              {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvancedOptions && (
              <div className="mt-3 p-4 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Upload Advertisement Screenshot for OCR
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-[#94A3B8] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#131C2E] file:text-white file:text-xs hover:file:bg-[#18243A] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Extracts embedded banking solicitations and phone numbers using OCR image processing.
                  </p>
                  {ocrStatus && (
                    <p className="text-[11px] text-[#22D3EE] font-mono mt-1">{ocrStatus}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-xs text-[#EF4444] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={scanning || !textContent.trim()}
              className="btn-primary text-sm px-7 py-3 shadow-xl shadow-[#6366F1]/20 flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning & Analyzing Content...</span>
                </>
              ) : (
                <>
                  <ScanSearch className="w-4 h-4" />
                  <span>Scan Advertisement</span>
                </>
              )}
            </button>

            {textContent && (
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary text-xs py-3 px-4"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 3. Real Scan Results Breakdown Card */}
      {result && result.analysis && (
        <div className="floating-card-elevated border-[#6366F1]/40 space-y-6 animate-fade-in shadow-2xl">
          {/* Header & Score Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[rgba(148,163,184,0.15)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
                <span>ANALYSIS COMPLETE</span>
                <span>•</span>
                <span className="text-white font-semibold">{result.custom_id || `AD-${result.id}`}</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                FraudScope AI Threat Dossier
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <RiskBadge
                level={result.analysis.risk_level}
                score={result.analysis.risk_score}
                size="lg"
              />
            </div>
          </div>

          {/* Risk Score Progress Bar */}
          <div className="space-y-2 p-4 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[#94A3B8]">Composite Risk Index</span>
              <span className="font-mono font-bold text-white">
                {Math.round(result.analysis.risk_score)} / 100
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#131C2E] overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  result.analysis.risk_level === 'HIGH'
                    ? 'bg-[#EF4444]'
                    : result.analysis.risk_level === 'MEDIUM'
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#10B981]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, result.analysis.risk_score))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#64748B] pt-0.5">
              <span>0 (Low Risk)</span>
              <span>35 (Medium Threshold)</span>
              <span>70 (High Threat Threshold)</span>
              <span>100 (Critical)</span>
            </div>
          </div>

          {/* Plain-Language Explanation */}
          <div className="p-4 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.15)] space-y-2">
            <h3 className="text-xs font-semibold text-[#22D3EE] uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Why Was This Advertisement Flagged?</span>
            </h3>
            <p className="text-sm text-[#E5E9F2] leading-relaxed">
              {result.analysis.explanation}
            </p>
            {result.analysis.recommended_review_action && (
              <p className="text-xs text-[#94A3B8] pt-1">
                <strong className="text-white">Recommended Action: </strong>
                {result.analysis.recommended_review_action}
              </p>
            )}
          </div>

          {/* Machine Learning Model Classification Breakdown */}
          <div className="p-4 rounded-xl bg-[#0D182B] border border-[#6366F1]/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Machine Learning Classifier Evaluation
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    Model: {result.analysis.model_version || 'fraudscope-tfidf-lr-v1.0'} (TF-IDF + Logistic Regression)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                  result.analysis.model_class === 'suspicious'
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                }`}>
                  Class: {(result.analysis.model_class || 'safe').toUpperCase()}
                </span>
                <span className="text-xs font-mono text-[#94A3B8]">
                  Signal: {result.analysis.model_score ?? Math.round((result.analysis.model_signal ?? 0) * 100)}%
                </span>
              </div>
            </div>

            {/* Contributing Tokens Breakdown */}
            {result.analysis.model_tokens && result.analysis.model_tokens.length > 0 && (
              <div className="pt-2 border-t border-[rgba(148,163,184,0.1)]">
                <span className="text-[11px] font-mono text-[#94A3B8] block mb-1.5">
                  Top Contributing Linguistic Tokens (Learned TF-IDF Features):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.analysis.model_tokens.map((tok, idx) => {
                    const isSusp = tok.contribution > 0;
                    return (
                      <span
                        key={idx}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isSusp
                            ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25'
                            : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/25'
                        }`}
                      >
                        {tok.token} ({isSusp ? '+' : ''}{tok.contribution})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Triggered Violation Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Triggered Warning Signs ({result.analysis.triggered_rules.length})
            </h3>

            {result.analysis.triggered_rules.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0D182B] border border-[#10B981]/25 text-xs text-[#10B981] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  No high-risk unauthorized financial heuristics triggered. Content conforms to benign informational baseline.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.analysis.triggered_rules.map((rule) => (
                  <div
                    key={rule.rule_id}
                    className="p-3.5 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.12)] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{rule.rule_name}</span>
                      <span className="text-[#EF4444] font-mono font-semibold">
                        +{rule.weight} pts
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {rule.explanation}
                    </p>
                    {rule.matched_phrases.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rule.matched_phrases.map((phrase, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                          >
                            "{phrase}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Identifiers (Phone, UPI, Links) */}
          {result.entities.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[rgba(148,163,184,0.1)]">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Extracted Technical Identifiers & UPI Handles ({result.entities.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.entities.map((ent, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D182B] border border-[rgba(148,163,184,0.15)] text-xs font-mono text-[#22D3EE]"
                  >
                    <span className="text-[10px] text-[#94A3B8] uppercase">{ent.entity_type}:</span>
                    <span className="font-semibold select-all">{ent.entity_value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions: Full Dossier & Generate PDF Report */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={`/investigations/${result.custom_id || result.id}`}
              className="btn-primary text-xs py-2.5 px-5 flex items-center justify-center gap-2"
            >
              <span>Open Full Investigation Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleExportReport}
              disabled={pdfGenerating}
              className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-[#22D3EE]" />
              <span>{pdfGenerating ? 'Generating PDF...' : 'Generate Case Report (PDF)'}</span>
            </button>

            <button
              onClick={handleReset}
              className="text-xs text-[#94A3B8] hover:text-white px-3 py-2 ml-auto"
            >
              Scan Another Advertisement
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
