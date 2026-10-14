import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Filter,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Clock,
  Layers,
  ArrowRight,
  X,
  Save,
  UserCheck,
  Search,
  Trash2,
  FileDown,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { CaseItem } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { generateCaseReportPdf } from '../services/pdfReportGenerator';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected case for viewing details / adding notes
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New Case Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newAssigned, setNewAssigned] = useState('Analyst Alpha');
  const [creating, setCreating] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.listCases({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setCases(data);
      if (selectedCase) {
        const refreshed = data.find((c) => c.id === selectedCase.id);
        if (refreshed) setSelectedCase(refreshed);
      }
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await api.createCase({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        assigned_to: newAssigned,
      });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      await fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await api.addCaseNote(selectedCase.id, newNote.trim(), 'Analyst Alpha');
      setNewNote('');
      await fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateStatus = async (caseId: number, status: string) => {
    try {
      await api.updateCase(caseId, { status });
      await fetchCases();
    } catch (err: any) {
      alert(err.message || 'Failed to update case status');
    }
  };

  const handleDeleteCase = async (caseId: number) => {
    setDeleting(true);
    try {
      await api.deleteCase(caseId);
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
      }
      setConfirmDeleteId(null);
      await fetchCases();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCasePdf = (c: CaseItem) => {
    const primaryAd = c.ads?.[0] || (c.advertisements?.[0] as any);
    generateCaseReportPdf(
      primaryAd || {
        id: c.id,
        custom_id: c.case_ref,
        original_text: `${c.title}\n${c.description || ''}`,
        normalized_text: c.title,
        source_type: 'case',
        platform: 'Investigation Dossier',
        is_demo: false,
        data_source: 'LIVE_SCAN',
        content_hash: 'SHA256-CASE-LOG',
        review_status: c.status,
        created_at: c.created_at,
        analysis: {
          risk_score: c.priority === 'CRITICAL' ? 95 : c.priority === 'HIGH' ? 80 : 50,
          risk_level: c.priority === 'CRITICAL' || c.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          model_available: false,
          model_signal: 0,
          explanation: c.description || 'Investigation dossier review completed.',
          recommended_review_action: 'Proceed with regulatory and law enforcement filing.',
        },
        evidence_items: [],
        entities: []
      },
      {
        analystNotes: `Case Dossier ${c.case_ref}: ${c.title}. Assigned to ${c.assigned_to}. Notes logged: ${c.notes?.length || 0}.`,
      }
    );
  };

  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.case_ref.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--primary)] text-white font-bold uppercase tracking-wider">
              Module 6
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">Persistent Case Management & History</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)] tracking-tight">
            Investigation Case Dossiers
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
            Maintain longitudinal evidence trails, link coordinated fraud advertisements, append forensic notes, and export regulatory reports.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary text-xs sm:text-sm py-2 px-4 flex items-center gap-2 font-semibold shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Open New Case</span>
        </button>
      </div>

      {/* 2. Filter Bar & Live Search */}
      <div className="rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search case ref, title, scope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-surface w-full pl-9 pr-3 py-1.5 text-xs text-[var(--text)] font-mono"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-surface py-1.5 px-3 text-xs font-mono text-[var(--text)]"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-surface py-1.5 px-3 text-xs font-mono text-[var(--text)]"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <span className="text-xs font-mono text-[var(--muted)]">
          Total Cases: <strong className="text-[var(--text)]">{filteredCases.length}</strong>
        </span>
      </div>

      {/* 3. Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-[var(--muted)] flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span>Loading active investigation cases...</span>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] p-6 space-y-2">
            <Briefcase className="w-10 h-10 text-[var(--muted)] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-[var(--text)]">No Investigation Cases Found</h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              No cases match the selected filter criteria. Click "Open New Case" or save an investigation directly from the scanner.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => (
            <div
              key={c.id}
              className="rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-[var(--primary)]">{c.case_ref}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        c.priority === 'CRITICAL' || c.priority === 'HIGH'
                          ? 'bg-[#FDE8E8] text-[#A8341C] border border-[#F8B4B6]'
                          : 'bg-[var(--bg)] text-[var(--text)] border border-[var(--border)]'
                      }`}
                    >
                      {c.priority}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] font-semibold">
                      {c.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[var(--text)] line-clamp-1 mb-1">
                  {c.title}
                </h3>

                <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed mb-3">
                  {c.description || 'No detailed scope provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] text-xs font-mono flex items-center justify-between text-[var(--muted)]">
                <span>
                  {(c.advertisements || c.ads || []).length} linked ad(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportCasePdf(c)}
                    className="p-1 rounded hover:bg-[var(--table-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                    title="Export Case Dossier PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCase(c)}
                    className="text-[var(--primary)] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[#FFFDF7]">
              <div>
                <span className="text-xs font-mono text-[var(--primary)] font-bold">{selectedCase.case_ref}</span>
                <h3 className="text-base font-bold text-[var(--text)] mt-0.5">{selectedCase.title}</h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--table-hover)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs font-mono">
              {/* Status and Priority Controls */}
              <div className="flex flex-wrap items-center justify-between p-3.5 rounded bg-[var(--bg)] border border-[var(--border)] gap-3">
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-bold">CASE STATUS</span>
                  <select
                    value={selectedCase.status}
                    onChange={(e) => handleUpdateStatus(selectedCase.id, e.target.value)}
                    className="mt-1 input-surface py-1 px-2.5 rounded text-xs text-[var(--text)] font-semibold"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="ESCALATED">ESCALATED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-bold">ASSIGNED INVESTIGATOR</span>
                  <span className="text-[var(--text)] mt-1 block font-semibold">{selectedCase.assigned_to}</span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-bold">PRIORITY</span>
                  <span className="text-[var(--primary)] mt-1 block font-bold">{selectedCase.priority}</span>
                </div>
              </div>

              {/* Scope Description */}
              {selectedCase.description && (
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-bold mb-1">
                    Investigation Scope & Technical Overview:
                  </span>
                  <p className="text-[var(--text)] leading-relaxed p-3.5 rounded bg-[var(--bg)] border border-[var(--border)] font-sans text-xs">
                    {selectedCase.description}
                  </p>
                </div>
              )}

              {/* Linked Advertisements List */}
              <div>
                <span className="text-[var(--muted)] block text-[10px] uppercase font-bold mb-2">
                  Linked Advertisements ({(selectedCase.advertisements || selectedCase.ads || []).length}):
                </span>
                <div className="space-y-2">
                  {(selectedCase.advertisements || selectedCase.ads || []).map((ad: any) => (
                    <div
                      key={ad.id}
                      className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate max-w-md font-sans">
                        <strong className="font-mono text-[var(--primary)] mr-2">{ad.custom_id || `AD-${ad.id}`}:</strong>
                        <span className="text-[var(--text)]">{ad.original_text}</span>
                      </div>
                      <Link
                        to={`/investigations/${ad.id}`}
                        onClick={() => setSelectedCase(null)}
                        className="text-[var(--primary)] hover:underline text-xs shrink-0 font-semibold"
                      >
                        Evidence Dossier →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Feed */}
              <div>
                <span className="text-[var(--muted)] block text-[10px] uppercase font-bold mb-2">
                  Analyst Investigation Log ({(selectedCase.notes || []).length} entries):
                </span>
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                  {(selectedCase.notes || []).map((n: any) => (
                    <div key={n.id} className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                        <span className="text-[var(--accent)] font-semibold">{n.actor}</span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[var(--text)] font-sans text-xs leading-relaxed">{n.note}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Append investigative observation or verified bank VPA finding..."
                    className="input-surface w-full p-2.5 text-xs text-[var(--text)] resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => handleExportCasePdf(selectedCase)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download Case PDF</span>
                    </button>
                    <button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{addingNote ? 'Saving...' : 'Add Note'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Danger Zone: Delete Case */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)]">
                  Permanent deletion logs an immutable audit event.
                </span>
                {confirmDeleteId === selectedCase.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteCase(selectedCase.id)}
                      disabled={deleting}
                      className="px-3 py-1 rounded bg-[#E5484D] text-white font-bold text-xs hover:bg-[#C83D4D] transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 rounded bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedCase.id)}
                    className="text-xs text-[#A8341C] hover:text-[#E5484D] flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Case</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Case Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] max-w-lg w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--text)]">Open New Investigation Case</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[var(--text)] font-bold uppercase mb-1">Case Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Syndicate Vajra ICICI Sweep Investigation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-surface w-full p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text)] font-bold uppercase mb-1">Investigation Scope:</label>
                <textarea
                  rows={3}
                  placeholder="Describe context, target financial accounts, and primary evidence vectors..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input-surface w-full p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text)] font-bold uppercase mb-1">Priority:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="input-surface w-full p-2 text-xs text-[var(--text)]"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text)] font-bold uppercase mb-1">Assigned Analyst:</label>
                  <input
                    type="text"
                    value={newAssigned}
                    onChange={(e) => setNewAssigned(e.target.value)}
                    className="input-surface w-full p-2 text-xs text-[var(--text)]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {creating ? 'Creating...' : 'Create Case Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
