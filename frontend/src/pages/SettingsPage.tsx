import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Cpu,
  Shield,
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  Globe,
  Bell,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [lowCutoff, setLowCutoff] = useState(35);
  const [highCutoff, setHighCutoff] = useState(70);
  const [similarityCutoff, setSimilarityCutoff] = useState(0.78);
  const [demoMode, setDemoMode] = useState(true);

  // Additional FinGuard AI Settings
  const [supportedLanguages, setSupportedLanguages] = useState({
    english: true,
    hindi: true,
    hinglish: true,
  });

  const [alertPreferences, setAlertPreferences] = useState({
    liveClusterToasts: true,
    highRiskAlertSound: false,
    unresolvedBadge: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    maskPhoneNumbers: true,
    maskUpiHandles: true,
    redactSensitiveOcr: true,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettingsData(data);
      setLowCutoff(data.risk_threshold_low || 35);
      setHighCutoff(data.risk_threshold_high || 70);
      setSimilarityCutoff(data.similarity_threshold || 0.78);
      setDemoMode(data.demo_mode ?? true);
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
      setTimeout(() => setSaveSuccess(false), 4000);
      await fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to persist settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-[#64748B] space-y-2">
        <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p>Loading application configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Engine Calibration</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">
          Configure detection thresholds, multilingual models, privacy redactions, and alert notifications.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Risk Thresholds Calibration Box */}
        <div className="floating-card space-y-6">
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Risk Scoring Calibration</h2>
              <p className="text-xs text-[#94A3B8]">Configure score boundary bands (0–34 Low, 35–69 Medium, 70–100 High)</p>
            </div>
            <Sliders className="w-4 h-4 text-[#6366F1]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs text-[#94A3B8] font-medium">
                Low Risk Ceiling (Currently: {lowCutoff}/100)
              </label>
              <input
                type="range"
                min={10}
                max={49}
                value={lowCutoff}
                onChange={(e) => setLowCutoff(parseInt(e.target.value, 10))}
                className="w-full accent-[#10B981]"
              />
              <span className="text-[11px] font-mono text-[#64748B] block">
                Scores &lt; {lowCutoff} classified as LOW RISK
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-[#94A3B8] font-medium">
                High Risk Floor (Currently: {highCutoff}/100)
              </label>
              <input
                type="range"
                min={50}
                max={90}
                value={highCutoff}
                onChange={(e) => setHighCutoff(parseInt(e.target.value, 10))}
                className="w-full accent-[#EF4444]"
              />
              <span className="text-[11px] font-mono text-[#64748B] block">
                Scores &ge; {highCutoff} classified as HIGH RISK
              </span>
            </div>
          </div>
        </div>

        {/* Multilingual Support Settings */}
        <div className="floating-card space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Multilingual Detection Vectors</h2>
              <p className="text-xs text-[#94A3B8]">Enable or disable language lexicons and transliteration handlers</p>
            </div>
            <Globe className="w-4 h-4 text-[#22D3EE]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-between cursor-pointer">
              <span>English Lexicon</span>
              <input
                type="checkbox"
                checked={supportedLanguages.english}
                onChange={(e) => setSupportedLanguages({ ...supportedLanguages, english: e.target.checked })}
                className="accent-[#6366F1]"
              />
            </label>
            <label className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-between cursor-pointer">
              <span>Hindi Devanagari</span>
              <input
                type="checkbox"
                checked={supportedLanguages.hindi}
                onChange={(e) => setSupportedLanguages({ ...supportedLanguages, hindi: e.target.checked })}
                className="accent-[#6366F1]"
              />
            </label>
            <label className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-between cursor-pointer">
              <span>Hinglish Romanized</span>
              <input
                type="checkbox"
                checked={supportedLanguages.hinglish}
                onChange={(e) => setSupportedLanguages({ ...supportedLanguages, hinglish: e.target.checked })}
                className="accent-[#6366F1]"
              />
            </label>
          </div>
        </div>

        {/* Privacy & Redaction Settings */}
        <div className="floating-card space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Privacy & Credential Masking</h2>
              <p className="text-xs text-[#94A3B8]">Automatic redacting of sensitive phone numbers, cards, and personal identifiers</p>
            </div>
            <EyeOff className="w-4 h-4 text-[#F59E0B]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-between cursor-pointer">
              <span>Mask Phone Numbers (+91 ***)</span>
              <input
                type="checkbox"
                checked={privacySettings.maskPhoneNumbers}
                onChange={(e) => setPrivacySettings({ ...privacySettings, maskPhoneNumbers: e.target.checked })}
                className="accent-[#6366F1]"
              />
            </label>
            <label className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-between cursor-pointer">
              <span>Redact Card Numbers & PINs</span>
              <input
                type="checkbox"
                checked={privacySettings.maskUpiHandles}
                onChange={(e) => setPrivacySettings({ ...privacySettings, maskUpiHandles: e.target.checked })}
                className="accent-[#6366F1]"
              />
            </label>
            <label className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.15)] flex items-center justify-between cursor-pointer">
              <span>Sanitize OCR Data</span>
              <input
                type="checkbox"
                checked={privacySettings.redactSensitiveOcr}
                onChange={(e) => setPrivacySettings({ ...privacySettings, redactSensitiveOcr: e.target.checked })}
                className="accent-[#6366F1]"
              />
            </label>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-xs text-[#EF4444] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-xs font-mono text-[#10B981] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Settings successfully saved and persisted to backend database.</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs py-2.5 px-6 shadow-md shadow-[#6366F1]/20 flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
