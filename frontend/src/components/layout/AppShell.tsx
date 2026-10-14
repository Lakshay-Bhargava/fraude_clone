import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import {
  Bell,
  Search,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  AlertTriangle,
  Languages,
  Plus,
  ShieldAlert,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CommandPalette } from '../ui/CommandPalette';
import { QuickScanModal } from '../ui/QuickScanModal';

interface NavTab {
  nameKey: string;
  defaultName: string;
  href: string;
  badge?: number;
}

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickScanModalOpen, setQuickScanModalOpen] = useState(false);

  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState<number>(0);
  const [flaggedCount, setFlaggedCount] = useState<number>(0);
  const [activeToastAlert, setActiveToastAlert] = useState<{ id: string; title: string; message: string; adId?: number } | null>(null);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Load alert and stats counts for badges
  useEffect(() => {
    api.listAlerts({ reviewed: false })
      .then((alerts) => {
        const highAlerts = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');
        setUnresolvedAlertsCount(highAlerts.length);
        if (highAlerts.length > 0) {
          const latest = highAlerts[0];
          setActiveToastAlert({
            id: `alert-${latest.id}`,
            title: `High-risk alert (#${latest.id})`,
            message: latest.message,
            adId: latest.advertisement_id,
          });
        }
      })
      .catch(() => setUnresolvedAlertsCount(0));

    api.getStats(true)
      .then((stats) => {
        setFlaggedCount(stats.total_analyzed || 0);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Query parameter filters for the context bar
  const currentPlatform = searchParams.get('platform') || 'All';
  const currentRisk = searchParams.get('risk') || 'All';
  const currentDateRange = searchParams.get('dateRange') || 'all';

  const updateContextFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    // Direct filters to flagged posts table if user is filtering
    const targetPath = (location.pathname === '/console' || location.pathname === '/flagged-posts')
      ? location.pathname
      : '/flagged-posts';

    navigate({ pathname: targetPath, search: next.toString() });
  };

  const navTabs: NavTab[] = [
    { nameKey: 'nav.dashboard', defaultName: 'Overview', href: '/console' },
    { nameKey: 'nav.url_scanner', defaultName: 'URL Scanner', href: '/url-scanner' },
    { nameKey: 'nav.website_xray', defaultName: 'Web X-Ray', href: '/website-xray' },
    { nameKey: 'nav.ad_scanner', defaultName: 'Ad Analysis', href: '/ad-scanner' },
    { nameKey: 'nav.clusters', defaultName: 'Threat Network', href: '/network' },
    { nameKey: 'nav.flagged_posts', defaultName: 'Flagged', href: '/flagged-posts', badge: flaggedCount },
    { nameKey: 'nav.cases', defaultName: 'Cases', href: '/cases' },
    { nameKey: 'nav.reports', defaultName: 'Reports', href: '/reports' },
    { nameKey: 'nav.settings', defaultName: 'Settings', href: '/settings' },
  ];

  const isTabActive = (href: string) => {
    if (href === '/console') {
      return location.pathname === '/console' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.full_name || 'Investigator';
  const displayRole = user?.role || 'Investigator';
  const initials = displayName
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'FS';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
      {/* =========================================================================
          1. TOP NAVIGATION HEADER (Expanded / Larger)
         ========================================================================= */}
      <header className="h-16 sticky top-0 z-40 bg-[var(--card)] border-b border-[var(--border)] px-3 sm:px-6 flex items-center justify-between select-none shadow-2xs gap-3">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-4 xl:gap-6 min-w-0 flex-1">
          <Link to="/console" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative flex items-center justify-center shrink-0">
              <img
                src="/fraudscope_emblem.png"
                alt="FRAUDSCOPE AI"
                className="h-9 w-9 object-contain drop-shadow-[0_2px_6px_rgba(212,175,55,0.2)]"
              />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <div className="flex items-center gap-1">
                <span className="font-sans text-base font-bold tracking-tight text-[var(--text)] group-hover:text-[#D4AF37] transition-colors whitespace-nowrap">
                  FRAUDSCOPE <span className="text-[#D4AF37]">AI</span>
                </span>
              </div>
              <span className="text-[9px] tracking-widest text-[var(--muted)] font-mono uppercase font-semibold mt-0.5 whitespace-nowrap hidden sm:inline">
                Threat Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation Tabs (Desktop >= 900px) */}
          <nav className="hidden lg:flex items-center h-16 gap-0.5 xl:gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1" aria-label="Main Navigation">
            {navTabs.map((tab) => {
              const active = isTabActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={`h-16 flex items-center gap-1.5 px-2.5 xl:px-3 text-xs xl:text-sm font-medium transition-all border-b-[3px] whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[var(--primary)] font-bold text-[var(--text)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
                  }`}
                >
                  <span>{t(tab.nameKey, tab.defaultName)}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                        active
                          ? 'bg-[var(--primary)] text-white font-bold shadow-2xs'
                          : 'bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls: Command-bar, Scan post, Language, Alerts, Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 z-10 bg-[var(--card)] pl-3 border-l border-[var(--border)]/60">
          {/* Command-bar trigger button - Always visible and prominent */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--table-hover)] hover:text-[var(--text)] border border-[var(--border)] rounded-[var(--radius)] transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
            title="Search or jump to... (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
            <span className="text-xs font-medium">Search...</span>
            <kbd className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 bg-[var(--card)] border border-[var(--border)] rounded text-[var(--muted)]">
              Ctrl K
            </kbd>
          </button>

          {/* Primary "Scan post" button */}
          <button
            type="button"
            onClick={() => setQuickScanModalOpen(true)}
            className="btn-primary text-xs xl:text-sm py-1.5 px-3 sm:px-3.5 shadow-sm flex items-center gap-1.5 font-semibold whitespace-nowrap shrink-0"
            title="Scan suspicious advertisement"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('nav.scan_post', 'Scan post')}</span>
          </button>

          {/* Language Switcher Toggle (EN | HI) */}
          <div className="flex items-center p-0.5 rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--border)] text-xs font-mono shrink-0">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 rounded-[2px] transition-all font-semibold ${
                language === 'en'
                  ? 'bg-[var(--primary)] text-white shadow-2xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-1.5 py-0.5 rounded-[2px] transition-all font-semibold ${
                language === 'hi'
                  ? 'bg-[var(--primary)] text-white shadow-2xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              HI
            </button>
          </div>

          {/* Notification Bell */}
          <Link
            to="/alerts"
            className="relative p-1.5 rounded-[var(--radius)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--table-hover)] transition-colors shrink-0"
            title="High-risk threat alerts"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unresolvedAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--card)]" />
            )}
          </Link>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-[var(--radius)] hover:bg-[var(--table-hover)] transition-colors border border-transparent hover:border-[var(--border)]"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--accent)] text-white text-xs font-mono font-bold flex items-center justify-center shadow-2xs ring-1 ring-[var(--border)]">
                {initials}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2.5 border-b border-[var(--border)]">
                  <div className="text-sm font-bold text-[var(--text)] truncate">{displayName}</div>
                  <div className="text-xs font-mono text-[var(--muted)] truncate">{displayRole}</div>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-3.5 py-2 text-xs sm:text-sm text-[var(--text)] hover:bg-[var(--table-hover)] transition-colors"
                >
                  {t('nav.settings', 'Settings')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-[#A8341C] hover:bg-[#FDE8E8] transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout', 'Log out')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Hamburger Menu Toggle (Below 900px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-[var(--radius)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--table-hover)] transition-colors"
            aria-label="Toggle navigation tabs"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Below 900px) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 space-y-1 z-30">
          {navTabs.map((tab) => {
            const active = isTabActive(tab.href);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2 rounded-[var(--radius)] text-xs ${
                  active
                    ? 'bg-[var(--primary)] text-white font-bold'
                    : 'text-[var(--text)] hover:bg-[var(--table-hover)]'
                }`}
              >
                <span>{t(tab.nameKey, tab.defaultName)}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/20">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          2. CONTEXT BAR UNDER NAV (Enlarged & Clear)
         ========================================================================= */}
      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Left: Platform, Risk, and Date Range Filter Chips */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Platform Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              {t('context.platform', 'Platform')}:
            </span>
            {(['All', 'Telegram', 'Instagram', 'Facebook', 'WhatsApp'] as const).map((plat) => {
              const active = currentPlatform.toLowerCase() === plat.toLowerCase();
              return (
                <button
                  key={plat}
                  onClick={() => updateContextFilter('platform', plat)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-[var(--radius)] transition-all ${
                    active
                      ? 'bg-[var(--card)] text-[var(--text)] font-bold border border-[var(--border)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--table-hover)]'
                  }`}
                >
                  {plat === 'All' ? t('context.all', 'All') : plat}
                </button>
              );
            })}
          </div>

          <span className="text-[var(--border)] hidden sm:inline">|</span>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              {t('context.risk', 'Risk')}:
            </span>
            {(['All', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => {
              const active = currentRisk.toUpperCase() === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => updateContextFilter('risk', lvl)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-[var(--radius)] transition-all ${
                    active
                      ? 'bg-[var(--card)] text-[var(--text)] font-bold border border-[var(--border)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--table-hover)]'
                  }`}
                >
                  {lvl === 'All'
                    ? t('context.all', 'All')
                    : lvl === 'HIGH'
                    ? t('common.high', 'High')
                    : lvl === 'MEDIUM'
                    ? t('common.medium', 'Medium')
                    : t('common.low', 'Low')}
                </button>
              );
            })}
          </div>

          <span className="text-[var(--border)] hidden sm:inline">|</span>

          {/* Date Range Filter */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              {t('context.date_range', 'Date range')}:
            </span>
            {[
              { id: 'all', labelKey: 'context.all_time', defaultLabel: 'All time' },
              { id: '7d', labelKey: 'context.last_7d', defaultLabel: 'Last 7d' },
              { id: '30d', labelKey: 'context.last_30d', defaultLabel: 'Last 30d' },
            ].map((d) => {
              const active = currentDateRange === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => updateContextFilter('dateRange', d.id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-[var(--radius)] transition-all ${
                    active
                      ? 'bg-[var(--card)] text-[var(--text)] font-bold border border-[var(--border)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--table-hover)]'
                  }`}
                >
                  {t(d.labelKey, d.defaultLabel)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Status: "Synthetic data · Model online" (Phase 1 & 2 requirement) */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)] font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--risk-low)] ring-2 ring-[var(--risk-low)]/20" />
            <span>{t('context.synthetic_data', 'Synthetic data')}</span>
          </span>
          <span>·</span>
          <span>{t('context.model_online', 'Model online')}</span>
        </div>
      </div>

      {/* =========================================================================
          3. DISMISSIBLE TOP-RIGHT TOAST ALERT (Phase 2 Requirement)
         ========================================================================= */}
      {activeToastAlert && (
        <div
          role="alert"
          className="fixed top-14 right-4 z-50 max-w-sm rounded-[var(--radius)] bg-[var(--card)] border border-[#F8B4B6] p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-[var(--radius)] bg-[#FDE8E8] text-[#A8341C] shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[var(--text)]">
                  {activeToastAlert.title}
                </div>
                <div className="text-[11px] text-[var(--muted)] leading-snug line-clamp-2">
                  {activeToastAlert.message}
                </div>
                {activeToastAlert.adId && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveToastAlert(null);
                      navigate(`/flagged-posts?search=${activeToastAlert.adId}`);
                    }}
                    className="text-[11px] font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-0.5 pt-0.5"
                  >
                    <span>View post</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveToastAlert(null)}
              className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MAIN FULL-WIDTH WORKSPACE CONTENT (No left sidebar)
         ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4">
        <Outlet />
      </main>

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenScanModal={() => setQuickScanModalOpen(true)}
      />

      {/* Quick Scan Post Modal */}
      <QuickScanModal
        isOpen={quickScanModalOpen}
        onClose={() => setQuickScanModalOpen(false)}
      />
    </div>
  );
};
