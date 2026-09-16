import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Search, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FollowUp } from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';

export const FollowUps: React.FC = () => {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultStatus, setResultStatus] = useState<'Completed' | 'Failed' | 'Waiting'>('Completed');
  const [nextDate, setNextDate] = useState('');

  const [createForm, setCreateForm] = useState({
    relatedCustomerCase: '',
    type: 'Customer',
    description: '',
    branchId: user?.branchId || '',
    assignedStaffId: '',
    followUpDate: new Date().toISOString().split('T')[0],
    priority: 'Medium',
    notes: '',
  });

  const followUpTypes = [
    'New Connection',
    'Customer',
    'Sales',
    'Payment',
    'Installation',
    'Complaint',
    'Support',
    'Management Instruction',
    'Other',
  ];

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ search, status: statusFilter, type: typeFilter }).toString();
      const [fRes, sRes] = await Promise.all([
        api.get(`/follow-ups?${q}`),
        api.get('/follow-ups/summary'),
      ]);
      if (fRes.success) setFollowUps(fRes.followUps);
      if (sRes.success) setSummary(sRes.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [bRes, stRes] = await Promise.all([api.get('/branches'), api.get('/staff')]);
        if (bRes.success) setBranches(bRes.branches);
        if (stRes.success) setStaffMembers(stRes.staff);
      } catch {}
    };
    loadMeta();
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [search, statusFilter, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/follow-ups', createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          relatedCustomerCase: '',
          type: 'Customer',
          description: '',
          branchId: user?.branchId || '',
          assignedStaffId: '',
          followUpDate: new Date().toISOString().split('T')[0],
          priority: 'Medium',
          notes: '',
        });
        fetchFollowUps();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create follow-up');
    }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    try {
      const res = await api.put(`/follow-ups/${selectedFollowUp.id}`, {
        status: resultStatus,
        result: resultText,
        nextFollowUpDate: nextDate || null,
      });
      if (res.success) {
        setShowResultModal(false);
        setResultText('');
        setNextDate('');
        fetchFollowUps();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save follow-up result');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Follow-up Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Customer interactions, subscription renewals, installation checks, and retention schedules
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Due Today" value={summary?.today || 0} icon={<Clock className="w-5 h-5" />} variant="amber" />
        <StatCard title="Overdue" value={summary?.overdue || 0} icon={<AlertCircle className="w-5 h-5" />} variant="rose" />
        <StatCard title="Upcoming" value={summary?.upcoming || 0} icon={<CalendarClock className="w-5 h-5" />} variant="blue" />
        <StatCard title="Completed" value={summary?.completed || 0} icon={<CheckCircle2 className="w-5 h-5" />} variant="emerald" />
        <StatCard title="Failed" value={summary?.failed || 0} icon={<XCircle className="w-5 h-5" />} variant="slate" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search case, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Today">Due Today</option>
            <option value="Overdue">Overdue</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
          >
            <option value="">All Types</option>
            {followUpTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Follow-up ID</th>
              <th className="py-3.5 px-4">Case / Customer</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Branch</th>
              <th className="py-3.5 px-4">Assigned Staff</th>
              <th className="py-3.5 px-4">Date Due</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {followUps.map(f => (
              <tr key={f.id} className={`hover:bg-slate-50/80 ${f.is_overdue ? 'bg-rose-50/20' : ''}`}>
                <td className="py-3.5 px-4 font-bold text-slate-800">{f.follow_up_id}</td>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-900 block">{f.related_customer_case}</span>
                  <span className="text-xs text-slate-400 line-clamp-1">{f.description}</span>
                </td>
                <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">{f.type}</td>
                <td className="py-3.5 px-4 text-xs text-slate-600">{f.branch_name}</td>
                <td className="py-3.5 px-4 font-medium text-slate-800">{f.assigned_staff_name || 'Unassigned'}</td>
                <td className="py-3.5 px-4 text-xs">
                  <span className={f.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                    {f.follow_up_date}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    <StatusBadge status={f.status} />
                    {f.is_overdue && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedFollowUp(f);
                      setResultStatus(f.status === 'Pending' ? 'Completed' : (f.status as any));
                      setResultText(f.result || '');
                      setShowResultModal(true);
                    }}
                    className="text-xs font-bold text-brand-600 hover:bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200"
                  >
                    Log Result
                  </button>
                </td>
              </tr>
            ))}
            {followUps.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No follow-ups matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Log Result Modal */}
      {selectedFollowUp && (
        <Modal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={`Log Outcome: ${selectedFollowUp.related_customer_case}`}
          subtitle={`Type: ${selectedFollowUp.type} • Assigned: ${selectedFollowUp.assigned_staff_name}`}
        >
          <form onSubmit={handleSaveResult} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Outcome Status *</label>
              <select
                value={resultStatus}
                onChange={e => setResultStatus(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
              >
                <option value="Completed">Completed Successfully</option>
                <option value="Waiting">Waiting on Customer Response</option>
                <option value="Failed">Failed / Customer Refused</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Outcome Details & Notes *</label>
              <textarea
                rows={3}
                required
                placeholder="What was agreed? Customer payment promised date, feedback, etc."
                value={resultText}
                onChange={e => setResultText(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reschedule Next Follow-up (Optional)</label>
              <input
                type="date"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
              >
                Save Outcome
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Schedule Follow-up Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Schedule Customer Follow-up">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Case / Customer Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Hotel Mountain View - Renewal Follow-up"
              value={createForm.relatedCustomerCase}
              onChange={e => setCreateForm({ ...createForm, relatedCustomerCase: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Type</label>
              <select
                value={createForm.type}
                onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                {followUpTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch *</label>
              <select
                required
                value={createForm.branchId}
                onChange={e => setCreateForm({ ...createForm, branchId: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Staff</label>
              <select
                value={createForm.assignedStaffId}
                onChange={e => setCreateForm({ ...createForm, assignedStaffId: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="">Select Staff</option>
                {staffMembers
                  .filter(s => !createForm.branchId || Number(s.branch_id) === Number(createForm.branchId))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date *</label>
              <input
                type="date"
                required
                value={createForm.followUpDate}
                onChange={e => setCreateForm({ ...createForm, followUpDate: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              placeholder="Reason for contact, talking points, special offers..."
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
            >
              Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
