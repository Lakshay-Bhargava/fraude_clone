import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, User, ArrowRight, Info } from 'lucide-react';
import { Logo } from '../components/ui/Logo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('analyst@fraudscope.local');
  const [password, setPassword] = useState('demo-session-2026');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/console');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4 cyber-grid relative overflow-hidden">
      {/* Scanner Beam */}
      <div className="scanner-beam" />

      <div className="w-full max-w-md floating-card-elevated p-8 shadow-2xl relative z-10 space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block mb-3">
            <Logo size="md" />
          </Link>
          <h2 className="text-2xl font-bold font-display text-white">Analyst Authentication</h2>
          <p className="text-xs text-[#9BA7B8] mt-1">
            Access the FraudScope AI Threat Intelligence Console
          </p>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-3.5 rounded-xl bg-[#0E1522] border border-[#FF7547]/30 text-xs text-[#F4F6FA]">
          <div className="flex items-center gap-2 font-mono font-bold text-[#FF7547] text-[11px] mb-1">
            <Info className="w-4 h-4 shrink-0" />
            <span>LOCAL HACKATHON DEMO MODE</span>
          </div>
          <p className="text-[#9BA7B8] leading-relaxed text-[11px]">
            Authentication is simplified for local evaluation. Production deployment integrates enterprise SSO/OIDC identity providers.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#9BA7B8] uppercase mb-1.5">
              Analyst Identity
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#748197] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 input-surface text-xs font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#9BA7B8] uppercase mb-1.5">
              Security Token / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#748197] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 input-surface text-xs font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-xs uppercase tracking-wider"
          >
            {loading ? (
              <span>Authenticating Session...</span>
            ) : (
              <>
                <span>Enter Forensic Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-[rgba(185,200,220,0.08)] text-center">
          <Link to="/" className="text-xs font-mono text-[#9BA7B8] hover:text-[#FF7547] transition-colors">
            ← Return to Public Showcase
          </Link>
        </div>
      </div>
    </div>
  );
};
