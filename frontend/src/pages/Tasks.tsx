import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Check,
  X,
  RotateCcw,
  UserCheck,
  Users,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Task, TaskComment, TaskHistory } from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { MultiStaffSelect, AssignedStaffPills } from '../components/common/MultiStaffSelect';

export const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignStaffIds, setReassignStaffIds] = useState<number[]>([]);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'General',
    branchId: user?.branchId || '',
    assignedStaffIds: [] as number[],
    priority: 'Medium',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const qObj: Record<string, string> = {
        search,
        status: statusFilter,
        priority: priorityFilter,
        branchId: branchFilter,
      };
      if (staffFilter) qObj.staffId = staffFilter;
      const q = new URLSearchParams(qObj).toString();
      const res = await api.get(`/tasks?${q}`);
      if (res.success) setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [brRes, stRes] = await Promise.all([api.get('/branches'), api.get('/staff')]);
      if (brRes.success) setBranches(brRes.branches);
      if (stRes.success) setStaffMembers(stRes.staff);
    } catch {}
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, priorityFilter, branchFilter, staffFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tasks', createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          category: 'General',
          branchId: user?.branchId || '',
          assignedStaffIds: [],
          priority: 'Medium',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        fetchTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    try {
      const res = await api.get(`/tasks/${task.id}`);
      if (res.success) {
        setSelectedTask(res.task);
        setTaskComments(res.comments);
        setTaskHistory(res.history);
      }
    } catch {}
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.success) {
        fetchTasks();
        if (selectedTask?.id === taskId) {
          openTaskDetail(res.task);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    }
  };

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const res = await api.put(`/tasks/${selectedTask.id}/status`, {
        status: 'Completed',
        completionRemarks,
      });
      if (res.success) {
        setShowCompleteModal(false);
        setCompletionRemarks('');
        fetchTasks();
        openTaskDetail(res.task);
      }
    } catch (err: any) {
      alert(err.message || 'Completion update failed');
    }
  };

  const handleReviewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/review`, {
        action: reviewAction,
        remarks: reviewRemarks,
      });
      if (res.success) {
        setShowReviewModal(false);
        setReviewRemarks('');
        fetchTasks();
        openTaskDetail(res.task);
      }
    } catch (err: any) {
      alert(err.message || 'Review submission failed');
    }
  };

  const openReassignModal = (task: Task) => {
    const currentIds = (task.assigned_staff && task.assigned_staff.length > 0)
      ? task.assigned_staff.map(s => (s.staff_id || s.id) as number).filter(Boolean)
      : (task.assigned_to_id ? [task.assigned_to_id] : []);
    setReassignStaffIds(currentIds);
    setShowReassignModal(true);
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/reassign`, {
        assignedStaffIds: reassignStaffIds,
      });
      if (res.success) {
        setShowReassignModal(false);
        setReassignStaffIds([]);
        fetchTasks();
        openTaskDetail(res.task);
      }
    } catch (err: any) {
      alert(err.message || 'Reassign failed');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/comments`, { comment: newComment });
      if (res.success) {
        setNewComment('');
        openTaskDetail(selectedTask);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Task & Operations Center</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational ticketing, assignments, evidence-backed completions, and SLA auditing
          </p>
        </div>

        {['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'].includes(user?.role || '') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Operations Task
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search task title, ID..."
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
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
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

          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium max-w-[150px] truncate"
          >
            <option value="">All Staff</option>
            {staffMembers
              .filter(s => !branchFilter || Number(s.branch_id) === Number(branchFilter))
              .map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Task Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Task ID</th>
              <th className="py-3.5 px-4">Title & Category</th>
              <th className="py-3.5 px-4">Branch</th>
              <th className="py-3.5 px-4">Assigned To</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Workflow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-800">{t.task_id}</td>
                <td className="py-3.5 px-4">
                  <span
                    onClick={() => openTaskDetail(t)}
                    className="font-bold text-slate-900 hover:text-brand-600 cursor-pointer block"
                  >
                    {t.title}
                  </span>
                  <span className="text-xs text-slate-400">{t.category}</span>
                </td>
                <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{t.branch_name}</td>
                <td className="py-3.5 px-4 font-medium text-slate-800">
                  <AssignedStaffPills staff={t.assigned_staff} fallbackName={t.assigned_to_name} />
                </td>
                <td className="py-3.5 px-4"><PriorityBadge priority={t.priority} /></td>
                <td className="py-3.5 px-4 text-xs">
                  <span className={t.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                    {t.due_date}
                  </span>
                </td>
                <td className="py-3.5 px-4"><StatusBadge status={t.status} /></td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => openTaskDetail(t)}
                    className="text-xs font-bold text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors border border-brand-200"
                  >
                    View / Manage
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No tasks matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Task Detail & Workflow Modal */}
      {selectedTask && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          title={`Task: ${selectedTask.title}`}
          subtitle={`ID: ${selectedTask.task_id} • Category: ${selectedTask.category} • Branch: ${selectedTask.branch_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Status & SLA Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedTask.status} />
                <PriorityBadge priority={selectedTask.priority} />
                {selectedTask.is_overdue && (
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    OVERDUE
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Due: <b className="text-slate-800">{selectedTask.due_date}</b>
              </div>
            </div>

            {/* Assigned Operations Team */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  Assigned Operations Team ({selectedTask.assigned_staff?.length || (selectedTask.assigned_to_name ? 1 : 0)})
                </h4>
                {user?.role !== 'STAFF' && selectedTask.status !== 'Closed' && (
                  <button
                    type="button"
                    onClick={() => openReassignModal(selectedTask)}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Edit Assignment
                  </button>
                )}
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                {selectedTask.assigned_staff && selectedTask.assigned_staff.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTask.assigned_staff.map((s, idx) => (
                      <div
                        key={s.staff_id || idx}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {s.full_name}
                            {s.is_primary && (
                              <span className="ml-1.5 px-1.5 py-0.2 text-[9px] bg-brand-50 text-brand-700 font-black rounded border border-brand-200">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {s.designation_name || 'Staff'} {s.phone ? `• ${s.phone}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedTask.assigned_to_name ? (
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedTask.assigned_to_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{selectedTask.assigned_to_name}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No staff members currently assigned.</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">Description</h4>
              <p className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                {selectedTask.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Completion Remarks (if completed) */}
            {selectedTask.completion_remarks && (
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Completion Evidence & Remarks</span>
                </div>
                <p className="text-xs text-emerald-950 font-medium">{selectedTask.completion_remarks}</p>
                {selectedTask.completion_date && (
                  <span className="text-[10px] text-emerald-600 mt-1 block">
                    Completed on: {new Date(selectedTask.completion_date).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Workflow Action Bar */}
            <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-brand-900">Task Actions:</span>
              <div className="flex flex-wrap gap-2">
                {/* Staff transitions */}
                {selectedTask.status === 'Assigned' && (
                  <button
                    onClick={() => handleStatusChange(selectedTask.id, 'Acknowledged')}
                    className="px-3 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg hover:bg-brand-700"
                  >
                    Acknowledge Task
                  </button>
                )}
                {['Assigned', 'Acknowledged'].includes(selectedTask.status) && (
                  <button
                    onClick={() => handleStatusChange(selectedTask.id, 'In Progress')}
                    className="px-3 py-1.5 bg-sky-600 text-white font-bold text-xs rounded-lg hover:bg-sky-700"
                  >
                    Start (In Progress)
                  </button>
                )}
                {['Acknowledged', 'In Progress'].includes(selectedTask.status) && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700"
                  >
                    Submit Completion
                  </button>
                )}

                {/* Manager / Admin Review actions */}
                {selectedTask.status === 'Completed' && user?.role !== 'STAFF' && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="px-3.5 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700"
                  >
                    Review & Close Task
                  </button>
                )}

                {/* Reassign action */}
                {user?.role !== 'STAFF' && selectedTask.status !== 'Closed' && (
                  <button
                    onClick={() => openReassignModal(selectedTask)}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50"
                  >
                    Reassign Task
                  </button>
                )}
              </div>
            </div>

            {/* Comments & Activity Timeline */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600" /> Comments & Status History
              </h4>

              {/* History trail */}
              <div className="max-h-36 overflow-y-auto space-y-2 text-xs border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                {taskHistory.map(h => (
                  <div key={h.id} className="flex items-start gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">{h.user_name}:</span> changed status to{' '}
                      <b className="text-slate-900">{h.to_status}</b>
                      {h.remarks && <span className="italic text-slate-500"> — "{h.remarks}"</span>}
                      <span className="text-[10px] text-slate-400 block">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments list */}
              <div className="max-h-44 overflow-y-auto space-y-2">
                {taskComments.map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-center mb-1 font-semibold">
                      <span className="text-slate-800">{c.author_name} ({c.author_role})</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700">{c.comment}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment or internal note..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Completion Remarks Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Task"
        subtitle="Provide completion remarks and evidence for manager review"
      >
        <form onSubmit={handleCompleteTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Completion Remarks *</label>
            <textarea
              rows={4}
              required
              placeholder="Detail the actions taken, optical readings, resolution verified, etc."
              value={completionRemarks}
              onChange={e => setCompletionRemarks(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-brand-500 font-medium"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              Confirm Completion
            </button>
          </div>
        </form>
      </Modal>

      {/* Manager Review Modal (Approve / Reject) */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Task Completion"
      >
        <form onSubmit={handleReviewTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Review Decision</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-emerald-700 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  checked={reviewAction === 'APPROVE'}
                  onChange={() => setReviewAction('APPROVE')}
                />
                <span>Approve & Close Task</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-rose-700 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  checked={reviewAction === 'REJECT'}
                  onChange={() => setReviewAction('REJECT')}
                />
                <span>Reject & Reopen for Rework</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Review Notes</label>
            <textarea
              rows={3}
              placeholder="Feedback for the staff member..."
              value={reviewRemarks}
              onChange={e => setReviewRemarks(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl ${
                reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Submit Review
            </button>
          </div>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title="Reassign Task">
        <form onSubmit={handleReassign} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Staff Members ({reassignStaffIds.length} selected)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Select one or multiple staff members who will execute or collaborate on this task (or leave empty to unassign).
            </p>
            <MultiStaffSelect
              staff={staffMembers.filter(s => !selectedTask || Number(s.branch_id) === Number(selectedTask.branch_id))}
              selectedIds={reassignStaffIds}
              onChange={setReassignStaffIds}
              placeholder="Search and select staff members..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowReassignModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
            >
              Update Assignments
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Operations Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Repair 24-core backbone splice"
              value={createForm.title}
              onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Detailed instructions, location coordinates, optical targets..."
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch *</label>
              <select
                required
                value={createForm.branchId}
                onChange={e => {
                  const newBranchId = e.target.value;
                  setCreateForm({
                    ...createForm,
                    branchId: newBranchId,
                    assignedStaffIds: createForm.assignedStaffIds.filter(id => {
                      const st = staffMembers.find(s => s.id === id);
                      return st && (!newBranchId || Number(st.branch_id) === Number(newBranchId));
                    }),
                  });
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assign Staff ({createForm.assignedStaffIds.length} selected)
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Assign one or multiple team members to this task.
              </p>
              <MultiStaffSelect
                staff={staffMembers.filter(s => !createForm.branchId || Number(s.branch_id) === Number(createForm.branchId))}
                selectedIds={createForm.assignedStaffIds}
                onChange={ids => setCreateForm({ ...createForm, assignedStaffIds: ids })}
                placeholder="Search staff to assign..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={createForm.category}
                onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                {['General', 'Operations', 'Sales', 'Customer Support', 'Technical', 'Installation', 'Follow-up', 'Collection', 'Management'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={createForm.priority}
                onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={createForm.startDate}
                onChange={e => setCreateForm({ ...createForm, startDate: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={createForm.dueDate}
                onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
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
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
