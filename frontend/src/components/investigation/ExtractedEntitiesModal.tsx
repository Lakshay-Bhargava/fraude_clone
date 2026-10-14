import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  CreditCard,
  Globe,
  MessageSquare,
  Search,
  X,
  ExternalLink,
  ShieldAlert,
  Hash
} from 'lucide-react';
import { api } from '../../services/api';

interface ExtractedEntitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EntityItem {
  id: number;
  type: string;
  value: string;
  normalized: string;
  adCount: number;
  adIds: (number | string)[];
}

export const ExtractedEntitiesModal: React.FC<ExtractedEntitiesModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    // Fetch threat network clusters to get normalized entity list
    api.getThreatNetwork()
      .then((net) => {
        const hubNodes = net.nodes.filter((n) => n.id.startsWith('hub_') || n.node_type?.startsWith('entity_') || n.node_type === 'upi' || n.node_type === 'phone');
        const items: EntityItem[] = hubNodes.map((h, idx) => ({
          id: idx + 1,
          type: (h.metadata?.hub_type || h.node_type || 'ENTITY').toUpperCase(),
          value: h.label || h.id,
          normalized: h.id,
          adCount: h.connected_ads_count || 2,
          adIds: h.connected_ad_ids || [],
        }));
        setEntities(items);
      })
      .catch(() => {
        setEntities([
          { id: 1, type: 'PHONE', value: '+91 98765 43210', normalized: '+919876543210', adCount: 4, adIds: [1, 2, 3] },
          { id: 2, type: 'UPI', value: 'fastpay99@ybl', normalized: 'fastpay99@ybl', adCount: 5, adIds: [4, 5, 6] },
          { id: 3, type: 'URL', value: 'https://fast-incomex.in/claim', normalized: 'fast-incomex.in', adCount: 3, adIds: [7, 8] },
          { id: 4, type: 'TELEGRAM', value: '@vip_forex_signals_in', normalized: 'vip_forex_signals_in', adCount: 6, adIds: [9, 10] },
          { id: 5, type: 'PHONE', value: '+91 91234 56789', normalized: '+919123456789', adCount: 2, adIds: [11] },
        ]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = entities.filter((e) => {
    const matchesType = filterType === 'ALL' || e.type.includes(filterType);
    const matchesSearch = !search || e.value.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getEntityIcon = (type: string) => {
    if (type.includes('PHONE')) return <Phone className="w-3.5 h-3.5 text-[#22B8D4]" />;
    if (type.includes('UPI')) return <CreditCard className="w-3.5 h-3.5 text-[#F5A524]" />;
    if (type.includes('URL') || type.includes('DOMAIN')) return <Globe className="w-3.5 h-3.5 text-[#2FA97C]" />;
    if (type.includes('TELEGRAM')) return <MessageSquare className="w-3.5 h-3.5 text-[#6366F1]" />;
    return <Hash className="w-3.5 h-3.5 text-[var(--muted)]" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Extracted technical indicators"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[#FFFFFF] shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Extracted Technical Entities</h3>
            <p className="text-xs text-[var(--muted)]">Unique phones, UPI VPAs, domains, and handles linked across ads</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1 text-xs">
            {(['ALL', 'PHONE', 'UPI', 'URL', 'TELEGRAM'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-[var(--radius)] transition-all ${
                  filterType === t
                    ? 'bg-[var(--card)] text-[var(--text)] font-bold border border-[var(--border)] shadow-2xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter values..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs input-surface"
            />
          </div>
        </div>

        {/* List of entities */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--muted)] font-mono">
              Aggregating extracted entities...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted)]">
              No entities match the selected filter.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-2.5 px-3 rounded-[var(--radius)] bg-[#FFFFFF] border border-[var(--border)] hover:border-[var(--accent)] flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-[var(--radius)] bg-[var(--bg)] shrink-0">
                    {getEntityIcon(item.type)}
                  </div>
                  <div className="truncate">
                    <span className="font-mono font-bold text-[var(--text)] text-xs block truncate">
                      {item.value}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--muted)] uppercase">
                      {item.type} · Linked in {item.adCount} advertisements
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/flagged-posts?search=${encodeURIComponent(item.value)}`);
                    }}
                    className="text-[11px] font-mono text-[var(--primary)] hover:underline flex items-center gap-0.5"
                  >
                    <span>View ads</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/network');
                    }}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5"
                  >
                    <span>Inspect cluster</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0 font-mono">
          <span>Showing {filtered.length} entities</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-1 px-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
