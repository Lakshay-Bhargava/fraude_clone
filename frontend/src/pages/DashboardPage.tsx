import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  Search,
  Network,
  Phone,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Activity,
  Calendar,
  ExternalLink,
  AlertCircle,
  Cpu
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../services/api';
import {
  DashboardStats,
  DashboardActivity,
  DashboardPlatform,
  DashboardAuditActivity,
  AdvertisementSummary
} from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EvidenceDrawer } from '../components/investigation/EvidenceDrawer';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<DashboardActivity[]>([]);
  const [platforms, setPlatforms] = useState<DashboardPlatform[]>([]);
  const [activities, setActivities] = useState<DashboardAuditActivity[]>([]);
  const [recentAds, setRecentAds] = useState<AdvertisementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [includeDemo, setIncludeDemo] = useState(true);

  // Selected ad for the Evidence Drawer
  const [selectedAd, setSelectedAd] = useState<AdvertisementSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getDaysCount = (range: '7d' | '14d' | '30d') => {
    if (range === '14d') return 14;
    if (range === '30d') return 30;
    return 7;
  };

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      setErrorMsg(null);
      const days = getDaysCount(dateRange);
      const [statsData, trendsData, platformsData, activityData, adsData] = await Promise.all([
        api.getStats(includeDemo),
        api.getTrends(days, includeDemo),
        api.getPlatforms(includeDemo),
        api.getAuditActivity(8),
        api.listAds({ limit: 6, sort_by: 'created_at', sort_order: 'desc', is_demo: includeDemo ? undefined : false }),
      ]);
      setStats(statsData);
      setTrends(trendsData);
      setPlatforms(platformsData);
      setActivities(activityData);
      setRecentAds(adsData.items);
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
      setErrorMsg(err.message || 'Unable to connect to the backend service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, includeDemo]);

  const openEvidence = (ad: AdvertisementSummary) => {
    setSelectedAd(ad);
    setDrawerOpen(true);
  };

  // Recharts time-series volume data derived from database
  const volumeData = trends.map((t) => ({
    date: t.date.slice(5), // 'MM-DD'
    scans: t.total,
    high: t.high_risk,
    medium: t.medium_risk,
    low: t.low_risk,
  }));

  // Donut chart risk distribution data derived from database
  const totalRisks = (stats?.high_risk_count ?? 0) + (stats?.medium_risk_count ?? 0) + (stats?.low_risk_count ?? 0);
  const riskDistribution = totalRisks > 0 ? [
    { name: 'High Risk', value: stats?.high_risk_count ?? 0, color: '#EF4444' },
    { name: 'Medium Risk', value: stats?.medium_risk_count ?? 0, color: '#F59E0B' },
    { name: 'Low Risk', value: stats?.low_risk_count ?? 0, color: '#10B981' },
  ] : [];

  // Platform comparison data from database
  const platformData = platforms.map((p) => ({
    platform: p.platform || 'Unknown',
    suspicious: p.suspicious,
    total: p.total,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ERROR BANNER WITH RETRY */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-between text-xs text-[#EF4444] font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="px-3 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 font-bold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* A. WELCOME HEADER */}
      <div className="floating-card-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs font-mono text-[#6366F1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            <span>OPERATIONAL THREAT INTELLIGENCE PLATFORM</span>
            {stats?.demo_mode && (
              <span className="ml-2 px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 text-[10px] font-bold">
                DEMO MODE
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, Investigator
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Database-backed surveillance feed tracking financial advertisement fraud, mule account recruitment, and unauthorized UPI payment channels across digital media.
          </p>
        </div>

        {/* Action Buttons & Provenance Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Data Provenance Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.2)] text-xs font-mono">
            <button
              onClick={() => setIncludeDemo(true)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                includeDemo
                  ? 'bg-[#6366F1] text-white font-bold shadow-md shadow-[#6366F1]/30'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Show all records including imported synthetic demo benchmark"
            >
              <span>All Records</span>
              <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px]">
                {stats ? (stats.demo_records_count ?? 0) + (stats.live_scans_count ?? 0) : '—'}
              </span>
            </button>
            <button
              onClick={() => setIncludeDemo(false)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                !includeDemo
                  ? 'bg-[#10B981] text-white font-bold shadow-md shadow-[#10B981]/30'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Show only live user-submitted scans"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>Live Scans</span>
              <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px]">
                {stats?.live_scans_count ?? 0}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="btn-secondary text-xs flex items-center gap-2"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <Link
              to="/scanner"
              className="btn-primary text-xs flex items-center gap-2 shadow-lg shadow-[#6366F1]/25 hover:shadow-[#6366F1]/40"
            >
              <ScanSearch className="w-4 h-4" />
              <span>Scan Ad</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ACTIVE ML MODEL STATUS & METADATA CARD */}
      <div className="floating-card p-4 border-[#6366F1]/30 bg-gradient-to-r from-[#0D182B] via-[#131C2E] to-[#0D182B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1] shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                Active ML Forensic Engine
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                {stats?.model_status?.toUpperCase() || 'ONLINE'}
              </span>
              {!includeDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  LIVE SCANS FILTER ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              TF-IDF (1-2 Ngrams, sublinear) + Balanced Logistic Regression • Disjoint Group-Split Validated
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#0A101D] border border-[rgba(148,163,184,0.1)]">
            <span className="text-[10px] text-[#64748B] block">MODEL VERSION</span>
            <span className="text-white font-semibold truncate block">{stats?.model_version || 'tfidf-lr-v1.0'}</span>
          </div>
          <div className="p-2 rounded-lg bg-[#0A101D] border border-[rgba(148,163,184,0.1)]">
            <span className="text-[10px] text-[#64748B] block">VOCABULARY</span>
            <span className="text-[#22D3EE] font-semibold">{stats?.vocabulary_size ?? 572} Tokens</span>
          </div>
          <div className="p-2 rounded-lg bg-[#0A101D] border border-[rgba(148,163,184,0.1)]">
            <span className="text-[10px] text-[#64748B] block">TEST ROC-AUC</span>
            <span className="text-[#10B981] font-semibold">0.9713</span>
          </div>
          <div className="p-2 rounded-lg bg-[#0A101D] border border-[rgba(148,163,184,0.1)]">
            <span className="text-[10px] text-[#64748B] block">PROVENANCE</span>
            <span className={includeDemo ? 'text-[#F59E0B] font-semibold' : 'text-[#10B981] font-semibold'}>
              {includeDemo ? 'All Records' : 'Live Only'}
            </span>
          </div>
        </div>
      </div>

      {/* B. TOP KPI METRICS (DATABASE BACKED) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Scanned */}
        <div className="floating-card floating-card-interactive flex flex-col justify-between border-[rgba(148,163,184,0.15)]">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-3">
              <span className="text-xs font-mono uppercase tracking-wider">Total Ads Analyzed</span>
              <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-1">
              {loading ? '—' : stats?.total_analyzed ?? 0}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-[rgba(148,163,184,0.1)]">
            <span className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-[#10B981]" /> Persisted records
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              {stats?.awaiting_review_count ?? 0} pending review
            </span>
          </div>
        </div>

        {/* Card 2: High-Risk Alerts */}
        <div className="floating-card floating-card-interactive flex flex-col justify-between border-[#EF4444]/25">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#EF4444]">High-Risk Alerts</span>
              <div className="w-9 h-9 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-center justify-center text-[#EF4444]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-[#EF4444] mb-1">
              {loading ? '—' : stats?.high_risk_count ?? 0}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-[rgba(148,163,184,0.1)]">
            <span className="text-[11px] font-mono text-[#EF4444] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {stats?.total_analyzed
                ? `${Math.round(((stats.high_risk_count ?? 0) / Math.max(1, stats.total_analyzed)) * 100)}% of scans`
                : '0%'}
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">Score &gt;= 70</span>
          </div>
        </div>

        {/* Card 3: Active Fraud Clusters */}
        <div className="floating-card floating-card-interactive flex flex-col justify-between border-[#F59E0B]/25">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#F59E0B]">Active Entity Clusters</span>
              <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B]">
                <Network className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-[#F59E0B] mb-1">
              {loading ? '—' : stats?.active_clusters_count ?? stats?.open_cases_count ?? 0}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-[rgba(148,163,184,0.1)]">
            <span className="text-[11px] font-mono text-[#F59E0B] flex items-center gap-0.5">
              <Layers className="w-3 h-3" /> Linked syndicates
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">Entities in &ge;2 ads</span>
          </div>
        </div>

        {/* Card 4: Phone/UPI IDs Found */}
        <div className="floating-card floating-card-interactive flex flex-col justify-between border-[#22D3EE]/25">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#22D3EE]">Entities Extracted</span>
              <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/25 flex items-center justify-center text-[#22D3EE]">
                <Phone className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-[#22D3EE] mb-1">
              {loading ? '—' : stats?.total_entities_tracked ?? 0}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-[rgba(148,163,184,0.1)]">
            <span className="text-[11px] font-mono text-[#22D3EE] flex items-center gap-0.5">
              <Activity className="w-3 h-3" /> Phone, UPI, URLs
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">Normalized values</span>
          </div>
        </div>
      </div>

      {/* C. ANALYTICS SECTION (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Posts Scanned Over Time */}
        <div className="floating-card lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[rgba(148,163,184,0.1)]">
            <div>
              <h2 className="text-sm font-semibold text-white">Posts Scanned Over Time</h2>
              <p className="text-xs text-[#94A3B8]">Database time-series volume across verified reporting intervals</p>
            </div>
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 bg-[#0D182B] p-1 rounded-lg border border-[rgba(148,163,184,0.15)] text-[11px] font-mono">
              <button
                onClick={() => setDateRange('7d')}
                className={`px-2 py-0.5 rounded transition-colors ${dateRange === '7d' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8] hover:text-white'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDateRange('14d')}
                className={`px-2 py-0.5 rounded transition-colors ${dateRange === '14d' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8] hover:text-white'}`}
              >
                14 Days
              </button>
              <button
                onClick={() => setDateRange('30d')}
                className={`px-2 py-0.5 rounded transition-colors ${dateRange === '30d' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8] hover:text-white'}`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {volumeData.length === 0 || volumeData.every((v) => v.scans === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs font-mono text-[#64748B]">
                <Activity className="w-8 h-8 mb-2 opacity-40 text-[#6366F1]" />
                <p className="text-[#94A3B8]">No advertisement scans logged in this date interval.</p>
                <p className="text-[11px] text-[#64748B] mt-1">Run an advertisement scan to start populating volume trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18243A',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#E5E9F2',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="scans" name="Total Scans" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#scansGradient)" />
                  <Area type="monotone" dataKey="high" name="High Risk" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#highGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Donut Risk Distribution */}
        <div className="floating-card space-y-4">
          <div className="pb-2 border-b border-[rgba(148,163,184,0.1)]">
            <h2 className="text-sm font-semibold text-white">Risk Distribution</h2>
            <p className="text-xs text-[#94A3B8]">Actual severity counts in current database</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {totalRisks === 0 ? (
              <div className="text-center p-4 text-xs font-mono text-[#64748B]">
                <ShieldCheck className="w-8 h-8 mb-2 mx-auto opacity-40 text-[#10B981]" />
                <p className="text-[#94A3B8]">No evaluated records in database.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18243A',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#E5E9F2',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[rgba(148,163,184,0.1)] text-center font-mono text-[11px]">
            <div>
              <p className="text-[#EF4444] font-bold">{stats?.high_risk_count ?? 0}</p>
              <p className="text-[#94A3B8]">High</p>
            </div>
            <div>
              <p className="text-[#F59E0B] font-bold">{stats?.medium_risk_count ?? 0}</p>
              <p className="text-[#94A3B8]">Medium</p>
            </div>
            <div>
              <p className="text-[#10B981] font-bold">{stats?.low_risk_count ?? 0}</p>
              <p className="text-[#94A3B8]">Low</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Comparison & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Platform Comparison Chart */}
        <div className="floating-card space-y-4">
          <div className="pb-2 border-b border-[rgba(148,163,184,0.1)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Platform-wise Suspicious Posts</h2>
              <p className="text-xs text-[#94A3B8]">Actual channel distribution aggregated from database records</p>
            </div>
          </div>

          <div className="h-56 w-full">
            {platformData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs font-mono text-[#64748B]">
                <Layers className="w-8 h-8 mb-2 opacity-40 text-[#6366F1]" />
                <p className="text-[#94A3B8]">No platform records aggregated yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="platform" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18243A',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#E5E9F2',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="suspicious" name="Suspicious (High+Med)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" name="Total Ads" fill="#22D3EE" opacity={0.6} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* D. RECENT ACTIVITY FEED */}
        <div className="floating-card space-y-4">
          <div className="pb-2 border-b border-[rgba(148,163,184,0.1)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Audit Trail Activity</h2>
              <p className="text-xs text-[#94A3B8]">Verifiable events recorded in the AuditEvent database table</p>
            </div>
            <Link to="/flagged-posts" className="text-xs text-[#6366F1] hover:underline font-mono">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[#64748B]">
                <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>No audit trail events recorded in database yet.</p>
              </div>
            ) : (
              activities.map((act) => {
                const isHigh = act.severity === 'HIGH' || act.action === 'CREATE_CASE';
                const isMed = act.severity === 'MEDIUM';
                const badgeColor = isHigh
                  ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30'
                  : isMed
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30'
                  : 'bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]/30';

                return (
                  <div
                    key={act.id}
                    onClick={() => navigate('/flagged-posts')}
                    className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] hover:border-[#6366F1]/40 transition-colors cursor-pointer group flex items-start gap-3"
                  >
                    <div className={`p-1.5 rounded-lg border text-xs font-mono shrink-0 ${badgeColor}`}>
                      {isHigh ? <ShieldAlert className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-white group-hover:text-[#818CF8] transition-colors truncate">
                          {act.action}: {act.entity_type} #{act.entity_id}
                        </p>
                        <span className="text-[10px] font-mono text-[#64748B] whitespace-nowrap ml-2">
                          {formatRelativeTime(act.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug line-clamp-2">
                        {act.details || `Performed by ${act.actor}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RECENT SCANS TABLE SECTION (WITH EVIDENCE DRAWER TRIGGER) */}
      <div className="floating-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(148,163,184,0.1)]">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Flagged Financial Advertisements</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Select any record to inspect indicators or generate forensic case reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="p-2 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] text-[#94A3B8] hover:text-white transition-colors"
              title="Refresh Records"
              aria-label="Refresh records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/flagged-posts"
              className="text-xs text-[#6366F1] hover:underline font-mono flex items-center gap-1 font-semibold ml-1"
            >
              <span>Go to Flagged Posts Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[#64748B] space-y-2">
            <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading flagged posts...</p>
          </div>
        ) : recentAds.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-center text-[#64748B] mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No advertisements scanned yet</h3>
            <p className="text-xs text-[#94A3B8]">
              Submit your first advertisement text to begin detecting suspicious indicators.
            </p>
            <div className="pt-2">
              <Link to="/scanner" className="btn-primary text-xs py-2 px-4">
                Start First Scan
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(148,163,184,0.1)] text-[#64748B] font-mono uppercase text-[11px]">
                  <th className="py-3 px-3">Post ID</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-3">Advertisement Preview</th>
                  <th className="py-3 px-3">Risk Level</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(148,163,184,0.08)]">
                {recentAds.map((ad) => (
                  <tr key={ad.id} className="hover:bg-[#18243A]/40 transition-colors group">
                    <td className="py-3.5 px-3 font-mono font-semibold text-white whitespace-nowrap">
                      {ad.custom_id || `AD-${ad.id}`}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {ad.is_demo || ad.data_source === 'SYNTHETIC_DATASET' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          DEMO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          LIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#94A3B8] whitespace-nowrap">
                      {ad.platform_detected || ad.platform || 'Unknown'}
                    </td>
                    <td className="py-3.5 px-3 max-w-md text-[#E5E9F2] truncate">
                      {ad.original_text}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <RiskBadge level={ad.risk_level} showScore={false} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-white whitespace-nowrap">
                      {ad.risk_score !== null && ad.risk_score !== undefined
                        ? `${Math.round(ad.risk_score)}/100`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={ad.review_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEvidence(ad)}
                        className="text-xs font-semibold text-[#22D3EE] hover:text-white hover:underline flex items-center gap-1 ml-auto"
                      >
                        <span>View Evidence</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Post Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ad={selectedAd}
        onStatusUpdate={(id, status) => {
          setRecentAds((prev) =>
            prev.map((item) => (item.id === id ? { ...item, review_status: status as any } : item))
          );
        }}
      />
    </div>
  );
};
