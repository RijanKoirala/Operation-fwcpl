import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ManagementInstruction, Branch } from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { 
  Megaphone, Plus, Search, Filter, CheckCircle2, 
  Clock, AlertTriangle, MessageSquare, Send, Calendar, Building2
} from 'lucide-react';

export const Instructions: React.FC = () => {
  const { user } = useAuth();
  const [instructions, setInstructions] = useState<ManagementInstruction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<ManagementInstruction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_branch_id: '',
    priority: 'Normal',
    deadline: '',
    requires_acknowledgement: true
  });
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [instRes, branchRes] = await Promise.all([
        api.instructions.getAll(params),
        api.branches.getAll()
      ]);

      setInstructions(instRes.instructions || []);
      setBranches(branchRes.branches || []);
    } catch (err) {
      console.error('Failed to load instructions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.instructions.create({
        ...formData,
        target_branch_id: formData.target_branch_id ? Number(formData.target_branch_id) : undefined
      });
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        target_branch_id: '',
        priority: 'Normal',
        deadline: '',
        requires_acknowledgement: true
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to issue instruction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await api.instructions.acknowledge(id);
      loadData();
      if (selectedInstruction && selectedInstruction.id === id) {
        setSelectedInstruction(prev => prev ? { ...prev, status: 'Acknowledged' } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge');
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstruction) return;
    try {
      setSubmitting(true);
      await api.instructions.complete(selectedInstruction.id, completionRemarks);
      setShowCompleteModal(false);
      setShowDetailModal(false);
      setCompletionRemarks('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete instruction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstruction || !commentText.trim()) return;
    try {
      await api.instructions.addComment(selectedInstruction.id, commentText.trim());
      setCommentText('');
      const updated = await api.instructions.getById(selectedInstruction.id);
      setSelectedInstruction(updated.instruction);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const openDetail = async (inst: ManagementInstruction) => {
    try {
      const res = await api.instructions.getById(inst.id);
      setSelectedInstruction(res.instruction);
      setShowDetailModal(true);
    } catch (err) {
      setSelectedInstruction(inst);
      setShowDetailModal(true);
    }
  };

  const filtered = instructions.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.target_branch_name && i.target_branch_name.toLowerCase().includes(search.toLowerCase())) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = user?.role === 'Super Admin' || user?.role === 'Management';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            Management Directives & Instructions
          </h1>
          <p className="text-gray-500 text-sm">
            Top-down operational directives, policies, and branch actionable items with acknowledgment tracking.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" /> Issue Directive
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Directives" 
          value={instructions.length} 
          icon={<Megaphone className="w-5 h-5 text-indigo-600" />} 
          variant="default" 
        />
        <StatCard 
          title="Pending / Issued" 
          value={instructions.filter(i => i.status === 'Issued').length} 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          variant="warning" 
        />
        <StatCard 
          title="Acknowledged" 
          value={instructions.filter(i => i.status === 'Acknowledged').length} 
          icon={<AlertTriangle className="w-5 h-5 text-blue-600" />} 
          variant="info" 
        />
        <StatCard 
          title="Completed" 
          value={instructions.filter(i => i.status === 'Completed').length} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} 
          variant="success" 
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search instructions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="Issued">Issued</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Directives Cards / Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl text-center text-gray-400 border border-gray-100">
          Loading directives...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center text-gray-400 border border-gray-100">
          No directives found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((inst) => (
            <div 
              key={inst.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-medium text-gray-400">
                    DIR-#{inst.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={inst.priority} />
                    <StatusBadge status={inst.status} />
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-2 hover:text-indigo-600 transition cursor-pointer" onClick={() => openDetail(inst)}>
                  {inst.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                  {inst.description}
                </p>

                <div className="space-y-2 border-t border-gray-50 pt-3 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {inst.target_branch_name || 'All Branches (Global)'}
                    </span>
                    {inst.deadline && (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {new Date(inst.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-gray-400 pt-1">
                    <span>Issued by: {inst.issued_by_name || 'Management'}</span>
                    <span>{new Date(inst.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-gray-50/80 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => openDetail(inst)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  View & Discussion ({inst.comments?.length || 0})
                </button>

                <div className="flex items-center gap-2">
                  {inst.status === 'Issued' && inst.requires_acknowledgement && (
                    <button
                      onClick={() => handleAcknowledge(inst.id)}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Acknowledge
                    </button>
                  )}
                  {inst.status !== 'Completed' && (
                    <button
                      onClick={() => {
                        setSelectedInstruction(inst);
                        setShowCompleteModal(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Directive Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Issue Management Directive"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Directive Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mandatory Fiber Node Inspection Before Monsoon"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Branch</label>
            <select
              value={formData.target_branch_id}
              onChange={e => setFormData({ ...formData, target_branch_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Branches (Organization-wide Directive)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Instructions *</label>
            <textarea
              required
              rows={4}
              placeholder="Outline specific steps, checklist, compliance expectations..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="reqAck"
              checked={formData.requires_acknowledgement}
              onChange={e => setFormData({ ...formData, requires_acknowledgement: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="reqAck" className="text-xs text-gray-700 font-medium cursor-pointer">
              Require Branch Manager to formally acknowledge receipt
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Issuing...' : 'Issue Directive'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail & Discussion Modal */}
      {selectedInstruction && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Directive #${selectedInstruction.id}: ${selectedInstruction.title}`}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-500">Status: </span>
                <StatusBadge status={selectedInstruction.status} />
              </div>
              <div>
                <span className="text-gray-500">Priority: </span>
                <PriorityBadge priority={selectedInstruction.priority} />
              </div>
              <div>
                <span className="text-gray-500">Branch: </span>
                <span className="font-semibold text-gray-900">{selectedInstruction.target_branch_name || 'Global'}</span>
              </div>
              <div>
                <span className="text-gray-500">Issued: </span>
                <span className="font-semibold text-gray-900">{new Date(selectedInstruction.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap leading-relaxed">
                {selectedInstruction.description}
              </p>
            </div>

            {selectedInstruction.status === 'Completed' && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <h4 className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completion Remarks
                </h4>
                <p className="text-xs text-emerald-900">{selectedInstruction.completion_remarks || 'Completed as instructed.'}</p>
                <p className="text-[10px] text-emerald-600 mt-1">
                  Completed on {selectedInstruction.completed_at ? new Date(selectedInstruction.completed_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            )}

            {/* Comments Thread */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Communication Thread ({selectedInstruction.comments?.length || 0})
              </h4>

              <div className="space-y-2.5 max-h-48 overflow-y-auto mb-3 pr-1">
                {selectedInstruction.comments && selectedInstruction.comments.length > 0 ? (
                  selectedInstruction.comments.map((c, i) => (
                    <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                      <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1">
                        <span className="font-semibold text-gray-800">{c.user_name}</span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No notes or updates posted yet.</p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post progress update or query..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Directive Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Mark Directive as Completed"
      >
        <form onSubmit={handleComplete} className="space-y-4">
          <p className="text-xs text-gray-600">
            Please document the action taken or resolution summary for this directive.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Completion Remarks *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. All 14 junction boxes inspected, waterproof sealing replaced, photos archived on drive."
              value={completionRemarks}
              onChange={e => setCompletionRemarks(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
              className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Confirm Completion'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
