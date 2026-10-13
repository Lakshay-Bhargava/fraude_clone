import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ScanSearch,
  Trash2,
  X,
  Calendar,
  Send,
  Camera,
  Share2,
  Globe,
  Video,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementSummary } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EvidenceDrawer } from '../components/investigation/EvidenceDrawer';

export const AdvertisementsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [ads, setAds] = useState<AdvertisementSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Sync with global URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('risk') || '');
  const [platformFilter, setPlatformFilter] = useState(searchParams.get('platform') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [provenanceFilter, setProvenanceFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<AdvertisementSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // List of keywords to highlight in snippets
  const suspiciousKeywords = [
    'account for rent',
    'bank account rent',
    'current account available',
    'fresh current',
    'ATM card',
    'card + PIN',
    'card aur PIN',
    'linked SIM',
    'linked SIM ke saath',
    'account kiraye pe',
    'rent par',
    'urgent buyers',
    'urgent buyers only',
    'guaranteed returns',
    'UPI access',
    'UPI ID for rent',
    'merchant UPI',
    'debit card and account',
    'fresh current account required',
  ];

  // Helper to render text with highlighted keywords
  const renderHighlightedSnippet = (text: string) => {
    if (!text) return 'No text snippet';
    let parts: { text: string; highlight: boolean }[] = [{ text, highlight: false }];

    suspiciousKeywords.forEach((kw) => {
      const nextParts: { text: string; highlight: boolean }[] = [];
      parts.forEach((part) => {
        if (part.highlight) {
          nextParts.push(part);
          return;
        }
        const lowerPart = part.text.toLowerCase();
        const lowerKw = kw.toLowerCase();
        let startIdx = 0;
        let foundIdx = lowerPart.indexOf(lowerKw, startIdx);

        if (foundIdx === -1) {
          nextParts.push(part);
        } else {
          while (foundIdx !== -1) {
            if (foundIdx > startIdx) {
              nextParts.push({ text: part.text.slice(startIdx, foundIdx), highlight: false });
            }
            nextParts.push({ text: part.text.slice(foundIdx, foundIdx + kw.length), highlight: true });
            startIdx = foundIdx + kw.length;
            foundIdx = lowerPart.indexOf(lowerKw, startIdx);
          }
          if (startIdx < part.text.length) {
            nextParts.push({ text: part.text.slice(startIdx), highlight: false });
          }
        }
      });
      parts = nextParts;
    });

    return parts.map((chunk, idx) =>
      chunk.highlight ? (
        <span
          key={idx}
          className="bg-[#EF4444]/25 text-[#EF4444] px-1 py-0.5 rounded font-semibold border border-[#EF4444]/40"
        >
          {chunk.text}
        </span>
      ) : (
        <span key={idx}>{chunk.text}</span>
      )
    );
  };

  // Helper to get platform icon
  const getPlatformIcon = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('telegram')) return <Send className="w-3.5 h-3.5 text-[#22D3EE]" />;
    if (p.includes('instagram')) return <Camera className="w-3.5 h-3.5 text-[#E1306C]" />;
    if (p.includes('facebook')) return <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />;
    if (p.includes('youtube')) return <Video className="w-3.5 h-3.5 text-[#EF4444]" />;
    return <Globe className="w-3.5 h-3.5 text-[#6366F1]" />;
  };

  // Fetch advertisements
  const fetchAds = async () => {
    try {
      const isDemoParam = provenanceFilter === 'live' ? false : provenanceFilter === 'demo' ? true : undefined;
      const res = await api.listAds({
        page,
        limit,
        search: search.trim() || undefined,
        risk_level: riskFilter && riskFilter !== 'All' ? riskFilter : undefined,
        review_status: statusFilter && statusFilter !== 'All' ? statusFilter : undefined,
        is_demo: isDemoParam,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      let items = res.items;

      // Filter by platform in client if specified
      if (platformFilter && platformFilter !== 'All') {
        items = items.filter(
          item => (item.platform_detected || '').toLowerCase() === platformFilter.toLowerCase()
        );
      }

      setAds(items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      console.error('Failed to load advertisements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep in sync with URL search params from top nav
    const querySearch = searchParams.get('search') || '';
    const queryRisk = searchParams.get('risk') || '';
    const queryPlatform = searchParams.get('platform') || '';

    setSearch(querySearch);
    setRiskFilter(queryRisk);
    setPlatformFilter(queryPlatform);
  }, [searchParams]);

  useEffect(() => {
    fetchAds();
  }, [page, search, riskFilter, platformFilter, statusFilter, provenanceFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAds();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRiskFilter('');
    setPlatformFilter('');
    setStatusFilter('');
    setProvenanceFilter('All');
    setSearchParams({});
    setPage(1);
  };

  const openEvidenceModal = (ad: AdvertisementSummary) => {
    setSelectedAd(ad);
    setDrawerOpen(true);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteAd(id);
      setDeleteConfirmId(null);
      await fetchAds();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  const hasActiveFilters = Boolean(search || (riskFilter && riskFilter !== 'All') || (platformFilter && platformFilter !== 'All') || statusFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Flagged Posts
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-semibold">
              Live Investigation
            </span>
          </div>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Monitor, inspect, and investigate suspicious financial advertisements across social media channels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAds}
            className="p-2.5 rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.15)] text-[#94A3B8] hover:text-white transition-colors"
            title="Refresh flagged posts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#6366F1]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="floating-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search keywords, post IDs, phone numbers, UPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs input-surface placeholder-[#64748B]"
          />
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs input-surface text-[#94A3B8]"
          >
            <option value="">All Platforms</option>
            <option value="Telegram">Telegram</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="YouTube">YouTube</option>
            <option value="X">X (Twitter)</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs input-surface text-[#94A3B8]"
          >
            <option value="">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs input-surface text-[#94A3B8]"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
            <option value="ESCALATED">Escalated</option>
            <option value="BENIGN">Benign</option>
          </select>

          {/* Provenance Filter */}
          <select
            value={provenanceFilter}
            onChange={(e) => { setProvenanceFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs input-surface text-[#94A3B8] font-mono"
          >
            <option value="All">All Provenance</option>
            <option value="live">Live User Scans</option>
            <option value="demo">Demo Benchmark Data</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="py-2 px-3 text-xs rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Flagged Posts Investigation Table */}
      <div className="floating-card p-0 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[rgba(148,163,184,0.12)] text-[11px] font-mono text-[#64748B] uppercase bg-[#091426]">
              <tr>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('id')}>
                  <div className="flex items-center gap-1">
                    <span>Post ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Advertisement Snippet</th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('risk_score')}>
                  <div className="flex items-center gap-1">
                    <span>Risk Level & Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Extracted Indicators</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Detection Date</th>
                <th className="py-3 px-4 text-right">Evidence Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(148,163,184,0.08)] font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#64748B] font-mono">
                    <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading flagged advertisements...
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#94A3B8]">
                    No advertisements match the selected filters or search terms.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-[#18243A]/50 transition-colors group">
                    {/* Platform Icon & Name */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#0D182B] border border-[rgba(148,163,184,0.15)]">
                          {getPlatformIcon(ad.platform_detected)}
                        </div>
                        <span className="font-medium text-[#E5E9F2]">
                          {ad.platform_detected || 'Telegram'}
                        </span>
                      </div>
                    </td>

                    {/* Post ID & Provenance */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-white">
                        {ad.custom_id || `AD-${ad.id}`}
                      </div>
                      <div className="mt-1">
                        {ad.is_demo || ad.data_source === 'SYNTHETIC_DATASET' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            DEMO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            LIVE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Advertisement Snippet with highlighted words */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md text-[#E5E9F2] leading-relaxed">
                      <div className="line-clamp-2">
                        {renderHighlightedSnippet(ad.original_text)}
                      </div>
                    </td>

                    {/* Risk Badge with 0-100 score */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                    </td>

                    {/* Extracted Indicators */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[#22D3EE]">
                      <span className="bg-[#22D3EE]/10 px-2 py-0.5 rounded border border-[#22D3EE]/20">
                        +91 98765 *** / UPI
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={ad.review_status} size="sm" />
                    </td>

                    {/* Detection Date */}
                    <td className="py-3.5 px-4 font-mono text-[#64748B] whitespace-nowrap text-[11px]">
                      {new Date(ad.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions: View Evidence Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEvidenceModal(ad)}
                          className="px-3 py-1.5 rounded-lg bg-[#6366F1]/15 hover:bg-[#6366F1] text-[#818CF8] hover:text-white border border-[#6366F1]/30 hover:border-[#6366F1] font-semibold text-xs transition-all flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Evidence</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(ad.id)}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] rounded hover:bg-[#131C2E] transition-colors"
                          title="Delete Post"
                          aria-label="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[rgba(148,163,184,0.1)] bg-[#091426] flex items-center justify-between text-xs text-[#94A3B8]">
          <span>
            Showing {ads.length} of {total} flagged advertisements • Page {page} of {pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-[#131C2E] border border-[rgba(148,163,184,0.15)] text-[#E5E9F2] disabled:opacity-40"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2 text-white">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-lg bg-[#131C2E] border border-[rgba(148,163,184,0.15)] text-[#E5E9F2] disabled:opacity-40"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="floating-card max-w-sm w-full space-y-4 border-[#EF4444]/40 shadow-2xl">
            <h3 className="text-base font-bold text-white">Delete Flagged Post Record?</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Are you sure you want to delete post record #{deleteConfirmId}? This will remove all associated forensic indicators and risk breakdown cache.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-[#EF4444] text-white text-xs font-semibold hover:bg-red-600 transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ad={selectedAd}
        onStatusUpdate={(id, status) => {
          setAds((prev) =>
            prev.map((item) => (item.id === id ? { ...item, review_status: status as any } : item))
          );
        }}
      />
    </div>
  );
};
