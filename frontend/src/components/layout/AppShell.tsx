import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanSearch,
  Layers,
  Network,
  Briefcase,
  Bell,
  FileBarChart2,
  Settings,
  Search,
  ExternalLink,
  Menu,
  X,
  User,
  ShieldCheck,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Logo } from '../ui/Logo';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigation: NavItem[] = [
    { name: 'Overview', href: '/console', icon: LayoutDashboard },
    { name: 'Scan Advertisement', href: '/scanner', icon: ScanSearch },
    { name: 'Advertisements', href: '/advertisements', icon: Layers },
    { name: 'Threat Network', href: '/network', icon: Network },
    { name: 'Cases', href: '/cases', icon: Briefcase },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Reports', href: '/reports', icon: FileBarChart2 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/advertisements?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/console')) return 'Intelligence Console';
    if (path.startsWith('/scanner')) return 'Advertisement Scanner';
    if (path.startsWith('/investigations')) return 'Evidence Explorer';
    if (path.startsWith('/advertisements')) return 'Advertisement Explorer';
    if (path.startsWith('/network')) return 'Threat Network Graph';
    if (path.startsWith('/cases')) return 'Case Management';
    if (path.startsWith('/alerts')) return 'Security Alert Center';
    if (path.startsWith('/reports')) return 'Reports & Forensic Export';
    if (path.startsWith('/settings')) return 'System Settings & Engine';
    return 'Forensic Workspace';
  };

  return (
    <div className="flex h-screen bg-[#08090D] text-[#F5F5F7] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#101218] border-r border-white/[0.08] shrink-0 z-20">
        {/* Sidebar Brand */}
        <div className="h-16 flex items-center px-6 border-b border-white/[0.06] bg-[#0c0d12]">
          <Link to="/" className="flex items-center">
            <Logo size="sm" />
          </Link>
        </div>

        {/* Demo Mode Badge */}
        <div className="px-4 py-2.5 bg-[#FF7547]/5 border-b border-[#FF7547]/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF7547] animate-pulse" />
            <span className="text-[10px] font-mono tracking-wider font-semibold text-[#FF7547] uppercase">
              DEMO ANALYST INSTANCE
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#9297A4] border border-white/10 px-1 py-0.5 rounded">
            v1.0
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== '/console' && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                  isActive
                    ? 'bg-[#171A22] text-white border border-[#FF7547]/40 shadow-sm shadow-[#FF7547]/10'
                    : 'text-[#9297A4] hover:text-[#F5F5F7] hover:bg-[#14161f] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#FF7547]' : 'text-[#626775] group-hover:text-[#F5F5F7]'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF7547]" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-[#0d0f15]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#171A22] border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-[#FF7547]">
                Aα
              </div>
              <div>
                <p className="text-xs font-medium text-white leading-tight">Analyst Alpha</p>
                <p className="text-[10px] font-mono text-[#9297A4]">Level 3 Lead</p>
              </div>
            </div>
            <Link
              to="/"
              title="Exit Console"
              className="p-1.5 text-[#9297A4] hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-[11px] font-mono text-[#9297A4] hover:text-[#FF7547] hover:bg-white/[0.03] transition-colors"
          >
            <span>Public Showcase</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#101218]/90 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-[#9297A4] hover:text-white rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>{getPageTitle()}</span>
              </h1>
            </div>
          </div>

          {/* Search Box & Controls */}
          <div className="flex items-center gap-4">
            <form onSubmit={handleGlobalSearch} className="relative hidden md:block w-72">
              <Search className="w-4 h-4 text-[#9297A4] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search record ID, URL, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#171A22] border border-white/10 rounded-md text-white placeholder-[#626775] focus:outline-none focus:border-[#FF7547]/60 font-mono transition-colors"
              />
            </form>

            {/* Quick Demo Scan CTA */}
            <button
              onClick={() => navigate('/scanner')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#FF7547] text-white text-xs font-mono font-medium hover:bg-[#FF8A65] transition-colors"
            >
              <ScanSearch className="w-3.5 h-3.5" />
              <span>New Scan</span>
            </button>
          </div>
        </header>

        {/* Global Demo Data Banner */}
        <div className="bg-[#171A22] border-b border-white/[0.06] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-[#9297A4]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 bg-[#FF7547]/20 text-[#FF7547] font-bold rounded text-[10px]">
              DEMO DATA
            </span>
            <span className="truncate">
              Fictional demonstration records active. Investigative scores represent risk indicators, not verified fraud verdicts.
            </span>
          </div>
          <Link to="/settings" className="hover:text-white underline hidden sm:inline ml-4 shrink-0">
            Engine Config
          </Link>
        </div>

        {/* Main Routed Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#08090D] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-xs bg-[#101218] border-r border-white/10 h-full flex flex-col z-10">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <Logo size="sm" />
              <button onClick={() => setMobileSidebarOpen(false)} className="text-[#9297A4] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      isActive ? 'bg-[#171A22] text-[#FF7547]' : 'text-[#9297A4] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};
