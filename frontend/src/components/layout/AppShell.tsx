import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Network,
  FileBarChart2,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  ScanSearch,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { api } from '../../services/api';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState<number>(3);
  const [toastAlert, setToastAlert] = useState<{ id: string; title: string; message: string; type: string } | null>(null);

  // Close user profile menu on click outside
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

  // Read current query params for global controls
  const currentSearch = searchParams.get('search') || '';
  const currentPlatform = searchParams.get('platform') || 'All';
  const currentRisk = searchParams.get('risk') || 'All';
  const currentDateRange = searchParams.get('dateRange') || 'all';

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    // Fetch unresolved high risk alerts count from database
    api.listAlerts({ reviewed: false })
      .then((alerts) => {
        const highAlerts = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');
        setUnresolvedAlertsCount(highAlerts.length);
        if (highAlerts.length > 0) {
          const latest = highAlerts[0];
          setToastAlert({
            id: `alert-${latest.id}`,
            title: `Active High-Risk Alert (#${latest.id})`,
            message: latest.message,
            type: 'high',
          });
        }
      })
      .catch(() => {
        setUnresolvedAlertsCount(0);
      });
  }, [location.pathname]);

  // Master 5 Navigation items per Master Prompt specs
  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/console', icon: LayoutDashboard },
    { name: 'Flagged Posts', href: '/flagged-posts', icon: ShieldAlert },
    { name: 'Clusters / Networks', href: '/network', icon: Network },
    { name: 'Reports', href: '/reports', icon: FileBarChart2 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const updateFilters = (newParams: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (!val || val === 'All' || val === 'all') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });

    // If we're on a page that isn't flagged-posts or dashboard, redirect to flagged-posts so investigator sees results
    const targetPath = (location.pathname === '/console' || location.pathname === '/flagged-posts') 
      ? location.pathname 
      : '/flagged-posts';

    navigate({ pathname: targetPath, search: next.toString() });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() });
  };

  return (
    <div className="flex h-screen bg-[#0B1220] text-[#E5E9F2] overflow-hidden">
      {/* Desktop & Tablet Collapsible Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col ${
          collapsed ? 'w-20' : 'w-64'
        } bg-[#091426] border-r border-[rgba(148,163,184,0.15)] shrink-0 z-30 transition-all duration-300 relative shadow-2xl`}
      >
        {/* Brand Header */}
        <div className="h-20 min-h-[80px] flex items-center justify-between px-5 border-b border-[rgba(148,163,184,0.1)] bg-[#08101E]">
          <Link to="/" className="flex items-center overflow-hidden">
            <Logo size="sm" showText={!collapsed} />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E5E9F2] hover:bg-[#131C2E] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 5 Core Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.href === '/console' && (location.pathname === '/console' || location.pathname === '/dashboard')) ||
              (item.href === '/flagged-posts' &&
                (location.pathname === '/flagged-posts' ||
                  location.pathname === '/investigations' ||
                  location.pathname.startsWith('/investigations/'))) ||
              (item.href === '/network' && location.pathname.startsWith('/network')) ||
              (item.href === '/reports' && location.pathname.startsWith('/reports')) ||
              (item.href === '/settings' && location.pathname.startsWith('/settings'));

            return (
              <Link
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={`group flex items-center ${
                  collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                } py-3 rounded-xl text-xs font-medium tracking-wide transition-all relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6366F1]/25 to-[#6366F1]/10 text-white border-l-4 border-l-[#6366F1] border-t border-r border-b border-[rgba(99,102,241,0.25)] shadow-md shadow-[#6366F1]/10 font-semibold'
                    : 'text-[#94A3B8] hover:text-[#E5E9F2] hover:bg-[#131C2E] border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#6366F1]' : 'text-[#64748B] group-hover:text-[#E5E9F2]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </div>

                {/* Badge for Flagged Posts displaying unresolved high-risk alerts */}
                {!collapsed && item.name === 'Flagged Posts' && unresolvedAlertsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-mono font-bold">
                    {unresolvedAlertsCount}
                  </span>
                )}

                {/* Collapsed Badge Indicator */}
                {collapsed && item.name === 'Flagged Posts' && unresolvedAlertsCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#091426]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Quick Scanner Trigger & Status */}
        <div className="p-3 border-t border-[rgba(148,163,184,0.1)] bg-[#08101E] space-y-2">
          {!collapsed ? (
            <Link
              to="/scanner"
              className="w-full btn-primary text-xs py-2.5 px-3 flex items-center justify-center gap-2"
            >
              <ScanSearch className="w-4 h-4" />
              <span>Scan New Post</span>
            </Link>
          ) : (
            <Link
              to="/scanner"
              className="w-full flex items-center justify-center p-2.5 rounded-xl bg-[#6366F1] text-white hover:bg-[#818CF8] transition-colors"
              title="Scan New Post"
            >
              <ScanSearch className="w-4 h-4" />
            </Link>
          )}

          {/* User Profile Footer */}
          <div
            className={`p-2.5 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.1)] flex items-center ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center text-xs font-mono font-bold text-[#6366F1] shrink-0">
                FS
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#E5E9F2] truncate">Lead Investigator</p>
                  <p className="text-[10px] font-mono text-[#10B981] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    FraudScope Engine Active
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar with Search, Filters & Controls */}
        <header className="h-20 min-h-[80px] bg-[#0E1728] border-b border-[rgba(148,163,184,0.15)] flex items-center justify-between px-6 sm:px-8 z-20 shrink-0 shadow-md gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden h-11 w-11 flex items-center justify-center text-[#94A3B8] hover:text-white rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.2)] hover:border-[#6366F1]/40 transition-colors shrink-0 shadow-sm"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5 text-[#E5E9F2]" />
            </button>

            {/* Global Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md xl:max-w-lg">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search posts, phone numbers, UPI IDs, URLs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: '44px' }}
                className="w-full pr-4 h-11 text-xs bg-[#0D182B] border border-[rgba(148,163,184,0.2)] rounded-xl text-[#E5E9F2] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all shadow-inner"
              />
            </form>

            {/* Platform Filter Dropdown */}
            <div className="hidden xl:flex items-center gap-2">
              <span className="text-xs text-[#94A3B8] font-medium">Platform:</span>
              <select
                value={currentPlatform}
                onChange={(e) => updateFilters({ platform: e.target.value })}
                className="h-11 text-xs bg-[#0D182B] border border-[rgba(148,163,184,0.2)] rounded-xl text-[#E5E9F2] px-3.5 focus:outline-none focus:border-[#6366F1]"
              >
                <option value="All">All Platforms</option>
                <option value="Telegram">Telegram</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="YouTube">YouTube</option>
                <option value="X">X (Twitter)</option>
              </select>
            </div>

            {/* Risk Filter Dropdown */}
            <div className="hidden xl:flex items-center gap-2">
              <span className="text-xs text-[#94A3B8] font-medium">Risk:</span>
              <select
                value={currentRisk}
                onChange={(e) => updateFilters({ risk: e.target.value })}
                className="h-11 text-xs bg-[#0D182B] border border-[rgba(148,163,184,0.2)] rounded-xl text-[#E5E9F2] px-3.5 focus:outline-none focus:border-[#6366F1]"
              >
                <option value="All">All Risk Levels</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="hidden 2xl:flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#94A3B8]" />
              <select
                value={currentDateRange}
                onChange={(e) => updateFilters({ dateRange: e.target.value })}
                className="h-11 text-xs bg-[#0D182B] border border-[rgba(148,163,184,0.2)] rounded-xl text-[#E5E9F2] px-3.5 focus:outline-none focus:border-[#6366F1]"
              >
                <option value="all">All Dates</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Right Header Controls: Notification Bell, Scan CTA & Profile */}
          <div className="flex items-center gap-3.5 shrink-0">
            {/* Quick Scan Post Button */}
            <Link
              to="/scanner"
              className="btn-primary h-11 text-xs px-4 rounded-xl shadow-md shadow-[#6366F1]/25 hidden sm:inline-flex items-center gap-2 font-medium"
            >
              <ScanSearch className="w-4 h-4" />
              <span>Scan Post</span>
            </Link>

            {/* Notification Bell with unread count */}
            <div className="relative">
              <button
                onClick={() => {
                  setToastAlert({
                    id: 'notification-click',
                    title: 'Active High-Risk Alerts',
                    message: `${unresolvedAlertsCount} unreviewed high-risk financial ad groups require investigation.`,
                    type: 'info',
                  });
                }}
                className="h-11 w-11 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.2)] text-[#94A3B8] hover:text-[#E5E9F2] hover:border-[#6366F1]/40 transition-colors flex items-center justify-center"
                title={`${unresolvedAlertsCount} Unresolved High-Risk Alerts`}
                aria-label="Notification bell"
              >
                <Bell className="w-4 h-4" />
                {unresolvedAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center shadow">
                    {unresolvedAlertsCount}
                  </span>
                )}
              </button>
            </div>

            {/* User Avatar & Profile Menu */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="h-11 flex items-center gap-2.5 px-3 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.2)] hover:border-[#6366F1]/40 transition-colors"
                aria-label="User Profile"
              >
                <div className="w-7 h-7 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-xs font-bold shadow-inner">
                  FS
                </div>
                <span className="text-xs font-medium text-[#E5E9F2] hidden md:inline">Investigator</span>
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[rgba(148,163,184,0.2)] shadow-2xl py-1.5 z-50 animate-fade-in"
                  style={{ backgroundColor: '#18243A' }}
                >
                  <div className="px-3.5 py-2.5 border-b border-[rgba(148,163,184,0.1)]">
                    <p className="text-xs font-semibold text-white">Investigator Alpha</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">fraudscope@intel.sec</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#E5E9F2] hover:bg-[#131C2E] hover:text-white transition-colors no-underline"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>System Settings</span>
                    </Link>
                    <Link
                      to="/reports"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#E5E9F2] hover:bg-[#131C2E] hover:text-white transition-colors no-underline"
                    >
                      <FileBarChart2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Exported Reports</span>
                    </Link>
                  </div>
                  <div className="border-t border-[rgba(148,163,184,0.1)] pt-1">
                    <Link
                      to="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors no-underline"
                    >
                      <span>Logout Session</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Live Alert Toast Banner */}
        {toastAlert && (
          <div 
            className="border-b border-[#EF4444]/30 px-4 py-2.5 flex items-center justify-between z-10 transition-all shadow-md shrink-0"
            style={{ backgroundColor: '#18243A' }}
          >
            <div className="flex items-center gap-3">
              <span className="p-1.5 rounded-lg bg-[#EF4444]/20 text-[#EF4444] shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>{toastAlert.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444]">LIVE</span>
                </p>
                <p className="text-[11px] text-[#94A3B8]">{toastAlert.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/network"
                onClick={() => setToastAlert(null)}
                className="text-xs font-semibold text-[#22D3EE] hover:text-white hover:underline px-2 py-1 transition-colors no-underline"
              >
                View Cluster
              </Link>
              <button
                onClick={() => setToastAlert(null)}
                className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#131C2E] rounded-lg transition-colors flex items-center justify-center bg-transparent border-0 outline-none"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Routed Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#0B1220] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.82)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div 
            className="relative w-72 max-w-[85vw] border-r border-[rgba(148,163,184,0.15)] h-full flex flex-col z-[101] shadow-2xl"
            style={{ backgroundColor: '#091426' }}
          >
            <div 
              className="h-20 min-h-[80px] flex items-center justify-between px-5 border-b border-[rgba(148,163,184,0.1)]"
              style={{ backgroundColor: '#08101E' }}
            >
              <Logo size="sm" />
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#131C2E] transition-colors"
                aria-label="Close menu drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  (item.href === '/console' && (location.pathname === '/console' || location.pathname === '/dashboard')) ||
                  (item.href === '/flagged-posts' &&
                    (location.pathname === '/flagged-posts' ||
                      location.pathname === '/investigations' ||
                      location.pathname.startsWith('/investigations/'))) ||
                  (item.href === '/network' && location.pathname.startsWith('/network')) ||
                  (item.href === '/reports' && location.pathname.startsWith('/reports')) ||
                  (item.href === '/settings' && location.pathname.startsWith('/settings'));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium no-underline transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#6366F1]/25 to-[#6366F1]/10 text-white border-l-4 border-l-[#6366F1] font-semibold'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#131C2E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#6366F1]' : 'text-[#64748B]'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.name === 'Flagged Posts' && unresolvedAlertsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#EF4444] text-[10px] font-bold font-mono">
                        {unresolvedAlertsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div 
              className="p-4 border-t border-[rgba(148,163,184,0.1)]"
              style={{ backgroundColor: '#08101E' }}
            >
              <Link
                to="/scanner"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 no-underline"
              >
                <ScanSearch className="w-4 h-4" />
                <span>Scan New Post</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
