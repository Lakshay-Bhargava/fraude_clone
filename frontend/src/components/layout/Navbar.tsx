import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Logo } from '../ui/Logo';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', href: '#overview' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Methodology', href: '#methodology' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B1220]/90 backdrop-blur-md border-b border-[rgba(148,163,184,0.15)] shadow-2xl shadow-black/60'
          : 'bg-transparent border-b border-[rgba(148,163,184,0.06)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* FinGuard AI Logo */}
        <Link to="/" className="flex items-center">
          <Logo size="md" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#94A3B8] hover:text-[#E5E9F2] transition-colors tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/scanner"
            className="text-xs font-mono tracking-wider text-[#94A3B8] hover:text-white px-3.5 py-2 transition-colors uppercase"
          >
            Scan Post
          </Link>
          <Link
            to="/console"
            className="btn-primary text-xs py-2 px-4 shadow-lg shadow-[#6366F1]/20"
          >
            <span>Open Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white bg-[#131C2E] border border-[rgba(148,163,184,0.15)]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0E1728] border-b border-[rgba(148,163,184,0.15)] px-4 pt-4 pb-6 space-y-4 shadow-2xl">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[#94A3B8] hover:text-[#E5E9F2] py-2 border-b border-[rgba(148,163,184,0.08)]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              to="/scanner"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-secondary text-center text-xs py-2.5"
            >
              Scan Advertisement
            </Link>
            <Link
              to="/console"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary text-center text-xs py-2.5"
            >
              Open Dashboard ↗
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
