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
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Send,
  Camera,
  Share2,
  Globe,
  Video,
  Phone,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementSummary } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EvidenceDrawer } from '../components/investigation/EvidenceDrawer';
import { useLanguage } from '../context/LanguageContext';

export const AdvertisementsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();

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

  // Synchronize URL parameters if they change
  useEffect(() => {
    const urlRisk = searchParams.get('risk');
    const urlPlatform = searchParams.get('platform');
    const urlSearch = searchParams.get('search');
    if (urlRisk !== null) setRiskFilter(urlRisk);
    if (urlPlatform !== null) setPlatformFilter(urlPlatform);
    if (urlSearch !== null) setSearch(urlSearch);
  }, [searchParams]);

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
    'mule account',
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
          className="bg-[#FDE8E8] text-[#A8341C] border border-[#F8B4B6] px-1 py-0.2 rounded font-semibold"
        >
          {chunk.text}
        </span>
      ) : (
        <span key={idx}>{chunk.text}</span>
      )
    );
  };

  const getPlatformIcon = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('telegram')) return <Send className="w-3.5 h-3.5 text-[#0F6E7A]" />;
    if (p.includes('instagram')) return <Camera className="w-3.5 h-3.5 text-[#A8341C]" />;
    if (p.includes('facebook')) return <Share2 className="w-3.5 h-3.5 text-[#2F4B45]" />;
    if (p.includes('youtube')) return <Video className="w-3.5 h-3.5 text-[#E5484D]" />;
    return <Globe className="w-3.5 h-3.5 text-[var(--muted)]" />;
  };

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await api.listAdvertisements({
        page,
        limit,
        risk_level: riskFilter && riskFilter !== 'All' ? riskFilter : undefined,
        platform: platformFilter && platformFilter !== 'All' ? platformFilter : undefined,
        review_status: statusFilter || undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        is_demo: provenanceFilter === 'live' ? false : (provenanceFilter === 'demo' ? true : undefined),
      });

      setAds(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      console.error('Failed to load advertisements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, [page, riskFilter, platformFilter, statusFilter, provenanceFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAds();
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setRiskFilter('');
    setPlatformFilter('');
    setStatusFilter('');
    setProvenanceFilter('All');
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    search || (riskFilter && riskFilter !== 'All') || (platformFilter && platformFilter !== 'All') || statusFilter || provenanceFilter !== 'All'
  );

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto">
      {/* 1. Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
            {t('nav.flagged_posts', 'Flagged posts')}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Surveillance ledger indexing suspicious investment lures, mule account recruitments, and linked indicators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--muted)]">
            Total Records: <strong className="text-[var(--text)]">{total.toLocaleString()}</strong>
          </span>
          <button
            onClick={loadAds}
            className="p-1.5 rounded-[var(--radius)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--table-hover)] transition-colors ml-2"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="p-3 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID, keyword, phone, or UPI handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs input-surface"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-1 px-2.5 text-xs input-surface"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="NEEDS_REVIEW">Needs review</option>
            <option value="UNDER_REVIEW">Reviewed</option>
            <option value="ESCALATED">Escalated</option>
            <option value="FALSE_POSITIVE">Dismissed</option>
          </select>

          {/* Provenance Filter */}
          <select
            value={provenanceFilter}
            onChange={(e) => { setProvenanceFilter(e.target.value); setPage(1); }}
            className="py-1 px-2.5 text-xs input-surface font-mono"
          >
            <option value="All">All Sources</option>
            <option value="live">Live Scans Only</option>
            <option value="demo">Synthetic Dataset</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="py-1 px-2.5 text-xs rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--table-hover)] flex items-center gap-1 transition-colors"
              title="Reset all filters"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Flagged Posts Investigation Table (Phase 1 & Phase 4 Contrast Fix) */}
      <div className="rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header: Sticky, WCAG AA compliant dark text on light cream card header */}
            <thead className="border-b border-[var(--border)] bg-[#FFFFFF] text-[11px] font-mono text-[var(--muted)] uppercase sticky top-0 select-none">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold text-[var(--text)]">
                  {t('table.platform', 'Platform')}
                </th>
                <th
                  className="py-2.5 px-3.5 cursor-pointer hover:text-[var(--text)]"
                  onClick={() => toggleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('table.post_id', 'Post ID')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--muted)]" />
                  </div>
                </th>
                <th className="py-2.5 px-3.5 font-semibold text-[var(--text)] max-w-md">
                  {t('table.snippet', 'Advertisement snippet')}
                </th>
                <th
                  className="py-2.5 px-3.5 cursor-pointer hover:text-[var(--text)]"
                  onClick={() => toggleSort('risk_score')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('table.risk_level', 'Risk level and score')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--muted)]" />
                  </div>
                </th>
                <th className="py-2.5 px-3.5 font-semibold text-[var(--text)]">
                  {t('table.indicators', 'Extracted indicators')}
                </th>
                <th className="py-2.5 px-3.5 font-semibold text-[var(--text)]">
                  {t('table.status', 'Status')}
                </th>
                <th className="py-2.5 px-3.5 font-semibold text-[var(--text)]">
                  {t('table.date', 'Detection date')}
                </th>
                <th className="py-2.5 px-3.5 text-right font-semibold text-[var(--text)]">
                  {t('table.evidence_action', 'Action')}
                </th>
              </tr>
            </thead>

            {/* Table Body: Crisp dark text, row hover = #EDE5D3, text colour stays dark and readable */}
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)] font-mono">
                    <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading flagged advertisements...
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)] font-mono">
                    No advertisements match the selected filters.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => {
                  const isLive = !ad.is_demo && ad.data_source !== 'SYNTHETIC_DATASET';
                  return (
                    <tr
                      key={ad.id}
                      onClick={() => {
                        setSelectedAd(ad);
                        setDrawerOpen(true);
                      }}
                      className="table-row-interactive cursor-pointer group"
                    >
                      {/* 1. Platform */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
                            {getPlatformIcon(ad.platform_detected)}
                          </div>
                          <span className="font-medium text-[var(--text)]">
                            {ad.platform_detected || 'Telegram'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Post ID */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--text)]">
                            {ad.custom_id || `AD-${ad.id}`}
                          </span>
                          {/* Live tag only on genuinely live user-scanned rows */}
                          {isLive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#E6F7F0] text-[#1D6B4F] border border-[#A3E3CB]">
                              LIVE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Advertisement Snippet (2 lines max with ellipsis, full text tooltip) */}
                      <td
                        className="py-2.5 px-3.5 max-w-xs sm:max-w-md text-[var(--text)] leading-snug"
                        title={ad.original_text}
                      >
                        <div className="line-clamp-2">
                          {renderHighlightedSnippet(ad.original_text)}
                        </div>
                      </td>

                      {/* 4. Risk Level and Score */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                      </td>

                      {/* 5. Extracted Indicators (darker chip text for contrast #0F6E7A on #D8EEF0) */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-[11px]">
                        <span className="bg-[#D8EEF0] text-[#0F6E7A] border border-[#B2DFE3] px-2 py-0.5 rounded-[var(--radius)] font-medium inline-flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>+91 98765 *** / UPI</span>
                        </span>
                      </td>

                      {/* 6. Status Badge */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <StatusBadge status={ad.review_status} size="sm" />
                      </td>

                      {/* 7. Detection Date */}
                      <td className="py-2.5 px-3.5 font-mono text-[var(--muted)] whitespace-nowrap text-[11px]">
                        {new Date(ad.created_at).toLocaleDateString()}
                      </td>

                      {/* 8. Action (Open Drawer) */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAd(ad);
                            setDrawerOpen(true);
                          }}
                          className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1 ml-auto font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('table.view_evidence', 'Inspect')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--muted)]">
          <div>
            Showing <strong className="text-[var(--text)]">{ads.length}</strong> of{' '}
            <strong className="text-[var(--text)]">{total.toLocaleString()}</strong> posts
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 px-2 rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--table-hover)] flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 text-[var(--text)] font-bold">
              Page {page} / {Math.max(1, pages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1 px-2 rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--table-hover)] flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in Evidence Detail Drawer */}
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
