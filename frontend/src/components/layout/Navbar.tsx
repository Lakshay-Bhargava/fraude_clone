import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Shield, Terminal } from 'lucide-react';
import { Logo } from '../ui/Logo';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Intelligence', href: '#intelligence' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Methodology', href: '#methodology' },
    { label: 'About', href: '#about' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#08090D]/90 backdrop-blur-md border-b border-white/[0.08] shadow-2xl shadow-black/80'
          : 'bg-transparent border-b border-white/[0.04]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center">
          <Logo size="md" />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#9297A4] hover:text-[#F5F5F7] transition-colors tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/login"
            className="text-xs font-mono tracking-wider text-[#9297A4] hover:text-white px-3.5 py-2 transition-colors uppercase"
          >
            Sign In
          </Link>
          <Link
            to="/console"
            className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF7547] text-white font-medium text-xs tracking-wider uppercase overflow-hidden shadow-lg shadow-[#FF7547]/20 hover:bg-[#FF8A65] transition-all duration-200"
          >
            <span>Open Console</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-[#9297A4] hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#101218] border-b border-white/[0.08] px-4 pt-4 pb-6 space-y-4">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[#9297A4] hover:text-[#F5F5F7] py-2 border-b border-white/5"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-mono tracking-wider text-[#9297A4] py-2 rounded border border-white/10 uppercase"
            >
              Sign In
            </Link>
            <Link
              to="/console"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-medium tracking-wider text-white bg-[#FF7547] py-2.5 rounded uppercase font-mono font-semibold"
            >
              Open Console ↗
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
