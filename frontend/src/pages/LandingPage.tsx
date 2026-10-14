import React from 'react';
import { Link } from 'react-router-dom';
import {
  ScanSearch,
  Network,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  FileDown,
  UserPlus,
  LogIn,
  Layers,
  Database,
  Building2
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#202124] overflow-x-hidden">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-28 pb-20 overflow-hidden investigation-grid">
        {/* Subtle Warm Gold Radial Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-[#D4AF37]/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E8DDB8] mb-8 shadow-card-subtle">
            <span className="w-2 h-2 rounded-full bg-[#A67C00] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-[#A67C00] uppercase font-bold">
              Financial Advertisement Fraud Intelligence
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#202124] leading-[1.08] mb-6">
            Detect. Analyze. <span className="text-[#A67C00]">Investigate.</span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#697386] font-normal leading-relaxed mb-10">
            FRAUDSCOPE AI is an enterprise financial cybersecurity platform designed to detect, triage, and map illicit financial advertisements offering mule bank accounts, corporate current accounts, ATM kits, and suspicious UPI handles.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {isAuthenticated ? (
              <Link
                to="/console"
                className="w-full sm:w-auto btn-gold text-sm px-8 py-3.5 rounded-xl shadow-gold-md"
              >
                <span>Open Investigator Console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto btn-gold text-sm px-8 py-3.5 rounded-xl shadow-gold-md flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Investigator Account</span>
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto btn-secondary text-sm px-8 py-3.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-[#A67C00]" />
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>

          {/* 3 Core Benefit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6 max-w-4xl mx-auto">
            <div className="gold-card floating-card-interactive p-6 bg-[#FFFDF7] border border-[#E8DDB8]">
              <div className="w-10 h-10 rounded-xl bg-[rgba(200,61,77,0.08)] border border-[rgba(200,61,77,0.25)] flex items-center justify-center text-[#C83D4D] mb-4 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#202124] mb-1.5">Illicit Account Detection</h3>
              <p className="text-xs text-[#697386] leading-relaxed">
                Flags unauthorized rental of current accounts, savings accounts, and ATM cards across Telegram, Instagram, and Facebook using hybrid character n-grams and rule heuristics.
              </p>
            </div>

            <div className="gold-card floating-card-interactive p-6 bg-[#FFFDF7] border border-[#E8DDB8]">
              <div className="w-10 h-10 rounded-xl bg-[rgba(166,124,0,0.08)] border border-[#E8DDB8] flex items-center justify-center text-[#A67C00] mb-4 shadow-sm">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#202124] mb-1.5">Mule Cluster Graphs</h3>
              <p className="text-xs text-[#697386] leading-relaxed">
                Automatically connects advertisements sharing sanitized phone numbers, UPI handles, or Telegram contacts into graph-linked syndicate networks.
              </p>
            </div>

            <div className="gold-card floating-card-interactive p-6 bg-[#FFFDF7] border border-[#E8DDB8]">
              <div className="w-10 h-10 rounded-xl bg-[rgba(35,134,91,0.08)] border border-[rgba(35,134,91,0.25)] flex items-center justify-center text-[#23865B] mb-4 shadow-sm">
                <FileDown className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#202124] mb-1.5">Forensic Case PDF Export</h3>
              <p className="text-xs text-[#697386] leading-relaxed">
                Generates compliance and cybercrime ready Case Dossier PDFs containing masked evidence, OCR analysis, risk breakdowns, and timestamped audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PLATFORM CAPABILITIES SECTION */}
      <section id="capabilities" className="py-20 bg-[#FFFFFF] border-t border-[#E8DDB8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A67C00]">
              Forensic Infrastructure
            </span>
            <h2 className="text-3xl font-bold text-[#202124] mt-1">
              Purpose-Built for Financial Threat Intelligence
            </h2>
            <p className="text-xs text-[#697386] mt-2">
              Every component is tuned to eliminate false positives while preserving actionable cyber-forensic artifacts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#FFFDF7] border border-[#E8DDB8] shadow-card-subtle">
              <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8DDB8] flex items-center justify-center text-[#A67C00] mb-3">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202124] mb-1">Persistent SQLite & SQLAlchemy</h4>
              <p className="text-xs text-[#697386] leading-relaxed">
                Over 860 real forensic advertisement records, persistent investigative notes, cases, and user account management.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#FFFDF7] border border-[#E8DDB8] shadow-card-subtle">
              <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8DDB8] flex items-center justify-center text-[#A67C00] mb-3">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202124] mb-1">Optical Character Recognition</h4>
              <p className="text-xs text-[#697386] leading-relaxed">
                Image upload triage powered by Tesseract OCR to extract obfuscated text, embedded UPI handles, and WhatsApp invites.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#FFFDF7] border border-[#E8DDB8] shadow-card-subtle">
              <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E8DDB8] flex items-center justify-center text-[#A67C00] mb-3">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202124] mb-1">Enterprise Role-Based Access</h4>
              <p className="text-xs text-[#697386] leading-relaxed">
                Strict separation between Investigator, Fraud Analyst, and Administrator roles with Bcrypt hashing and JWT session tokens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E8DDB8] py-10 bg-[#FFFDF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#697386]">
          <Logo size="sm" />
          <p>© 2026 FRAUDSCOPE AI. Detect. Analyze. Investigate.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-[#202124]">Sign In</Link>
            <Link to="/register" className="hover:text-[#202124]">Register</Link>
            <Link to="/console" className="hover:text-[#202124]">Investigator Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
