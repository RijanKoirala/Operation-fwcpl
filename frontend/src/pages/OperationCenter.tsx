import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Eye,
  Send,
  Building2,
  Tag,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Edit2,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  OperationTicket,
  OperationTicketStats,
  OperationCategory,
  OperationPriority,
  OperationStatus,
} from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const OPERATION_CATEGORIES: OperationCategory[] = [
  'HR / ADMIN',
  'Technical / Network Issue',
  'Revenue',
  'Sales',
  'Billing',
  'Customer Complain',
  'Hardware and Equipment',
  'Maintenance',
  'Others',
];

export const OPERATION_PRIORITIES: OperationPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

// Helpers for Asia/Kathmandu (Nepal Time)
export const formatNepalDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateVal);
  }
};

export const formatNepalTime = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
};

export const formatNepalDateTime = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '—';
  return `${formatNepalDate(dateVal)}, ${formatNepalTime(dateVal)}`;
};

interface OperationCenterProps {
  onNavigate?: (path: string) => void;
}

export const OperationCenter: React.FC<OperationCenterProps> = ({ onNavigate }) => {
  const { user, hasPermission } = useAuth();

  // Role scoping
  const userRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleNameUpper = ((user as any)?.roleName || (user as any)?.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const userDept = (user?.departmentCode || user?.department_code || '').toUpperCase();
  const isCentral =
    userRole === 'SUPER_ADMIN' ||
    roleNameUpper === 'SUPER_ADMIN' ||
    user?.username === 'superadmin' ||
    hasPermission('operation_center.view_all') ||
    ((userRole === 'MANAGEMENT' || roleNameUpper === 'MANAGEMENT' || userDept === 'OPERATION' || userDept === 'OPS' || userDept === 'EXEC') &&
      (!user?.branchId || user?.allowedBranches === 'ALL' || user?.allowedBranches === '*'));

  const userBranchId = user?.branchId ? Number(user.branchId) : undefined;

  // Data states
  const [tickets, setTickets] = useState<OperationTicket[]>([]);
  const [stats, setStats] = useState<OperationTicketStats>({ open: 0, inProgress: 0, closed: 0, total: 0 });
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>(isCentral ? '' : userBranchId ? String(userBranchId) : '');
  const [datePeriod, setDatePeriod] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createSubject, setCreateSubject] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState<OperationCategory>('Technical / Network Issue');
  const [createPriority, setCreatePriority] = useState<OperationPriority>('Medium');
  const [createBranchId, setCreateBranchId] = useState<string>(userBranchId ? String(userBranchId) : '');
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createPreviews, setCreatePreviews] = useState<string[]>([]);

  // View / Detail Modal State
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [detailTicket, setDetailTicket] = useState<OperationTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Updates & Status in Detail Modal
  const [newRemark, setNewRemark] = useState('');
  const [postingRemark, setPostingRemark] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeResolution, setCloseResolution] = useState('');
  const [closingTicket, setClosingTicket] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit Ticket Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<OperationCategory>('Technical / Network Issue');
  const [editPriority, setEditPriority] = useState<OperationPriority>('Medium');
  const [editResolution, setEditResolution] = useState('');
  const [editStatus, setEditStatus] = useState<OperationStatus>('OPEN');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);

  // Image Lightbox Preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // File input refs
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load branches metadata for central users
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get('/branches');
        if (res.success && Array.isArray(res.branches)) {
          setBranches(res.branches);
          if (!createBranchId && res.branches.length > 0) {
            setCreateBranchId(userBranchId ? String(userBranchId) : String(res.branches[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    loadBranches();
  }, [userBranchId]);

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const qObj: Record<string, string> = {};
      if (!isCentral && userBranchId) {
        qObj.branchId = String(userBranchId);
      } else if (branchFilter) {
        qObj.branchId = branchFilter;
      }
      const res = await api.operationCenter.getStats(qObj);
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Tickets List
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const qObj: Record<string, string> = {
        page: String(page),
        limit: '50',
      };
      if (search.trim()) qObj.search = search.trim();
      if (statusFilter) qObj.status = statusFilter;
      if (categoryFilter) qObj.category = categoryFilter;
      if (priorityFilter) qObj.priority = priorityFilter;

      if (!isCentral && userBranchId) {
        qObj.branchId = String(userBranchId);
      } else if (branchFilter) {
        qObj.branchId = branchFilter;
      }

      if (datePeriod !== 'all') {
        qObj.period = datePeriod;
        if (datePeriod === 'custom') {
          if (customStart) qObj.startDate = customStart;
          if (customEnd) qObj.endDate = customEnd;
        }
      }

      const res = await api.operationCenter.getAll(qObj);
      if (res.success) {
        setTickets(res.tickets || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch operation tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [branchFilter]);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, categoryFilter, priorityFilter, branchFilter, datePeriod, customStart, customEnd, page]);

  // Handle clicking dashboard status card
  const handleStatusCardClick = (status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') => {
    if (statusFilter === status) {
      setStatusFilter(''); // Toggle off
    } else {
      setStatusFilter(status);
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    if (isCentral) setBranchFilter('');
    setDatePeriod('all');
    setCustomStart('');
    setCustomEnd('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    statusFilter ||
    categoryFilter ||
    priorityFilter ||
    (isCentral && branchFilter) ||
    datePeriod !== 'all'
  );

  // File preview handlers
  const handleCreateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const allowed = selected.filter(f => f.type.startsWith('image/'));
      if (allowed.length < selected.length) {
        alert('Only image files (JPG, PNG, WEBP) are supported.');
      }
      const combined = [...createFiles, ...allowed].slice(0, 5);
      setCreateFiles(combined);

      const previews = combined.map(f => URL.createObjectURL(f));
      setCreatePreviews(previews);
    }
  };

  const removeCreateFile = (idx: number) => {
    const updated = createFiles.filter((_, i) => i !== idx);
    setCreateFiles(updated);
    const updatedPreviews = updated.map(f => URL.createObjectURL(f));
    setCreatePreviews(updatedPreviews);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setCreateSubject('');
    setCreateDescription('');
    setCreateCategory('Technical / Network Issue');
    setCreatePriority('Medium');
    setCreateBranchId(userBranchId ? String(userBranchId) : branches[0]?.id ? String(branches[0].id) : '');
    setCreateFiles([]);
    setCreatePreviews([]);
    setShowCreateModal(true);
  };

  // Submit Create Ticket
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubject.trim()) {
      alert('Please enter a Subject / Title for the ticket.');
      return;
    }
    if (!createDescription.trim()) {
      alert('Please enter problem details and description.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', createSubject.trim());
      formData.append('description', createDescription.trim());
      formData.append('category', createCategory);
      formData.append('priority', createPriority);
      if (createBranchId) {
        formData.append('branchId', createBranchId);
      }

      for (const file of createFiles) {
        formData.append('attachments', file);
      }

      const res = await api.operationCenter.create(formData);
      if (res.success) {
        setShowCreateModal(false);
        fetchStats();
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Ticket Details Modal
  const openTicketDetails = async (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await api.operationCenter.getById(ticketId);
      if (res.success && res.ticket) {
        setDetailTicket(res.ticket);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load ticket details.');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Refresh current ticket in detail modal
  const refreshDetailTicket = async () => {
    if (!selectedTicketId) return;
    try {
      const res = await api.operationCenter.getById(selectedTicketId);
      if (res.success && res.ticket) {
        setDetailTicket(res.ticket);
      }
    } catch {}
  };

  // Post Remark / Update
  const handlePostRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTicket || !newRemark.trim()) return;

    setPostingRemark(true);
    try {
      const res = await api.operationCenter.addUpdate(detailTicket.id, { message: newRemark.trim() });
      if (res.success) {
        setNewRemark('');
        await refreshDetailTicket();
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to post update.');
    } finally {
      setPostingRemark(false);
    }
  };

  // Update Status to In Progress
  const handleStartWorking = async () => {
    if (!detailTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await api.operationCenter.updateStatus(detailTicket.id, {
        status: 'IN_PROGRESS',
        remark: 'Operation started working on the ticket.',
      });
      if (res.success) {
        await refreshDetailTicket();
        fetchStats();
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Reopen Ticket
  const handleReopenTicket = async () => {
    if (!detailTicket) return;
    if (!confirm('Are you sure you want to reopen this ticket?')) return;
    setUpdatingStatus(true);
    try {
      const res = await api.operationCenter.updateStatus(detailTicket.id, {
        status: 'IN_PROGRESS',
        remark: 'Ticket reopened for further action.',
      });
      if (res.success) {
        await refreshDetailTicket();
        fetchStats();
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Submit Close Ticket
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTicket) return;
    if (!closeResolution.trim()) {
      alert('Please provide the Action Taken / Resolution details before closing.');
      return;
    }

    setClosingTicket(true);
    try {
      const res = await api.operationCenter.updateStatus(detailTicket.id, {
        status: 'CLOSED',
        resolution: closeResolution.trim(),
      });
      if (res.success) {
        setShowCloseModal(false);
        setCloseResolution('');
        await refreshDetailTicket();
        fetchStats();
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to close ticket.');
    } finally {
      setClosingTicket(false);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!detailTicket) return;
    setEditSubject(detailTicket.subject || '');
    setEditDescription(detailTicket.description || '');
    setEditCategory(detailTicket.category || 'Technical / Network Issue');
    setEditPriority(detailTicket.priority || 'Medium');
    setEditResolution(detailTicket.resolution || '');
    setEditStatus(detailTicket.status || 'OPEN');
    setEditFiles([]);
    setEditPreviews([]);
    setShowEditModal(true);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      const combined = [...editFiles, ...selected].slice(0, 5);
      setEditFiles(combined);
      setEditPreviews(combined.map(f => URL.createObjectURL(f)));
    }
  };

  const removeEditFile = (idx: number) => {
    const updated = editFiles.filter((_, i) => i !== idx);
    setEditFiles(updated);
    setEditPreviews(updated.map(f => URL.createObjectURL(f)));
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTicket) return;

    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', editSubject.trim());
      formData.append('description', editDescription.trim());
      formData.append('category', editCategory);
      formData.append('priority', editPriority);
      formData.append('resolution', editResolution.trim());
      if (isCentral) {
        formData.append('status', editStatus);
      }

      for (const file of editFiles) {
        formData.append('attachments', file);
      }

      const res = await api.operationCenter.update(detailTicket.id, formData);
      if (res.success) {
        setShowEditModal(false);
        await refreshDetailTicket();
        fetchTickets();
        fetchStats();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Can user edit ticket?
  const canEditTicket = (t: OperationTicket) => {
    if (isCentral) return true;
    if (userBranchId && Number(t.branch_id) === Number(userBranchId)) {
      return t.status === 'OPEN';
    }
    return false;
  };

  // Can user change status / close?
  const canChangeStatus =
    isCentral ||
    hasPermission('operation_center.update_status') ||
    hasPermission('operation_center.close');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Operation Center
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Branch → Operation Queue
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Central communication channel for branch issues, technical inquiries, and operational support
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Top 3 Status Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* OPEN CARD */}
        <div
          onClick={() => handleStatusCardClick('OPEN')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden bg-white shadow-xs hover:shadow-md ${
            statusFilter === 'OPEN'
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Open
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Awaiting Action</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {statsLoading ? '—' : stats.open}
            </span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {stats.total > 0 ? `${Math.round((stats.open / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending review & dispatch</p>
        </div>

        {/* IN PROGRESS CARD */}
        <div
          onClick={() => handleStatusCardClick('IN_PROGRESS')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden bg-white shadow-xs hover:shadow-md ${
            statusFilter === 'IN_PROGRESS'
              ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/20'
              : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              In Progress
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Active Work</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {statsLoading ? '—' : stats.inProgress}
            </span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {stats.total > 0 ? `${Math.round((stats.inProgress / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Being resolved by Operation</p>
        </div>

        {/* CLOSED CARD */}
        <div
          onClick={() => handleStatusCardClick('CLOSED')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden bg-white shadow-xs hover:shadow-md ${
            statusFilter === 'CLOSED'
              ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Closed
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Resolved</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {statsLoading ? '—' : stats.closed}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {stats.total > 0 ? `${Math.round((stats.closed / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Completed with action taken</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search ticket ID, subject, details..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Date Period Filter */}
          <select
            value={datePeriod}
            onChange={e => {
              setDatePeriod(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-2 font-medium cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {datePeriod === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customStart}
                onChange={e => {
                  setCustomStart(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2 py-1.5 font-medium"
              />
              <span className="text-[11px] text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => {
                  setCustomEnd(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2 py-1.5 font-medium"
              />
            </div>
          )}

          {/* Branch filter (central users only) */}
          {isCentral && (
            <select
              value={branchFilter}
              onChange={e => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-2 font-medium cursor-pointer max-w-[160px] truncate"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-2 font-medium cursor-pointer max-w-[160px] truncate"
          >
            <option value="">All Categories</option>
            {OPERATION_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-2 font-medium cursor-pointer"
          >
            <option value="">All Priorities</option>
            {OPERATION_PRIORITIES.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-2 font-medium cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="Clear all active filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Ticket List Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span className="font-semibold">
          Showing <span className="font-bold text-slate-800">{tickets.length}</span> of{' '}
          <span className="font-bold text-slate-800">{totalCount}</span> tickets
          {statusFilter ? ` • Filtered by ${statusFilter}` : ''}
        </span>
        <button
          onClick={() => {
            fetchStats();
            fetchTickets();
          }}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tickets Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 whitespace-nowrap">Ticket ID</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Branch</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
              <th className="py-3.5 px-4 min-w-[200px]">Issue / Problem</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Priority</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
              <th className="py-3.5 px-4 min-w-[220px]">Action Taken / Remarks</th>
              <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Ticket ID */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-200 px-2 py-0.5 rounded-lg inline-block">
                    {t.ticket_id}
                  </span>
                </td>

                {/* Date & Time (Nepal) */}
                <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                  <div className="font-semibold text-slate-800">{formatNepalDate(t.created_at)}</div>
                  <div className="text-[11px] text-slate-500">{formatNepalTime(t.created_at)}</div>
                </td>

                {/* Branch */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]" title={t.branch_name}>
                    {t.branch_name}
                  </span>
                </td>

                {/* Category */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 max-w-[170px] truncate" title={t.category}>
                    {t.category}
                  </span>
                </td>

                {/* Issue / Problem */}
                <td className="py-3.5 px-4 min-w-[200px] max-w-[300px]">
                  <div className="font-bold text-slate-900 text-xs truncate" title={t.subject}>
                    {t.subject}
                  </div>
                  {t.description && t.description !== t.subject && (
                    <div className="text-[11px] text-slate-500 truncate mt-0.5 line-clamp-1" title={t.description}>
                      {t.description}
                    </div>
                  )}
                </td>

                {/* Priority */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <PriorityBadge priority={t.priority} />
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge status={t.status} />
                </td>

                {/* Action Taken / Remarks */}
                <td className="py-3.5 px-4 min-w-[220px] max-w-[300px]">
                  {t.resolution ? (
                    <div className="text-xs text-slate-700 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 truncate" title={t.resolution}>
                      {t.resolution}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No action recorded</span>
                  )}
                </td>

                {/* Action */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => openTicketDetails(t.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                      title="View details & timeline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    {canEditTicket(t) && (
                      <button
                        onClick={async () => {
                          const res = await api.operationCenter.getById(t.id);
                          if (res.success && res.ticket) {
                            setDetailTicket(res.ticket);
                            setEditSubject(res.ticket.subject || '');
                            setEditDescription(res.ticket.description || '');
                            setEditCategory(res.ticket.category || 'Technical / Network Issue');
                            setEditPriority(res.ticket.priority || 'Medium');
                            setEditResolution(res.ticket.resolution || '');
                            setEditStatus(res.ticket.status || 'OPEN');
                            setShowEditModal(true);
                          }
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Edit ticket details & action"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {tickets.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No operation tickets found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters ? 'No tickets match the selected filters.' : 'No tickets have been raised yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tickets Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {tickets.map(t => (
          <div
            key={t.id}
            onClick={() => openTicketDetails(t.id)}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                {t.ticket_id}
              </span>
              <div className="flex items-center gap-1.5">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {t.category}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t.subject}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
            </div>

            {t.resolution && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Action Taken / Remarks:</span>
                <span className="text-slate-600 line-clamp-2">{t.resolution}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-700">{t.branch_name}</span>
              <span>{formatNepalDateTime(t.created_at)}</span>
            </div>
          </div>
        ))}

        {tickets.length === 0 && !loading && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No operation tickets found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasActiveFilters ? 'No tickets match the selected filters.' : 'No tickets have been raised yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE TICKET MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Operation Ticket"
        subtitle="Raise an operational issue or request to the central Operation team"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto Ticket ID preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ticket ID</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-500">
                OP-XXXXX (Auto Generated)
              </div>
            </div>

            {/* Branch Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch *</label>
              {!isCentral && userBranchId ? (
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
                  {user?.branchName || branches.find(b => b.id === userBranchId)?.name || 'Assigned Branch'}
                </div>
              ) : (
                <select
                  required
                  value={createBranchId}
                  onChange={e => setCreateBranchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
              <select
                required
                value={createCategory}
                onChange={e => setCreateCategory(e.target.value as OperationCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
              >
                {OPERATION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority *</label>
              <select
                required
                value={createPriority}
                onChange={e => setCreatePriority(e.target.value as OperationPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
              >
                {OPERATION_PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject / Short Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Subject / Short Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Internet down at branch / Fiber required / Printer not working"
              value={createSubject}
              onChange={e => setCreateSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Problem Details / Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the issue in detail, including when it occurred, affected services, and any preliminary troubleshooting..."
              value={createDescription}
              onChange={e => setCreateDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500 resize-y"
            />
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attachments (Optional Images)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                multiple
                onChange={handleCreateFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Select Photos (Max 5)
              </button>
              <span className="text-[11px] text-slate-400">JPG, PNG, WEBP (Max 10MB)</span>
            </div>

            {/* Previews */}
            {createPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {createPreviews.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeCreateFile(idx)}
                      className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-90 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {createSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* TICKET DETAILS MODAL */}
      {/* ============================================================ */}
      {detailTicket && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Ticket: ${detailTicket.ticket_id}`}
          subtitle={`${detailTicket.branch_name} • ${detailTicket.category}`}
          maxWidth="3xl"
        >
          <div className="space-y-6">
            {/* Top Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={detailTicket.status} />
                <PriorityBadge priority={detailTicket.priority} />
                <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {detailTicket.category}
                </span>
              </div>
              <div className="text-xs text-slate-500 text-right">
                <div>
                  Created: <b className="text-slate-800">{formatNepalDateTime(detailTicket.created_at)}</b>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Raised by: {detailTicket.created_by_name || 'Staff'}
                </div>
              </div>
            </div>

            {/* Subject & Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {detailTicket.subject}
                </h3>
                {canEditTicket(detailTicket) && (
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Details
                  </button>
                )}
              </div>
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {detailTicket.description}
              </div>
            </div>

            {/* Resolution / Action Taken Banner */}
            {(detailTicket.resolution || detailTicket.status === 'CLOSED') && (
              <div className={`p-4 rounded-2xl border space-y-1.5 ${
                detailTicket.status === 'CLOSED'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-indigo-50/70 border-indigo-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    detailTicket.status === 'CLOSED' ? 'text-emerald-800' : 'text-indigo-800'
                  }`}>
                    <CheckCircle2 className={`w-4 h-4 ${
                      detailTicket.status === 'CLOSED' ? 'text-emerald-600' : 'text-indigo-600'
                    }`} />
                    Action Taken / Resolution
                  </span>
                  {detailTicket.closed_at ? (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Resolved: {formatNepalDateTime(detailTicket.closed_at)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-indigo-700 font-medium">
                      Current Action / Remark
                    </span>
                  )}
                </div>
                <p className={`text-xs font-medium leading-relaxed whitespace-pre-wrap mt-1 ${
                  detailTicket.status === 'CLOSED' ? 'text-emerald-900' : 'text-slate-800'
                }`}>
                  {detailTicket.resolution || 'Ticket marked as Closed by Operation.'}
                </p>
                {detailTicket.closed_by_name && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    Resolved by: {detailTicket.closed_by_name}
                  </p>
                )}
              </div>
            )}

            {/* Attachments Section */}
            {detailTicket.attachments && detailTicket.attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Attachments ({detailTicket.attachments.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {detailTicket.attachments.map(att => (
                    <div
                      key={att.id}
                      onClick={() => setLightboxUrl(att.file_url)}
                      className="cursor-pointer group relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 hover:border-indigo-400 transition"
                      title={att.file_name}
                    >
                      <img
                        src={att.file_url}
                        alt={att.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity & Updates Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Activity & Updates Timeline
              </h4>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200 max-h-64 overflow-y-auto">
                {detailTicket.updates && detailTicket.updates.length > 0 ? (
                  detailTicket.updates.map((upd, idx) => (
                    <div key={upd.id || idx} className="flex gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-bold text-slate-700">
                            {upd.user_name || 'System'}
                          </span>
                          <span>{formatNepalDateTime(upd.created_at)}</span>
                        </div>
                        <p className="text-slate-700 font-medium mt-0.5 whitespace-pre-wrap">
                          {upd.message}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No updates recorded yet.</p>
                )}
              </div>
            </div>

            {/* Post Remark / Action Taken Input */}
            <form onSubmit={handlePostRemark} className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                {isCentral ? 'Add Operation Remark / Action Taken' : 'Add Note / Response'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    isCentral
                      ? 'e.g. Forwarded to NOC team / Technician dispatched / Checking link...'
                      : 'Add an update or answer to Operation team...'
                  }
                  value={newRemark}
                  onChange={e => setNewRemark(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500"
                />
                <button
                  type="submit"
                  disabled={postingRemark || !newRemark.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Post
                </button>
              </div>
            </form>

            {/* Action Buttons Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close View
              </button>

              {/* Status Action Buttons for Central Users */}
              {canChangeStatus && (
                <div className="flex items-center gap-2">
                  {/* If OPEN -> Start Working */}
                  {detailTicket.status === 'OPEN' && (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={handleStartWorking}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Mark In Progress
                    </button>
                  )}

                  {/* If IN_PROGRESS or OPEN -> Close Ticket */}
                  {detailTicket.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCloseResolution('');
                        setShowCloseModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Close Ticket
                    </button>
                  )}

                  {/* If CLOSED -> Reopen */}
                  {detailTicket.status === 'CLOSED' && (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={handleReopenTicket}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen Ticket
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* CLOSE TICKET RESOLUTION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Resolve & Close Ticket"
        subtitle={`Ticket ${detailTicket?.ticket_id} • ${detailTicket?.branch_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleCloseSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Action Taken / Resolution *
            </label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Forwarded issue to NOC team. Fiber team dispatched. Internet restored at 1:00 PM."
              value={closeResolution}
              onChange={e => setCloseResolution(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500 resize-y"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This resolution message will be permanently recorded and displayed to the branch.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCloseModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={closingTicket || !closeResolution.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {closingTicket ? 'Closing...' : 'Confirm & Close'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* EDIT TICKET MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Ticket Details"
        subtitle={`Ticket ${detailTicket?.ticket_id}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
              <select
                required
                value={editCategory}
                onChange={e => setEditCategory(e.target.value as OperationCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
              >
                {OPERATION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority *</label>
              <select
                required
                value={editPriority}
                onChange={e => setEditPriority(e.target.value as OperationPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
              >
                {OPERATION_PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={editSubject}
              onChange={e => setEditSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500 resize-y"
            />
          </div>

          {/* Action Taken / Resolution / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Action Taken / Resolution / Remarks
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Forwarded to NOC team / Equipment dispatched / Problem solved..."
              value={editResolution}
              onChange={e => setEditResolution(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500 resize-y"
            />
          </div>

          {/* Status (Central users can adjust status) */}
          {isCentral && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as OperationStatus)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          )}

          {/* Add more attachments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Add Additional Photos (Optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                multiple
                onChange={handleEditFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => editFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Select Photos
              </button>
            </div>

            {editPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {editPreviews.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeEditFile(idx)}
                      className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* IMAGE LIGHTBOX MODAL */}
      {/* ============================================================ */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <img src={lightboxUrl} alt="Enlarged view" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationCenter;
