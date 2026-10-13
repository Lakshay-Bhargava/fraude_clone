import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Cpu,
  Network,
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  FileText,
  AlertTriangle,
  Fingerprint,
  Zap,
  Eye,
  Sliders,
  Database
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Logo } from '../components/ui/Logo';
import { api } from '../services/api';
import { DashboardStats } from '../types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {
      // fallback metrics if server not connected yet
      setStats({
        total_analyzed: 15,
        high_risk_count: 8,
        medium_risk_count: 2,
        low_risk_count: 5,
        open_cases_count: 2,
        awaiting_review_count: 6,
        total_entities_tracked: 28,
        demo_mode: true
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#08090D] text-[#F5F5F7] overflow-x-hidden">
      <Navbar />

      {/* SECTION B: CINEMATIC HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden cyber-grid">
        {/* Abstract Scanning Beam */}
        <div className="scanner-beam" />

        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#FF7547]/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#FF4D5A]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 py-20">
          {/* Top Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#FF7547] animate-ping" />
            <span className="text-[11px] font-mono tracking-widest text-[#9297A4] uppercase font-semibold">
              FINANCIAL THREAT INTELLIGENCE / PLATFORM 01
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-display text-white uppercase leading-[1.05] mb-6">
            FOLLOW THE <span className="text-[#FF7547] drop-shadow-[0_0_25px_rgba(255,117,71,0.4)]">SIGNAL</span>.<br />
            FIND THE <span className="text-[#FF4D5A] drop-shadow-[0_0_25px_rgba(255,77,90,0.4)]">FRAUD</span>.
          </h1>

          {/* Supporting Text */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#9297A4] font-normal leading-relaxed mb-10">
            Investigate suspicious financial advertisements with explainable AI, evidence extraction,
            and connected threat intelligence. Built for forensic analysts who value clarity over black-box guesses.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/scanner"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF7547] text-white font-mono font-semibold text-xs tracking-wider uppercase shadow-xl shadow-[#FF7547]/25 hover:bg-[#FF8A65] transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch Scanner</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <a
              href="#the-signal"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#171A22] text-[#F5F5F7] border border-white/10 font-mono text-xs tracking-wider uppercase hover:border-[#FF7547]/50 hover:bg-[#1f232e] transition-all"
            >
              <span>Explore Intelligence</span>
              <span className="text-[#FF7547]">↓</span>
            </a>
          </div>

          {/* Forensic Capabilities Ticker */}
          <div className="pt-8 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-mono tracking-widest text-[#626775]">
            <span className="flex items-center gap-1.5"><span className="text-[#FF7547]">●</span> TEXT ANALYSIS</span>
            <span className="flex items-center gap-1.5"><span className="text-[#FF7547]">●</span> OCR VISION</span>
            <span className="flex items-center gap-1.5"><span className="text-[#FF7547]">●</span> ENTITY MATCHING</span>
            <span className="flex items-center gap-1.5"><span className="text-[#FF7547]">●</span> CASE INVESTIGATION</span>
          </div>
        </div>
      </section>

      {/* SECTION C: THE SIGNAL */}
      <section id="the-signal" className="py-24 border-t border-white/[0.08] bg-[#0c0e14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono text-[#FF7547] tracking-widest uppercase font-semibold">
              EVIDENTIARY DECONSTRUCTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white mt-2 mb-4">
              Every suspicious ad leaves a signal.
            </h2>
            <p className="text-sm text-[#9297A4] leading-relaxed">
              Deconstruct deceptive marketing patterns. From unauthorized bank account sales to credential harvesting and pre-loaded ATM drops, signals emerge through linguistic anomalies and linked infrastructure.
            </p>
          </div>

          {/* Interactive Comparison Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Left: Raw Unstructured Ad Text */}
            <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <span className="text-xs font-mono text-[#9297A4]">RAW ADVERTISEMENT CONTENT</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-[#FF4D5A] border border-[#FF4D5A]/30">
                    UNPROCESSED INGESTION
                  </span>
                </div>
                <div className="bg-[#08090D] p-4 rounded-lg font-mono text-xs text-[#9297A4] border border-white/5 space-y-2 leading-relaxed">
                  <p>
                    <span className="bg-[#FF4D5A]/20 text-white px-1 py-0.5 rounded border border-[#FF4D5A]/40 font-semibold">
                      GUARANTEED UNCHECKED BANK ACCOUNTS FOR SALE!
                    </span>{' '}
                    Get fully activated business and personal checking accounts with online access and debit cards.{' '}
                    <span className="bg-[#FF7547]/20 text-white px-1 py-0.5 rounded border border-[#FF7547]/40">
                      No KYC verification needed.
                    </span>{' '}
                    Instant delivery. Contact <span className="text-[#49D6A5]">@FastCashDrop</span> on Telegram or call{' '}
                    <span className="text-[#49D6A5]">+1-555-019-8234</span> now.{' '}
                    <span className="bg-[#F3B84B]/20 text-white px-1 py-0.5 rounded border border-[#F3B84B]/40">
                      Limited slots left today!
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-[#626775]">
                Source: Telegram Channel Drop / Fictional Demonstration Record
              </div>
            </div>

            {/* Right: FraudScope AI Forensic Signal Breakdown */}
            <div className="bg-[#171A22] border border-[#FF7547]/30 rounded-xl p-6 flex flex-col justify-between shadow-xl shadow-[#FF7547]/5">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                  <span className="text-xs font-mono text-[#FF7547] font-semibold">FRAUDSCOPE AI EXTRACTION</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF4D5A]/15 text-[#FF4D5A] font-bold border border-[#FF4D5A]/40">
                    RISK INDEX: 84 / 100 (HIGH)
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-2.5 rounded bg-[#101218] border border-white/5">
                    <div className="text-[11px] font-mono font-semibold text-[#FF4D5A] flex items-center justify-between">
                      <span>RULE: UNAUTHORIZED ACCOUNT SALE</span>
                      <span>+42 PTS</span>
                    </div>
                    <p className="text-[11px] text-[#9297A4] mt-0.5">
                      KYC bypass solicitation detected: "unchecked bank accounts for sale"
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[#101218] border border-white/5">
                    <div className="text-[11px] font-mono font-semibold text-[#FF7547] flex items-center justify-between">
                      <span>EXTRACTED ENTITIES</span>
                      <span>2 IDENTIFIERS</span>
                    </div>
                    <p className="text-[11px] text-[#9297A4] mt-0.5 font-mono">
                      Telegram: @FastCashDrop | Phone: +1-555-019-8234
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[#101218] border border-white/5">
                    <div className="text-[11px] font-mono font-semibold text-[#F3B84B] flex items-center justify-between">
                      <span>CAMPAIGN SIMILARITY</span>
                      <span>MATCH FOUND</span>
                    </div>
                    <p className="text-[11px] text-[#9297A4] mt-0.5">
                      Identical contact handle linked to money mule ad <span className="font-mono text-white">AD-DEMO-004</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal Notice Box */}
              <div className="mt-6 p-3 rounded bg-white/[0.02] border border-white/10 text-[11px] text-[#9297A4]">
                <strong className="text-white">Investigative Principle:</strong> A signal is a reason to investigate, not a verdict. Final dispositions require human analyst verification.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION D: INTELLIGENCE METRICS */}
      <section id="intelligence" className="py-20 border-t border-white/[0.08] bg-[#08090D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-mono text-[#FF7547] tracking-widest uppercase font-semibold">
                SYSTEM TELEMETRY
              </span>
              <h2 className="text-3xl font-bold font-display text-white mt-1">
                Live Intelligence Repository
              </h2>
            </div>
            <span className="text-xs font-mono text-[#9297A4] mt-2 md:mt-0">
              DATABASE BACKED • REAL-TIME METRICS
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-xl bg-[#101218] border border-white/[0.08]">
              <span className="text-xs font-mono text-[#9297A4] uppercase">Advertisements Analyzed</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-white mt-2">
                {stats?.total_analyzed ?? 15}
              </div>
              <p className="text-[11px] font-mono text-[#49D6A5] mt-2">● Synthetic Demonstration Corpus</p>
            </div>

            <div className="p-6 rounded-xl bg-[#101218] border border-[#FF4D5A]/20">
              <span className="text-xs font-mono text-[#9297A4] uppercase">High-Risk Indicators</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-[#FF4D5A] mt-2">
                {stats?.high_risk_count ?? 8}
              </div>
              <p className="text-[11px] font-mono text-[#9297A4] mt-2">Score threshold &ge; 65/100</p>
            </div>

            <div className="p-6 rounded-xl bg-[#101218] border border-[#F3B84B]/20">
              <span className="text-xs font-mono text-[#9297A4] uppercase">Records Awaiting Review</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-[#F3B84B] mt-2">
                {stats?.awaiting_review_count ?? 6}
              </div>
              <p className="text-[11px] font-mono text-[#9297A4] mt-2">Pending human disposition</p>
            </div>

            <div className="p-6 rounded-xl bg-[#101218] border border-[#FF7547]/20">
              <span className="text-xs font-mono text-[#9297A4] uppercase">Tracked Threat Entities</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-[#FF7547] mt-2">
                {stats?.total_entities_tracked ?? 28}
              </div>
              <p className="text-[11px] font-mono text-[#9297A4] mt-2">Phones, Telegram, Domains</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION F: CAPABILITIES */}
      <section id="capabilities" className="py-24 border-t border-white/[0.08] bg-[#0c0e14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono text-[#FF7547] tracking-widest uppercase font-semibold">
              ANALYST WORKFLOW CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white mt-2 mb-4">
              Engineered for Cyber Threat Intelligence
            </h2>
            <p className="text-sm text-[#9297A4]">
              Transform raw social media, forum, and messaging advertisements into connected forensic cases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Capability 1 */}
            <div className="p-6 rounded-xl bg-[#101218] border border-white/[0.08] hover:border-[#FF7547]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#FF7547]/10 border border-[#FF7547]/30 flex items-center justify-center text-[#FF7547] mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display mb-2">01. Signal Detection</h3>
              <p className="text-xs text-[#9297A4] leading-relaxed">
                Context-aware heuristics detect unauthorized bank account sales, cloned cards, and credential harvesting while suppressing false positives on benign consumer warnings.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="p-6 rounded-xl bg-[#101218] border border-white/[0.08] hover:border-[#FF7547]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D5A]/10 border border-[#FF4D5A]/30 flex items-center justify-center text-[#FF4D5A] mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display mb-2">02. Visual Forensics</h3>
              <p className="text-xs text-[#9297A4] leading-relaxed">
                Ingest screenshot advertisements via PyTesseract OCR. Extract embedded contact banners and URLs directly from graphic ads with graceful offline fallback.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="p-6 rounded-xl bg-[#101218] border border-white/[0.08] hover:border-[#FF7547]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#49D6A5]/10 border border-[#49D6A5]/30 flex items-center justify-center text-[#49D6A5] mb-4">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display mb-2">03. Threat Networks</h3>
              <p className="text-xs text-[#9297A4] leading-relaxed">
                Interactive React Flow graph links separate advertisements sharing telephone numbers, Telegram accounts, domain hosts, or near-duplicate phrasing.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="p-6 rounded-xl bg-[#101218] border border-white/[0.08] hover:border-[#FF7547]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#F3B84B]/10 border border-[#F3B84B]/30 flex items-center justify-center text-[#F3B84B] mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display mb-2">04. Case Management</h3>
              <p className="text-xs text-[#9297A4] leading-relaxed">
                Organize related records into prioritized cases, append analyst notes, trace full audit history, and export sanitized spreadsheet summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION G: METHODOLOGY */}
      <section id="methodology" className="py-24 border-t border-white/[0.08] bg-[#08090D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-[#FF7547] tracking-widest uppercase font-semibold">
              THE 5-STEP FORENSIC PIPELINE
            </span>
            <h2 className="text-3xl font-bold font-display text-white mt-2">
              Transparent, Explainable Investigation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '01', title: 'Ingest', desc: 'Accept advertisement text, safe URL strings, OCR screenshots, or bulk CSV batches.' },
              { step: '02', title: 'Extract', desc: 'Normalize unicode, clean noise, and extract phone numbers, handles, and hostnames.' },
              { step: '03', title: 'Analyze', desc: 'Evaluate context-aware rules and TF-IDF baseline model to compute 0-100 risk index.' },
              { step: '04', title: 'Connect', desc: 'Discover near-duplicates with RapidFuzz and build interactive threat network graphs.' },
              { step: '05', title: 'Review', desc: 'Human analyst assigns final disposition, documents case notes, and exports evidence.' },
            ].map((m) => (
              <div key={m.step} className="p-5 rounded-lg bg-[#101218] border border-white/[0.08] relative">
                <div className="text-2xl font-mono font-extrabold text-[#FF7547] mb-2">{m.step}</div>
                <h4 className="text-sm font-bold text-white font-display uppercase tracking-wide mb-1.5">{m.title}</h4>
                <p className="text-xs text-[#9297A4] leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION H: FINAL CTA */}
      <section className="py-24 border-t border-white/[0.08] bg-[#101218] relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white uppercase mb-4">
            Evidence over assumptions.
          </h2>
          <p className="text-base text-[#9297A4] max-w-xl mx-auto mb-8">
            Investigate suspicious financial advertisements with a transparent, review-first workflow.
          </p>
          <Link
            to="/console"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#FF7547] text-white font-mono font-semibold text-xs tracking-wider uppercase shadow-2xl shadow-[#FF7547]/30 hover:bg-[#FF8A65] transition-all transform hover:-translate-y-0.5"
          >
            <span>Enter Investigation Console</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* SECTION I: FOOTER */}
      <footer id="about" className="py-12 border-t border-white/[0.08] bg-[#08090D] text-xs font-mono text-[#626775]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span>v1.0.0 — Hackathon Demonstration Edition</span>
          </div>

          <div className="text-center md:text-right max-w-md">
            <p className="text-[11px] text-[#9297A4]">
              Responsible-Use Disclaimer: A high risk score is an investigative triage signal, not proof of fraud or verified criminal conduct.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
