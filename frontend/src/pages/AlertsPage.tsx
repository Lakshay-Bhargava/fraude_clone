import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Clock,
  Filter,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { AlertItem } from '../types';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedFilter, setReviewedFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const isRev = reviewedFilter === 'all' ? undefined : reviewedFilter === 'reviewed';
      const data = await api.listAlerts({
        reviewed: isRev,
        severity: severityFilter || undefined,
      });
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [reviewedFilter, severityFilter]);

  const toggleReviewed = async (id: number, currentReviewed: boolean) => {
    try {
      await api.updateAlert(id, !currentReviewed);
      await fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to update alert');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Security Alert Center</h2>
        <p className="text-sm text-[#9BA7B8] mt-0.5">
          Real-time forensic alerts triggered when advertisements exceed high-risk thresholds or exhibit known campaign markers.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="floating-card p-4 flex flex-wrap items-center gap-3">
        <select
          value={reviewedFilter}
          onChange={(e) => setReviewedFilter(e.target.value)}
          className="py-2 px-3 text-xs input-surface text-[#9BA7B8]"
        >
          <option value="all">All Alerts</option>
          <option value="unreviewed">Pending Review</option>
          <option value="reviewed">Reviewed</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="py-2 px-3 text-xs input-surface text-[#9BA7B8]"
        >
          <option value="">All Severities</option>
          <option value="HIGH">High Severity</option>
          <option value="MEDIUM">Medium Severity</option>
          <option value="LOW">Low Severity</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[#748197] space-y-2">
            <div className="w-5 h-5 border-2 border-[#FF7547] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading security alert items...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="floating-card p-12 text-center text-xs text-[#9BA7B8] space-y-2">
            <Bell className="w-6 h-6 text-[#748197] mx-auto mb-2" />
            <p>No security alerts match the selected criteria.</p>
          </div>
        ) : (
          alerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                alt.reviewed
                  ? 'bg-[#141C2B] border-[rgba(185,200,220,0.08)] opacity-70'
                  : 'bg-[#192438] border-[#FF5964]/30 shadow-lg shadow-[#FF5964]/5'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    alt.severity === 'HIGH'
                      ? 'bg-[#FF5964]/15 text-[#FF5964]'
                      : 'bg-[#F4BC52]/15 text-[#F4BC52]'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                        alt.severity === 'HIGH'
                          ? 'bg-[#FF5964]/15 border-[#FF5964]/30 text-[#FF5964]'
                          : 'bg-[#F4BC52]/15 border-[#F4BC52]/30 text-[#F4BC52]'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-[10px] font-mono text-[#748197]">
                      {alt.alert_type}
                    </span>
                    <span className="text-[10px] font-mono text-[#748197]">
                      • {new Date(alt.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#F4F6FA] font-medium leading-relaxed">{alt.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {alt.advertisement_id && (
                  <Link
                    to={`/investigations/${alt.advertisement_id}`}
                    className="text-xs text-[#FF7547] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                <button
                  onClick={() => toggleReviewed(alt.id, alt.reviewed)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors ${
                    alt.reviewed
                      ? 'bg-[#0E1522] text-[#9BA7B8] hover:text-white border border-[rgba(185,200,220,0.12)]'
                      : 'bg-[#FF7547]/15 text-[#FF7547] border border-[#FF7547]/40 hover:bg-[#FF7547]/25'
                  }`}
                >
                  {alt.reviewed ? 'Mark Pending' : 'Mark Reviewed ✓'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
