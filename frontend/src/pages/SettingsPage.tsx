import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Cpu,
  Shield,
  Save,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [lowCutoff, setLowCutoff] = useState(35);
  const [highCutoff, setHighCutoff] = useState(65);
  const [similarityCutoff, setSimilarityCutoff] = useState(0.78);
  const [demoMode, setDemoMode] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettingsData(data);
      setLowCutoff(data.risk_threshold_low);
      setHighCutoff(data.risk_threshold_high);
      setSimilarityCutoff(data.similarity_threshold);
      setDemoMode(data.demo_mode);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lowCutoff >= highCutoff) {
      setErrorMsg('Low risk threshold must be strictly less than high risk threshold.');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      await api.updateSettings({
        risk_threshold_low: lowCutoff,
        risk_threshold_high: highCutoff,
        similarity_threshold: similarityCutoff,
        demo_mode: demoMode,
      });
      setSaveSuccess(true);
      await fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to persist settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs font-mono text-[#9297A4]">Loading system configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-white">System Settings & Engine Calibration</h2>
        <p className="text-xs font-mono text-[#9297A4] mt-0.5">
          Configure risk scoring bands, near-duplicate similarity boundaries, and inspect ML model telemetry
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Risk Thresholds Calibration Box */}
        <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Risk Threshold Boundaries</h3>
              <p className="text-[11px] font-mono text-[#9297A4]">Calibrate 0-100 index categorization</p>
            </div>
            <Sliders className="w-4 h-4 text-[#FF7547]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-[#9297A4] mb-1">
                Low Risk Ceiling (Currently: {lowCutoff}/100)
              </label>
              <input
                type="range"
                min={10}
                max={50}
                value={lowCutoff}
                onChange={(e) => setLowCutoff(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF7547]"
              />
              <span className="text-[10px] font-mono text-[#626775]">
                Scores &lt; {lowCutoff} classified as LOW RISK (Routine review)
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9297A4] mb-1">
                High Risk Floor (Currently: {highCutoff}/100)
              </label>
              <input
                type="range"
                min={55}
                max={90}
                value={highCutoff}
                onChange={(e) => setHighCutoff(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF4D5A]"
              />
              <span className="text-[10px] font-mono text-[#626775]">
                Scores &ge; {highCutoff} classified as HIGH RISK (Immediate escalation)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#9297A4] mb-1">
              RapidFuzz Near-Duplicate Sensitivity (Currently: {(similarityCutoff * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.01}
              value={similarityCutoff}
              onChange={(e) => setSimilarityCutoff(parseFloat(e.target.value))}
              className="w-full accent-[#49D6A5]"
            />
            <span className="text-[10px] font-mono text-[#626775]">
              Token Sort Similarity threshold required to cluster related campaign variations
            </span>
          </div>
        </div>

        {/* Machine Learning Model Telemetry */}
        <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Machine Learning Engine</h3>
              <p className="text-[11px] font-mono text-[#9297A4]">Scikit-Learn baseline inference pipeline</p>
            </div>
            <Cpu className="w-4 h-4 text-[#49D6A5]" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#08090D] border border-white/5">
              <span className="text-[#626775] block text-[10px]">ENGINE STATUS</span>
              <span className="text-[#49D6A5] font-bold mt-1 block">
                ● {settingsData?.ml_model?.status || 'ONLINE'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[#08090D] border border-white/5">
              <span className="text-[#626775] block text-[10px]">PIPELINE ARCHITECTURE</span>
              <span className="text-white font-bold mt-1 block">TF-IDF + Logistic Reg</span>
            </div>
            <div className="p-3 rounded-lg bg-[#08090D] border border-white/5">
              <span className="text-[#626775] block text-[10px]">FALLBACK CAPABILITY</span>
              <span className="text-white font-bold mt-1 block">Deterministic Rules</span>
            </div>
          </div>
        </div>

        {/* Active Rules Inventory */}
        <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Active Investigative Heuristic Rules</h3>
              <p className="text-[11px] font-mono text-[#9297A4]">
                Deterministic detection triggers loaded in the core engine ({settingsData?.active_rules?.length ?? 0} rules)
              </p>
            </div>
            <Shield className="w-4 h-4 text-[#FF7547]" />
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto divide-y divide-white/5">
            {settingsData?.active_rules?.map((rule) => (
              <div key={rule.id} className="pt-2 flex items-start justify-between text-xs font-mono">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{rule.name}</span>
                    <span className="text-[10px] text-[#FF7547] bg-[#FF7547]/10 px-1.5 py-0.2 rounded">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9297A4] mt-0.5">{rule.description}</p>
                </div>
                <span className="font-bold text-[#FF4D5A] shrink-0 ml-4">+{rule.weight} PTS</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save Actions */}
        {errorMsg && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400">
            {errorMsg}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded bg-[#49D6A5]/10 border border-[#49D6A5]/30 text-xs font-mono text-[#49D6A5]">
            ✓ Settings successfully persisted into SQLite database.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold uppercase tracking-wider hover:bg-[#FF8A65] transition-colors flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Persisting...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
