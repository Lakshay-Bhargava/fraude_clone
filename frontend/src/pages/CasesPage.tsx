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
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { CaseItem } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected case for viewing details / adding notes
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Investigation Case Management</h2>
          <p className="text-xs font-mono text-[#9297A4] mt-0.5">
            Organize correlated financial advertisement rings, maintain audit logs, and record findings
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF7547] text-white font-mono text-xs font-semibold hover:bg-[#FF8A65] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Open New Case</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#101218] border border-white/[0.08] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 text-xs bg-[#171A22] border border-white/10 rounded-lg text-[#9297A4] font-mono focus:outline-none"
        >
          <option value="">All Case Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ESCALATED">Escalated</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="py-1.5 px-3 text-xs bg-[#171A22] border border-white/10 rounded-lg text-[#9297A4] font-mono focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Cases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs font-mono text-[#9297A4]">
            Loading cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs font-mono text-[#9297A4]">
            No investigation cases found.
          </div>
        ) : (
          cases.map((c) => (
            <div
              key={c.id}
              className="bg-[#101218] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between hover:border-[#FF7547]/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-[#FF7547]">{c.case_ref}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-semibold">
                      {c.priority}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF7547]/10 text-[#FF7547] border border-[#FF7547]/30">
                      {c.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold font-display text-white mb-1.5">{c.title}</h3>
                <p className="text-xs text-[#9297A4] line-clamp-2 leading-relaxed mb-4">
                  {c.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-[#9297A4]">
                <div className="flex items-center gap-3">
                  <span title="Linked advertisements">📁 {c.advertisements_count} Ads</span>
                  <span title="Analyst notes">💬 {c.notes.length} Notes</span>
                </div>

                <button
                  onClick={() => setSelectedCase(c)}
                  className="text-[#FF7547] hover:underline font-semibold"
                >
                  Inspect Case →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101218] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#14161f]">
              <div>
                <span className="text-xs font-mono text-[#FF7547] font-bold">{selectedCase.case_ref}</span>
                <h3 className="text-base font-bold text-white font-display mt-0.5">{selectedCase.title}</h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-[#9297A4] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-mono">
              {/* Status and Priority Controls */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#08090D] border border-white/5">
                <div>
                  <span className="text-[#9297A4] block text-[10px]">CASE STATUS</span>
                  <select
                    value={selectedCase.status}
                    onChange={(e) => handleUpdateStatus(selectedCase.id, e.target.value)}
                    className="mt-1 bg-[#171A22] border border-white/10 rounded p-1 text-xs text-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="ESCALATED">ESCALATED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div>
                  <span className="text-[#9297A4] block text-[10px]">ASSIGNED ANALYST</span>
                  <span className="text-white mt-1 block font-semibold">{selectedCase.assigned_to}</span>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div>
                  <span className="text-[#9297A4] block text-[10px] uppercase mb-1">Investigation Scope</span>
                  <p className="text-white leading-relaxed p-3 rounded bg-[#08090D] border border-white/5">
                    {selectedCase.description}
                  </p>
                </div>
              )}

              {/* Linked Advertisements List */}
              <div>
                <span className="text-[#9297A4] block text-[10px] uppercase mb-2">
                  Linked Advertisements ({selectedCase.advertisements.length})
                </span>
                <div className="space-y-2">
                  {selectedCase.advertisements.map((ad) => (
                    <div
                      key={ad.id}
                      className="p-2.5 rounded bg-[#08090D] border border-white/10 flex items-center justify-between"
                    >
                      <div className="truncate max-w-md">
                        <span className="font-bold text-white mr-2">{ad.custom_id || `AD-${ad.id}`}:</span>
                        <span className="text-[#9297A4]">{ad.original_text}</span>
                      </div>
                      <Link
                        to={`/investigations/${ad.id}`}
                        onClick={() => setSelectedCase(null)}
                        className="text-[#FF7547] hover:underline text-[11px] shrink-0 ml-2"
                      >
                        Evidence →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Feed */}
              <div>
                <span className="text-[#9297A4] block text-[10px] uppercase mb-2">
                  Analyst Investigation Log ({selectedCase.notes.length} entries)
                </span>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {selectedCase.notes.map((n) => (
                    <div key={n.id} className="p-3 rounded bg-[#08090D] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#626775]">
                        <span className="text-[#49D6A5] font-semibold">{n.actor}</span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-white text-xs">{n.note}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Append new forensic finding or observation..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 p-2 bg-[#171A22] border border-white/10 rounded text-xs text-white placeholder-[#626775] focus:outline-none focus:border-[#FF7547]"
                  />
                  <button
                    type="submit"
                    disabled={addingNote || !newNote.trim()}
                    className="px-4 py-2 bg-[#FF7547] text-white rounded font-semibold text-xs hover:bg-[#FF8A65]"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Case Creation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-display">Create Investigation Case</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-[#9297A4] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#9297A4] mb-1">Case Title</label>
                <input
                  type="text"
                  placeholder="e.g. Syndicate Campaign: FastCashDrop Telegram Ring"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#171A22] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF7547]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#9297A4] mb-1">Description / Hypothesis</label>
                <textarea
                  rows={3}
                  placeholder="Summary of suspected financial ad coordinated activities..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 bg-[#171A22] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF7547]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9297A4] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full p-2 bg-[#171A22] border border-white/10 rounded text-white"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#9297A4] mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newAssigned}
                    onChange={(e) => setNewAssigned(e.target.value)}
                    className="w-full p-2 bg-[#171A22] border border-white/10 rounded text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded bg-[#171A22] text-[#9297A4] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded bg-[#FF7547] text-white font-semibold hover:bg-[#FF8A65]"
                >
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
