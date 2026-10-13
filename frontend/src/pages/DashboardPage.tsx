import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Activity
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
  Legend
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, DashboardActivity, AdvertisementSummary } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [recentAds, setRecentAds] = useState<AdvertisementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters for recent table
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statsData, actData, adsData] = await Promise.all([
        api.getStats(),
        api.getActivity(),
        api.listAds({ limit: 8, search, risk_level: riskFilter, review_status: statusFilter })
      ]);
      setStats(statsData);
      setActivity(actData);
      setRecentAds(adsData.items);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [riskFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Pie chart data
  const pieData = stats
    ? [
        { name: 'High Risk', value: stats.high_risk_count, color: '#FF4D5A' },
        { name: 'Medium Risk', value: stats.medium_risk_count, color: '#F3B84B' },
        { name: 'Low Risk', value: stats.low_risk_count, color: '#49D6A5' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Forensic Intelligence Overview</h2>
          <p className="text-xs font-mono text-[#9297A4] mt-0.5">
            Aggregated metrics calculated live from database records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171A22] border border-white/10 text-xs font-mono text-[#9297A4] hover:text-white hover:border-white/20 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FF7547]' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/scanner"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#FF7547] text-white text-xs font-mono font-medium hover:bg-[#FF8A65] transition-colors"
          >
            <span>Scan Ad</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-[#101218] border border-white/[0.08]">
          <span className="text-[10px] font-mono text-[#9297A4] uppercase">Total Analyzed</span>
          <div className="text-2xl font-bold font-display text-white mt-1">
            {stats?.total_analyzed ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#626775] mt-1">Total in repository</div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-[#101218] border border-[#FF4D5A]/20">
          <span className="text-[10px] font-mono text-[#FF4D5A] uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D5A]" />
            High Risk
          </span>
          <div className="text-2xl font-bold font-display text-[#FF4D5A] mt-1">
            {stats?.high_risk_count ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#626775] mt-1">&ge; 65 Indicator</div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-[#101218] border border-[#F3B84B]/20">
          <span className="text-[10px] font-mono text-[#F3B84B] uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F3B84B]" />
            Medium Risk
          </span>
          <div className="text-2xl font-bold font-display text-[#F3B84B] mt-1">
            {stats?.medium_risk_count ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#626775] mt-1">35 - 64 Indicator</div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-[#101218] border border-[#49D6A5]/20">
          <span className="text-[10px] font-mono text-[#49D6A5] uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#49D6A5]" />
            Low Risk
          </span>
          <div className="text-2xl font-bold font-display text-[#49D6A5] mt-1">
            {stats?.low_risk_count ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#626775] mt-1">&lt; 35 Indicator</div>
        </div>

        {/* Metric 5 */}
        <div className="p-4 rounded-xl bg-[#101218] border border-white/[0.08]">
          <span className="text-[10px] font-mono text-[#9297A4] uppercase">Open Cases</span>
          <div className="text-2xl font-bold font-display text-white mt-1">
            {stats?.open_cases_count ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#626775] mt-1">Active syndicates</div>
        </div>

        {/* Metric 6 */}
        <div className="p-4 rounded-xl bg-[#101218] border border-[#FF7547]/20">
          <span className="text-[10px] font-mono text-[#FF7547] uppercase">Awaiting Review</span>
          <div className="text-2xl font-bold font-display text-[#FF7547] mt-1">
            {stats?.awaiting_review_count ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#626775] mt-1">Triage backlog</div>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-day Analysis Activity Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#101218] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Analysis Activity Volume (Past 7 Days)</h3>
              <p className="text-[11px] font-mono text-[#9297A4]">Daily distribution by risk tier</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#9297A4] border border-white/10">
              TIME SERIES
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4D5A" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#FF4D5A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#49D6A5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#49D6A5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#626775" tick={{ fontSize: 10, fill: '#9297A4' }} />
                <YAxis stroke="#626775" tick={{ fontSize: 10, fill: '#9297A4' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#171A22', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="high_risk" name="High Risk" stroke="#FF4D5A" fillOpacity={1} fill="url(#colorHigh)" />
                <Area type="monotone" dataKey="low_risk" name="Low / Benign" stroke="#49D6A5" fillOpacity={1} fill="url(#colorLow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Risk Category Distribution Donut */}
        <div className="p-5 rounded-xl bg-[#101218] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Risk Tier Breakdown</h3>
            <p className="text-[11px] font-mono text-[#9297A4] mb-2">Overall proportion of flagged advertisements</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#171A22', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px' }}
                />
                <Legend
                  formatter={(val) => <span className="text-[10px] font-mono text-[#9297A4]">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-white/[0.06] text-center text-[10px] font-mono text-[#626775]">
            DATABASE TOTAL: {stats?.total_analyzed ?? 0} ADVERTISEMENTS
          </div>
        </div>
      </div>

      {/* Recent Records Forensic Table */}
      <div className="p-5 rounded-xl bg-[#101218] border border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Advertisement Analyses</h3>
            <p className="text-[11px] font-mono text-[#9297A4]">
              Inspect extracted evidence, highlighted triggers, and case connections
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search ad text or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs bg-[#171A22] border border-white/10 rounded text-white font-mono placeholder-[#626775] focus:outline-none focus:border-[#FF7547]"
              />
              <Search className="w-3.5 h-3.5 text-[#626775] absolute left-2 top-1/2 -translate-y-1/2" />
            </form>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="py-1 px-2 text-xs bg-[#171A22] border border-white/10 rounded text-[#9297A4] font-mono focus:outline-none"
            >
              <option value="">All Risk Bands</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 text-xs bg-[#171A22] border border-white/10 rounded text-[#9297A4] font-mono focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="ESCALATED">Escalated</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-[10px] font-mono text-[#9297A4] uppercase bg-[#14161f]">
              <tr>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Advertisement Preview</th>
                <th className="py-2.5 px-3">Risk Index</th>
                <th className="py-2.5 px-3">Disposition Status</th>
                <th className="py-2.5 px-3">Date (UTC)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentAds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9297A4] font-mono text-xs">
                    No matching advertisement records found.
                  </td>
                </tr>
              ) : (
                recentAds.map((ad) => (
                  <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-white whitespace-nowrap">
                      {ad.custom_id || `AD-${ad.id}`}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-[#9297A4]">
                      {ad.original_text}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={ad.review_status} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-mono text-[#626775] whitespace-nowrap">
                      {new Date(ad.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/investigations/${ad.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#FF7547] hover:text-[#FF8A65] hover:underline"
                      >
                        <span>Evidence</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs font-mono text-[#9297A4]">
          <span>Showing latest {recentAds.length} records</span>
          <Link to="/advertisements" className="hover:text-white underline">
            View All in Advertisement Explorer →
          </Link>
        </div>
      </div>
    </div>
  );
};
