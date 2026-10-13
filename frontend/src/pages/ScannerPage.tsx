import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ScanSearch,
  Upload,
  Globe,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Copy,
  ExternalLink,
  ArrowRight,
  Info,
  RefreshCw,
  ImageIcon,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementDetail } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();

  // Active tab: 'text' | 'url' | 'screenshot' | 'csv'
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'screenshot' | 'csv'>('text');

  // Text / URL form
  const [textContent, setTextContent] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');

  // Screenshot state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);

  // CSV Bulk state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResults, setCsvResults] = useState<any | null>(null);

  // Scanning & Result states
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AdvertisementDetail | null>(null);

  // Quick preset samples for fast hackathon evaluation
  const presets = [
    {
      label: 'Suspicious Account Offer',
      text: 'GUARANTEED UNCHECKED BANK ACCOUNTS FOR SALE! Get fully activated business and personal checking accounts with online access and debit cards. No KYC verification needed. Instant delivery. Contact @FastCashDrop on Telegram or dm +1-555-019-8234 now. Limited slots left today!',
      url: 'https://t.me/FastCashDrop',
    },
    {
      label: 'Pre-loaded ATM Card Drop',
      text: 'Pre-loaded ATM Debit Cards ready to cash out at any terminal. Balance $10,000 guaranteed with PIN included. Ship worldwide discreetly. Contact @ShadowVault_Cards or visit https://shadowvault-drop.xyz/cards',
      url: 'https://shadowvault-drop.xyz/cards',
    },
    {
      label: 'Benign Fraud Advisory (Must not false positive!)',
      text: 'SCAM ALERT from the Federal Consumer Protection Bureau: Be alert to online ads offering pre-loaded debit cards or unchecked accounts. Legitimate financial institutions will never ask for your PIN or CVV.',
      url: 'https://consumer-protection.gov/alerts',
    },
    {
      label: 'Money Mule Recruitment',
      text: 'Rent your bank account and make $1,500/day passive income! Simply receive daily incoming wire transfers and forward 90% via crypto. 100% legal, no risk to you. Text WhatsApp +1-555-014-9981 or visit https://t.me/FastCashDrop',
      url: 'https://t.me/FastCashDrop',
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTextContent(p.text);
    setSubmittedUrl(p.url);
    setResult(null);
    setErrorMsg(null);
  };

  const handleScanText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) {
      setErrorMsg('Please enter advertisement text to analyze.');
      return;
    }

    setScanning(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await api.analyzeAd(textContent.trim(), 'text', submittedUrl.trim() || undefined);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis request failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setOcrStatus('Extracting text via Optical Character Recognition (OCR)...');
      setErrorMsg(null);

      try {
        const ocrRes = await api.uploadOcrImage(file);
        setOcrStatus(ocrRes.message);
        if (ocrRes.extracted_text) {
          setTextContent(ocrRes.extracted_text);
        }
      } catch (err: any) {
        setOcrStatus(err.message);
      }
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      setCsvResults(null);
      setErrorMsg(null);
    }
  };

  const handleBulkProcess = async () => {
    if (!csvFile) return;
    setScanning(true);
    setErrorMsg(null);
    try {
      const res = await api.bulkAnalyze(csvFile);
      setCsvResults(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Batch CSV processing failed.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-white">Advertisement Threat Scanner</h2>
        <p className="text-xs font-mono text-[#9297A4] mt-0.5">
          Submit unstructured advertisement text, URLs, screenshots, or CSV batches for explainable AI risk scoring
        </p>
      </div>

      {/* Input Mode Navigation Tabs */}
      <div className="flex border-b border-white/[0.08] gap-4 text-xs font-mono">
        <button
          onClick={() => { setActiveTab('text'); setResult(null); }}
          className={`pb-2.5 px-1 font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'text'
              ? 'border-[#FF7547] text-[#FF7547]'
              : 'border-transparent text-[#9297A4] hover:text-white'
          }`}
        >
          <ScanSearch className="w-4 h-4" />
          <span>Text & Presets</span>
        </button>

        <button
          onClick={() => { setActiveTab('screenshot'); setResult(null); }}
          className={`pb-2.5 px-1 font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'screenshot'
              ? 'border-[#FF7547] text-[#FF7547]'
              : 'border-transparent text-[#9297A4] hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Screenshot OCR Vision</span>
        </button>

        <button
          onClick={() => { setActiveTab('csv'); setResult(null); }}
          className={`pb-2.5 px-1 font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-[#FF7547] text-[#FF7547]'
              : 'border-transparent text-[#9297A4] hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV Batch Upload</span>
        </button>
      </div>

      {/* TAB 1: TEXT INPUT & PRESETS */}
      {activeTab === 'text' && (
        <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-6">
          {/* Quick Demo Presets */}
          <div>
            <span className="text-[11px] font-mono text-[#9297A4] uppercase block mb-2 font-semibold">
              Quick Demonstration Scenarios:
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-3 py-1.5 rounded-lg bg-[#171A22] border border-white/10 text-xs font-mono text-[#9297A4] hover:text-white hover:border-[#FF7547]/50 hover:bg-[#1e222e] transition-all text-left"
                >
                  ⚡ {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleScanText} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono text-[#9297A4] uppercase">
                  Advertisement Content (Raw Text)
                </label>
                <span className="text-[11px] font-mono text-[#626775]">
                  {textContent.length} / 15,000 characters
                </span>
              </div>
              <textarea
                rows={5}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste financial advertisement copy, promotional message, or forum drop here..."
                className="w-full p-3.5 bg-[#08090D] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-[#626775] focus:outline-none focus:border-[#FF7547] leading-relaxed transition-colors"
                maxLength={15000}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9297A4] uppercase mb-1.5">
                Optional Destination URL String (Static Host Analysis Only)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-[#626775] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={submittedUrl}
                  onChange={(e) => setSubmittedUrl(e.target.value)}
                  placeholder="https://t.me/example or https://suspicious-offer.xyz (Not fetched externally)"
                  className="w-full pl-9 pr-3 py-2 bg-[#08090D] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-[#626775] focus:outline-none focus:border-[#FF7547]"
                />
              </div>
              <p className="text-[10px] font-mono text-[#626775] mt-1">
                Security Policy: URL strings are parsed statically without initiating outbound HTTP connections.
              </p>
            </div>

            <button
              type="submit"
              disabled={scanning || !textContent.trim()}
              className="px-6 py-2.5 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold uppercase tracking-wider hover:bg-[#FF8A65] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#FF7547]/20"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Forensic Engine...</span>
                </>
              ) : (
                <>
                  <ScanSearch className="w-3.5 h-3.5" />
                  <span>Execute Threat Analysis</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: SCREENSHOT OCR */}
      {activeTab === 'screenshot' && (
        <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-6">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#FF7547]/40 transition-colors">
            <Upload className="w-8 h-8 text-[#FF7547] mx-auto mb-3" />
            <p className="text-sm font-medium text-white mb-1">
              Select or Drop Advertisement Screenshot
            </p>
            <p className="text-xs text-[#9297A4] font-mono mb-4">
              Supported formats: PNG, JPG, JPEG, WEBP (Max 10MB)
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#171A22] border border-white/10 text-xs font-mono text-white cursor-pointer hover:bg-[#202430]">
              <span>Browse Image File</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>

          {imagePreview && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-[#08090D] border border-white/5">
              <div>
                <span className="text-xs font-mono text-[#9297A4] block mb-2">IMAGE PREVIEW</span>
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="max-h-60 rounded border border-white/10 object-contain mx-auto"
                />
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-[#9297A4] block mb-2">OCR STATUS / TEXT</span>
                  {ocrStatus && (
                    <div className="p-2.5 rounded bg-[#171A22] border border-white/10 text-[11px] font-mono text-[#49D6A5] mb-2">
                      {ocrStatus}
                    </div>
                  )}
                  <textarea
                    rows={4}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="OCR extracted text will populate here for verification..."
                    className="w-full p-2.5 bg-[#101218] border border-white/10 rounded text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleScanText}
                  disabled={scanning || !textContent.trim()}
                  className="mt-3 py-2 px-4 rounded bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors"
                >
                  Analyze Extracted Text →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CSV BATCH UPLOAD */}
      {activeTab === 'csv' && (
        <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-6">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
            <FileSpreadsheet className="w-8 h-8 text-[#FF7547] mx-auto mb-3" />
            <p className="text-sm font-medium text-white mb-1">Upload Batch Advertisement CSV</p>
            <p className="text-xs text-[#9297A4] font-mono mb-4">
              Headers: <code className="text-[#FF7547]">content</code> or <code className="text-[#FF7547]">text</code>, optional <code className="text-[#FF7547]">submitted_url</code> (Max 50 rows per batch)
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#171A22] border border-white/10 text-xs font-mono text-white cursor-pointer hover:bg-[#202430]">
              <span>Select CSV File</span>
              <input type="file" accept=".csv" onChange={handleCsvChange} className="hidden" />
            </label>
            {csvFile && (
              <p className="text-xs font-mono text-[#49D6A5] mt-2">
                Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {csvFile && (
            <div className="flex justify-end">
              <button
                onClick={handleBulkProcess}
                disabled={scanning}
                className="px-6 py-2.5 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors"
              >
                {scanning ? 'Processing Batch...' : 'Process Batch Records →'}
              </button>
            </div>
          )}

          {csvResults && (
            <div className="p-4 rounded-lg bg-[#08090D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-semibold">Batch Processing Summary</span>
                <span className="text-[#49D6A5]">
                  Processed {csvResults.successful_count} / {csvResults.total_submitted} records
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                {csvResults.results.map((r: any) => (
                  <div key={r.row} className="py-2 flex items-center justify-between text-xs font-mono">
                    <div className="truncate max-w-md">
                      <span className="text-white font-semibold mr-2">{r.custom_id}:</span>
                      <span className="text-[#9297A4]">{r.preview}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <RiskBadge level={r.risk_level} score={r.risk_score} size="sm" />
                      <Link to={`/investigations/${r.id}`} className="text-[#FF7547] hover:underline text-[11px]">
                        Inspect →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RESULT CARDS DISPLAY */}
      {result && result.analysis && (
        <div className="bg-[#101218] border border-[#FF7547]/40 rounded-xl p-6 space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
          {/* Duplicate Banner */}
          {result.analysis.is_duplicate && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-[#F3B84B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                <span>CAMPAIGN DUPLICATE DETECTED: Exact match found in repository ({result.analysis.duplicate_of_id || 'Existing record'}).</span>
              </div>
            </div>
          )}

          {/* Top Result Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[#9297A4]">ANALYZED RECORD:</span>
                <span className="text-xs font-mono font-bold text-white">{result.custom_id}</span>
                <StatusBadge status={result.review_status} size="sm" />
              </div>
              <h3 className="text-lg font-bold font-display text-white">Forensic Risk Assessment</h3>
            </div>

            <div className="flex items-center gap-3">
              <RiskBadge
                level={result.analysis.risk_level}
                score={result.analysis.risk_score}
                size="lg"
              />
              <Link
                to={`/investigations/${result.id}`}
                className="px-4 py-2 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors inline-flex items-center gap-1.5"
              >
                <span>Full Evidence Record</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 rounded-lg bg-[#171A22] border border-white/10">
            <span className="text-[10px] font-mono text-[#FF7547] uppercase font-semibold block mb-1">
              ENGINE EXPLANATION & METHODOLOGY
            </span>
            <p className="text-xs text-[#F5F5F7] leading-relaxed">
              {result.analysis.explanation}
            </p>
          </div>

          {/* Triggered Rules Grid */}
          <div>
            <span className="text-xs font-mono text-[#9297A4] uppercase block mb-3 font-semibold">
              Triggered Investigative Rules ({result.analysis.triggered_rules.length})
            </span>
            {result.analysis.triggered_rules.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#08090D] border border-white/5 text-xs text-[#49D6A5] font-mono">
                ✓ No high-risk illicit rules triggered. Content evaluated within normal baseline thresholds.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.analysis.triggered_rules.map((rule) => (
                  <div key={rule.rule_id} className="p-3.5 rounded-lg bg-[#08090D] border border-white/10">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{rule.rule_name}</span>
                      <span className="text-[#FF4D5A] font-bold">+{rule.weight} PTS</span>
                    </div>
                    <p className="text-[11px] text-[#9297A4] mt-1">{rule.explanation}</p>
                    {rule.matched_phrases.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rule.matched_phrases.map((phrase, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF4D5A]/15 text-[#FF4D5A] border border-[#FF4D5A]/30"
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

          {/* Extracted Identifiers */}
          {result.entities.length > 0 && (
            <div>
              <span className="text-xs font-mono text-[#9297A4] uppercase block mb-2 font-semibold">
                Extracted Identifiers & Channels
              </span>
              <div className="flex flex-wrap gap-2">
                {result.entities.map((ent, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#171A22] border border-white/10 text-xs font-mono text-[#49D6A5]"
                  >
                    <span className="text-[9px] text-[#9297A4] uppercase">{ent.entity_type}:</span>
                    <span>{ent.entity_value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
