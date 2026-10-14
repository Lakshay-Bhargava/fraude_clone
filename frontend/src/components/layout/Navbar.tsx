import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowUpRight, LogIn, UserPlus } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Detection Engine', href: '#engine' },
    { label: 'Network Mapping', href: '#network' },
    { label: 'Methodology', href: '#methodology' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E8DDB8] shadow-gold-sm'
          : 'bg-[#FAF9F6]/90 backdrop-blur-sm border-b border-[#E8DDB8]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Official FRAUDSCOPE AI Logo */}
        <Link to="/" className="flex items-center">
          <Logo size="md" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-semibold tracking-wider text-[#697386] hover:text-[#202124] transition-colors uppercase"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/console"
              className="btn-gold text-xs py-2 px-4 shadow-sm flex items-center gap-2"
            >
              <span>Investigator Console</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#A67C00]" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#697386] hover:text-[#202124] bg-[#FFFDF7] border border-[#E8DDB8]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#202124]" /> : <Menu className="w-5 h-5 text-[#202124]" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF7] border-b border-[#E8DDB8] px-5 pt-4 pb-6 space-y-4 shadow-gold-md">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold tracking-wider text-[#697386] hover:text-[#202124] py-2 border-b border-[#E8DDB8]/40 uppercase"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link
                to="/console"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-gold text-center text-xs py-2.5"
              >
                Open Investigator Console ↗
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary text-center text-xs py-2.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-gold text-center text-xs py-2.5"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
