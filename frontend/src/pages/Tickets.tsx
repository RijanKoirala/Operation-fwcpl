import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SupportTicket, TicketPriority, TicketStatus } from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';

export const Tickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerPhone: '',
    branchId: user?.branchId || '',
    issueCategory: 'Internet Down',
    description: '',
    assignedStaffId: '',
    priority: 'Medium' as TicketPriority,
  });

  const categories = [
    'Internet Down',
    'Slow Internet',
    'WiFi Issue',
    'Router/ONT Issue',
    'Billing',
    'Payment',
    'Installation',
    'Technical Issue',
    'Service Request',
    'Complaint',
    'Other',
  ];

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        status: statusFilter,
        priority: priorityFilter,
        branchId: branchFilter,
      }).toString();

      const [tRes, mRes] = await Promise.all([
        api.get(`/tickets?${q}`),
        api.get('/tickets/metrics'),
      ]);

      if (tRes.success) setTickets(tRes.tickets);
      if (mRes.success) setMetrics(mRes.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [bRes, sRes] = await Promise.all([api.get('/branches'), api.get('/staff')]);
        if (bRes.success) setBranches(bRes.branches);
        if (sRes.success) setStaffMembers(sRes.staff);
      } catch {}
    };
    loadMeta();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, branchFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tickets', createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          customerName: '',
          customerPhone: '',
          branchId: user?.branchId || '',
          issueCategory: 'Internet Down',
          description: '',
          assignedStaffId: '',
          priority: 'Medium',
        });
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    }
  };

  const openTicketDetail = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      if (res.success) {
        setSelectedTicket(res.ticket);
        setTicketComments(res.comments);
      }
    } catch {}
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const res = await api.put(`/tickets/${selectedTicket.id}`, {
        status: 'Resolved',
        resolution: resolutionText,
      });
      if (res.success) {
        setShowResolveModal(false);
        setResolutionText('');
        fetchTickets();
        openTicketDetail(res.ticket);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/comments`, { comment: newComment });
      if (res.success) {
        setNewComment('');
        openTicketDetail(selectedTicket);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Support Ticket System</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            24/7 SLA helpline, technical recovery, outage resolution, and subscriber support
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Support Ticket
        </button>
      </div>

      {/* SLA Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard title="Open Tickets" value={metrics?.openTickets || 0} icon={<Ticket className="w-5 h-5" />} variant="blue" />
        <StatCard title="Critical SLA" value={metrics?.criticalTickets || 0} icon={<ShieldAlert className="w-5 h-5" />} variant="rose" />
        <StatCard title="Overdue SLA" value={metrics?.overdueTickets || 0} icon={<AlertCircle className="w-5 h-5" />} variant="amber" />
        <StatCard title="Resolved Today" value={metrics?.resolvedToday || 0} icon={<CheckCircle2 className="w-5 h-5" />} variant="emerald" />
        <StatCard title="Closed Today" value={metrics?.closedToday || 0} icon={<Clock className="w-5 h-5" />} variant="purple" />
        <StatCard title="Avg Resolution" value={`${metrics?.avgResolutionHours || 3.5}h`} icon={<Clock className="w-5 h-5" />} variant="slate" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search ticket code, customer, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Overdue">Overdue SLA</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {user?.role !== 'BRANCH_MANAGER' && user?.role !== 'STAFF' && (
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Ticket ID</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Category & Description</th>
              <th className="py-3.5 px-4">Branch</th>
              <th className="py-3.5 px-4">Assigned Staff</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">SLA Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map(t => (
              <tr
                key={t.id}
                className={`hover:bg-slate-50/80 transition-colors ${
                  t.is_overdue ? 'bg-rose-50/20' : ''
                }`}
              >
                <td className="py-3.5 px-4 font-bold text-slate-800">{t.ticket_id}</td>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-900 block">{t.customer_name}</span>
                  <span className="text-xs text-slate-400">{t.customer_phone}</span>
                </td>
                <td className="py-3.5 px-4 max-w-xs">
                  <span className="font-semibold text-slate-800 text-xs block">{t.issue_category}</span>
                  <span className="text-xs text-slate-400 line-clamp-1">{t.description}</span>
                </td>
                <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{t.branch_name}</td>
                <td className="py-3.5 px-4 font-medium text-slate-800">{t.assigned_staff_name || 'Unassigned'}</td>
                <td className="py-3.5 px-4"><PriorityBadge priority={t.priority} /></td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={t.status} />
                    {t.is_overdue && (
                      <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => openTicketDetail(t)}
                    className="text-xs font-bold text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No support tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket: ${selectedTicket.ticket_id} - ${selectedTicket.issue_category}`}
          subtitle={`Customer: ${selectedTicket.customer_name} (${selectedTicket.customer_phone}) • Branch: ${selectedTicket.branch_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedTicket.status} />
                <PriorityBadge priority={selectedTicket.priority} />
                {selectedTicket.is_overdue && (
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    SLA BREACHED
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                Created: {new Date(selectedTicket.created_date).toLocaleString()}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Issue Description</h4>
              <p className="text-sm text-slate-800 bg-white p-3 rounded-xl border border-slate-200">
                {selectedTicket.description}
              </p>
            </div>

            {selectedTicket.resolution && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-800 block mb-1">Resolution Summary:</span>
                <p className="text-emerald-950 font-medium">{selectedTicket.resolution}</p>
                {selectedTicket.resolution_time_minutes && (
                  <span className="text-[10px] text-emerald-600 mt-1 block">
                    Resolved in: {selectedTicket.resolution_time_minutes} minutes
                  </span>
                )}
              </div>
            )}

            {/* Resolve Action */}
            {!['Resolved', 'Closed', 'Cancelled'].includes(selectedTicket.status) && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm"
                >
                  Mark Ticket Resolved
                </button>
              </div>
            )}

            {/* Comments */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600" /> Ticket Timeline & Discussion
              </h4>

              <div className="max-h-44 overflow-y-auto space-y-2">
                {ticketComments.map((c: any) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-center mb-1 font-semibold">
                      <span className="text-slate-800">{c.author_name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700">{c.comment}</p>
                  </div>
                ))}
                {ticketComments.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No comments logged yet.</p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log technician action or customer feedback..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Resolve Modal */}
      <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Support Ticket">
        <form onSubmit={handleResolveTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Details *</label>
            <textarea
              rows={4}
              required
              placeholder="Detail root cause and remedy (e.g. Spliced core 4, replaced ONT adapter, reset PPPoE credentials)..."
              value={resolutionText}
              onChange={e => setResolutionText(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-brand-500 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowResolveModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              Confirm Resolution
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Ticket Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Customer Support Ticket">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Binod Basnet"
                value={createForm.customerName}
                onChange={e => setCreateForm({ ...createForm, customerName: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Phone *</label>
              <input
                type="text"
                required
                placeholder="+977-98..."
                value={createForm.customerPhone}
                onChange={e => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Issue Category</label>
              <select
                value={createForm.issueCategory}
                onChange={e => setCreateForm({ ...createForm, issueCategory: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={createForm.priority}
                onChange={e => setCreateForm({ ...createForm, priority: e.target.value as any })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="Critical">Critical (4h SLA)</option>
                <option value="High">High (12h SLA)</option>
                <option value="Medium">Medium (24h SLA)</option>
                <option value="Low">Low (48h SLA)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assign Support Staff</label>
            <select
              value={createForm.assignedStaffId}
              onChange={e => setCreateForm({ ...createForm, assignedStaffId: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
            >
              <option value="">Leave Unassigned (New)</option>
              {staffMembers
                .filter(s => !createForm.branchId || Number(s.branch_id) === Number(createForm.branchId))
                .map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.designation_name})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Issue Description *</label>
            <textarea
              rows={3}
              required
              placeholder="Describe symptoms, LOS red light blinking, optical loss, speed test result..."
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium"
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
              Create Ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
