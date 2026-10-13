import React from 'react';
import { Link } from 'react-router-dom';
import {
  ScanSearch,
  Layers,
  Network,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Info,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock,
  Compass,
  FileDown
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Logo } from '../components/ui/Logo';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E9F2] overflow-x-hidden selection:bg-[#6366F1]/30 selection:text-white">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 overflow-hidden cyber-grid">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-[#6366F1]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[280px] h-[280px] bg-[#22D3EE]/8 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131C2E] border border-[rgba(148,163,184,0.15)] mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-[#94A3B8] uppercase font-semibold">
              Financial Advertisement Fraud Intelligence
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            Detect. Analyze. <span className="text-[#6366F1]">Protect.</span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#94A3B8] font-normal leading-relaxed mb-10">
            Detect and investigate suspicious financial advertisements across social media offering bank accounts, current accounts, ATM cards, linked SIMs, or UPI access for illicit sale or rental.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/console"
              className="w-full sm:w-auto btn-primary text-sm px-8 py-3.5 rounded-xl shadow-xl shadow-[#6366F1]/25"
            >
              <span>Open Investigator Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/scanner"
              className="w-full sm:w-auto btn-secondary text-sm px-8 py-3.5 rounded-xl"
            >
              <ScanSearch className="w-4 h-4 text-[#22D3EE]" />
              <span>Scan Advertisement</span>
            </Link>
          </div>

          {/* 3 Core Benefit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left pt-6 max-w-4xl mx-auto">
            <div className="floating-card floating-card-interactive p-5">
              <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mb-4">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Illicit Account Detection</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Flags unauthorized rental of current accounts, savings accounts, and ATM cards across Telegram, Instagram, and Facebook.
              </p>
            </div>

            <div className="floating-card floating-card-interactive p-5">
              <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] mb-4">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Mule Cluster Graphs</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Automatically links posts sharing identical phone numbers, UPI handles, or cash-out routing channels into investigation clusters.
              </p>
            </div>

            <div className="floating-card floating-card-interactive p-5">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1] mb-4">
                <FileDown className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Forensic Case PDF Export</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Generates law-enforcement and compliance ready Case Dossier PDFs containing masked evidence, OCR analysis, and rule scores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(148,163,184,0.1)] py-10 bg-[#091426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <Logo size="sm" />
          <p>© 2026 FraudScope AI. Designed for financial threat intelligence and anti-mule compliance.</p>
          <div className="flex items-center gap-4">
            <Link to="/console" className="hover:text-white">Dashboard</Link>
            <Link to="/flagged-posts" className="hover:text-white">Flagged Posts</Link>
            <Link to="/network" className="hover:text-white">Clusters</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
