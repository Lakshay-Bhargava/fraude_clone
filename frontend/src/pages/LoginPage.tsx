import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, User, ArrowRight, Info, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4 cyber-grid relative overflow-hidden">
      {/* Scanner Beam */}
      <div className="scanner-beam" />

      <div className="w-full max-w-md bg-[#101218] border border-white/[0.09] rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <Logo size="md" />
          </Link>
          <h2 className="text-2xl font-bold font-display text-white">Analyst Authentication</h2>
          <p className="text-xs font-mono text-[#9297A4] mt-1">
            Access the FraudScope AI Threat Intelligence Console
          </p>
        </div>

        {/* Demo Mode Notice */}
        <div className="mb-6 p-3.5 rounded-lg bg-[#FF7547]/10 border border-[#FF7547]/30 text-xs text-[#F5F5F7]">
          <div className="flex items-center gap-2 font-mono font-bold text-[#FF7547] text-[11px] mb-1">
            <Info className="w-4 h-4 shrink-0" />
            <span>LOCAL HACKATHON DEMO MODE</span>
          </div>
          <p className="text-[#9297A4] leading-relaxed text-[11px]">
            Authentication is simplified for local evaluation. Production deployment requires an enterprise SSO/OIDC identity provider.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#9297A4] uppercase mb-1.5">
              Analyst Identity
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#626775] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#171A22] border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-[#FF7547]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#9297A4] uppercase mb-1.5">
              Security Token / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#626775] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#171A22] border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-[#FF7547]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-[#FF7547] text-white font-mono font-semibold text-xs uppercase tracking-wider hover:bg-[#FF8A65] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#FF7547]/20"
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

        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
          <Link to="/" className="text-xs font-mono text-[#9297A4] hover:text-[#FF7547] transition-colors">
            ← Return to Public Intelligence Showcase
          </Link>
        </div>
      </div>
    </div>
  );
};
