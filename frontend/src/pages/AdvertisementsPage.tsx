import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';
import { AdvertisementSummary } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

export const AdvertisementsPage: React.FC = () => {
  const [ads, setAds] = useState<AdvertisementSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await api.listAds({
        page,
        limit,
        search: search.trim() || undefined,
        risk_level: riskFilter || undefined,
        review_status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
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
    fetchAds();
  }, [page, riskFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAds();
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteAd(id);
      setDeleteConfirmId(null);
      await fetchAds();
    } catch (err: any) {
      alert(err.message || 'Failed to delete advertisement record.');
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Advertisement Repository Explorer</h2>
          <p className="text-xs font-mono text-[#9297A4] mt-0.5">
            Search, filter, and audit recorded advertisements and their explainable risk scores
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scanner"
            className="px-4 py-2 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors"
          >
            + Ingest New Ad
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search keywords, record ID, or submitted URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#171A22] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-[#626775] focus:outline-none focus:border-[#FF7547]"
          />
          <Search className="w-4 h-4 text-[#626775] absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs bg-[#171A22] border border-white/10 rounded-lg text-[#9297A4] font-mono focus:outline-none"
          >
            <option value="">All Risk Bands</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs bg-[#171A22] border border-white/10 rounded-lg text-[#9297A4] font-mono focus:outline-none"
          >
            <option value="">All Review Statuses</option>
            <option value="NEW">New</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLOSED">Closed</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          <button
            onClick={fetchAds}
            className="p-2 rounded-lg bg-[#171A22] border border-white/10 text-[#9297A4] hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF7547]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#101218] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-[10px] font-mono text-[#9297A4] uppercase bg-[#14161f]">
              <tr>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Advertisement Content Preview</th>
                <th
                  onClick={() => toggleSort('risk_score')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Risk Index</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Review Disposition</th>
                <th className="py-3 px-4">Source</th>
                <th
                  onClick={() => toggleSort('created_at')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Date Ingested</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9297A4] font-mono">
                    Loading records from SQLite database...
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9297A4] font-mono">
                    No advertisements match the selected filters.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {ad.custom_id || `AD-${ad.id}`}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm truncate text-[#9297A4]">
                      {ad.original_text}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={ad.review_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#626775] uppercase text-[10px] whitespace-nowrap">
                      {ad.source_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#626775] whitespace-nowrap">
                      {new Date(ad.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/investigations/${ad.id}`}
                          className="text-[#FF7547] hover:underline font-mono text-xs flex items-center gap-1"
                        >
                          <span>Evidence</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmId(ad.id)}
                          className="text-[#626775] hover:text-[#FF4D5A]"
                          title="Delete record"
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
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-[#9297A4]">
          <span>
            Total: {total} records • Page {page} of {pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-[#171A22] border border-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded bg-[#171A22] border border-white/10 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101218] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Record Deletion</h3>
            <p className="text-xs text-[#9297A4] font-mono leading-relaxed">
              Are you sure you want to permanently delete advertisement record #{deleteConfirmId}? This will remove all associated evidence and extracted entities.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded bg-[#171A22] text-xs font-mono text-[#9297A4] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded bg-[#FF4D5A] text-white text-xs font-mono font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
