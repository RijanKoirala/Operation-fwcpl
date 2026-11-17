import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Landmark,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldAlert,
  ArrowUpDown,
  History,
  Check,
  ChevronRight,
  Info,
  DollarSign,
  Ban,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  BranchRevenue,
  AccountsDashboardCards,
  BranchRevenueSummaryItem,
  AccountsReportTrendPoint,
  BranchComparisonItem,
  AccountsReportMetrics,
} from '../types';

interface AccountsProps {
  initialTab?: 'dashboard' | 'revenue' | 'reports';
  onNavigate?: (path: string) => void;
}

// Chart color palette
const CHART_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#3b82f6', '#d946ef', '#eab308', '#0ea5e9', '#a855f7',
  '#64748b', '#22c55e', '#ef4444', '#e11d48', '#0284c7'
];

export const Accounts: React.FC<AccountsProps> = ({ initialTab = 'dashboard', onNavigate }) => {
  const { user, hasPermission } = useAuth();

  // Role & Scope Detection
  const roleNameUpper = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleNameAlt = ((user as any)?.roleName || (user as any)?.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const usernameLower = (user?.username || '').toLowerCase();

  const isSuperAdmin =
    roleNameUpper === 'SUPER_ADMIN' ||
    roleNameAlt === 'SUPER_ADMIN' ||
    usernameLower === 'superadmin' ||
    hasPermission('accounts.dashboard') ||
    hasPermission('accounts.view');

  const hasRevenueView = isSuperAdmin || hasPermission('accounts.revenue.view') || hasPermission('accounts');
  const hasRevenueCreate = isSuperAdmin || hasPermission('accounts.revenue.create') || hasPermission('accounts');
  const hasRevenueEdit = isSuperAdmin || hasPermission('accounts.revenue.edit') || hasPermission('accounts');
  const hasReportsView = isSuperAdmin || hasPermission('accounts.reports.view');
  const hasExport = isSuperAdmin || hasPermission('accounts.export');

  const userBranchId = user?.branchId || (user as any)?.branch_id;
  const userBranchName = user?.branchName || (user as any)?.branch_name || 'My Branch';

  // If user does not have super admin / dashboard access, lock to 'revenue'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'revenue' | 'reports'>(() => {
    if (!isSuperAdmin) return 'revenue';
    return initialTab;
  });

  // Keep active tab in sync if initialTab changes
  useEffect(() => {
    if (isSuperAdmin && initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isSuperAdmin]);

  // Handle tab switch and update URL
  const handleTabChange = (tab: 'dashboard' | 'revenue' | 'reports') => {
    setActiveTab(tab);
    if (onNavigate) {
      if (tab === 'dashboard') onNavigate('accounts');
      else if (tab === 'revenue') onNavigate('accounts/revenue');
      else if (tab === 'reports') onNavigate('accounts/report');
    }
  };

  // Branches catalog
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data);
        } else if (Array.isArray(res.branches)) {
          setBranches(res.branches);
        }
      } catch (err) {
        console.warn('Failed to load branches list:', err);
      }
    };
    fetchBranches();
  }, []);

  // ============================================================
  // TAB 1: DASHBOARD STATE & LOGIC
  // ============================================================
  const [dashLoading, setDashLoading] = useState(false);
  const [dashPeriod, setDashPeriod] = useState<string>('month');
  const [dashBranch, setDashBranch] = useState<string>('ALL');
  const [dashStartDate, setDashStartDate] = useState<string>('');
  const [dashEndDate, setDashEndDate] = useState<string>('');
  const [dashSortBy, setDashSortBy] = useState<string>('revenue');
  const [dashSortOrder, setDashSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dashBranchSearch, setDashBranchSearch] = useState('');

  const [dashCards, setDashCards] = useState<AccountsDashboardCards>({
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    selectedPeriod: 0,
    selectedEntries: 0,
    periodLabel: 'This Month',
  });
  const [dashBranchSummary, setDashBranchSummary] = useState<BranchRevenueSummaryItem[]>([]);

  const fetchDashboardData = async () => {
    if (!isSuperAdmin) return;
    setDashLoading(true);
    try {
      const params: any = {
        period: dashPeriod,
        branchId: dashBranch,
        sortBy: dashSortBy,
        sortOrder: dashSortOrder,
      };
      if (dashPeriod === 'custom' && dashStartDate && dashEndDate) {
        params.startDate = dashStartDate;
        params.endDate = dashEndDate;
      }
      const res = await api.accounts.getDashboard(params);
      if (res.success) {
        setDashCards(res.summaryCards);
        setDashBranchSummary(res.branchesSummary || []);
      }
    } catch (err: any) {
      console.error('Failed to load accounts dashboard:', err);
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' && isSuperAdmin) {
      fetchDashboardData();
    }
  }, [activeTab, dashPeriod, dashBranch, dashSortBy, dashSortOrder]);

  // Filtered branch summary by search
  const filteredBranchSummary = useMemo(() => {
    if (!dashBranchSearch.trim()) return dashBranchSummary;
    const q = dashBranchSearch.toLowerCase().trim();
    return dashBranchSummary.filter(
      b =>
        b.branchName.toLowerCase().includes(q) ||
        (b.branchCode && b.branchCode.toLowerCase().includes(q)) ||
        (b.city && b.city.toLowerCase().includes(q))
    );
  }, [dashBranchSummary, dashBranchSearch]);

  // ============================================================
  // TAB 2: REVENUE ENTRIES STATE & LOGIC
  // ============================================================
  const [revLoading, setRevLoading] = useState(false);
  const [revenues, setRevenues] = useState<BranchRevenue[]>([]);
  const [revPage, setRevPage] = useState(1);
  const [revTotalPages, setRevTotalPages] = useState(1);
  const [revTotalCount, setRevTotalCount] = useState(0);
  const [revTotalAmount, setRevTotalAmount] = useState(0);

  // Filters
  const [revSearch, setRevSearch] = useState('');
  const [revBranchFilter, setRevBranchFilter] = useState<string>(isSuperAdmin ? 'ALL' : String(userBranchId || ''));
  const [revStatusFilter, setRevStatusFilter] = useState<string>('Active');
  const [revStartDate, setRevStartDate] = useState<string>('');
  const [revEndDate, setRevEndDate] = useState<string>('');
  const [revSortBy, setRevSortBy] = useState<string>('revenue_date');
  const [revSortOrder, setRevSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRevenues = async (page = revPage) => {
    setRevLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
        search: revSearch.trim(),
        branchId: isSuperAdmin ? revBranchFilter : userBranchId,
        status: revStatusFilter,
        sortBy: revSortBy,
        sortOrder: revSortOrder,
      };
      if (revStartDate) params.startDate = revStartDate;
      if (revEndDate) params.endDate = revEndDate;

      const res = await api.accounts.getRevenues(params);
      if (res.success) {
        setRevenues(res.revenues || []);
        setRevTotalPages(res.pagination?.totalPages || 1);
        setRevTotalCount(res.pagination?.total || 0);
        setRevTotalAmount(res.totalAmount || 0);
      }
    } catch (err: any) {
      console.error('Failed to load revenues:', err);
    } finally {
      setRevLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenues(revPage);
    }
  }, [activeTab, revPage, revBranchFilter, revStatusFilter, revSortBy, revSortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRevPage(1);
    fetchRevenues(1);
  };

  const handleClearFilters = () => {
    setRevSearch('');
    if (isSuperAdmin) setRevBranchFilter('ALL');
    setRevStatusFilter('Active');
    setRevStartDate('');
    setRevEndDate('');
    setRevPage(1);
  };

  // Jump from Dashboard to Revenue for specific branch
  const handleJumpToBranchRevenue = (bId: number) => {
    if (!isSuperAdmin) return;
    setRevBranchFilter(String(bId));
    setActiveTab('revenue');
  };

  // ============================================================
  // TAB 3: REPORTS STATE & LOGIC
  // ============================================================
  const [repLoading, setRepLoading] = useState(false);
  const [repPeriod, setRepPeriod] = useState<string>('month');
  const [repBranch, setRepBranch] = useState<string>('ALL');
  const [repStartDate, setRepStartDate] = useState<string>('');
  const [repEndDate, setRepEndDate] = useState<string>('');

  const [repMetrics, setRepMetrics] = useState<AccountsReportMetrics>({
    totalRevenue: 0,
    totalEntries: 0,
    averageDaily: 0,
    activeDays: 0,
    highestBranch: null,
    lowestBranch: null,
  });
  const [repTrend, setRepTrend] = useState<AccountsReportTrendPoint[]>([]);
  const [repBranchComparison, setRepBranchComparison] = useState<BranchComparisonItem[]>([]);

  const fetchReportsData = async () => {
    if (!hasReportsView) return;
    setRepLoading(true);
    try {
      const params: any = {
        period: repPeriod,
        branchId: repBranch,
      };
      if (repPeriod === 'custom' && repStartDate && repEndDate) {
        params.startDate = repStartDate;
        params.endDate = repEndDate;
      }
      const res = await api.accounts.getReports(params);
      if (res.success) {
        setRepMetrics(res.metrics);
        setRepTrend(res.trend || []);
        setRepBranchComparison(res.branchComparison || []);
      }
    } catch (err: any) {
      console.error('Failed to load accounts reports:', err);
    } finally {
      setRepLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && hasReportsView) {
      fetchReportsData();
    }
  }, [activeTab, repPeriod, repBranch]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const params: any = {};
    if (activeTab === 'reports') {
      if (repPeriod) params.period = repPeriod;
      if (repBranch && repBranch !== 'ALL') params.branchId = repBranch;
      if (repPeriod === 'custom') {
        if (repStartDate) params.startDate = repStartDate;
        if (repEndDate) params.endDate = repEndDate;
      }
    } else {
      if (revBranchFilter && revBranchFilter !== 'ALL') params.branchId = revBranchFilter;
      if (revStatusFilter && revStatusFilter !== 'all') params.status = revStatusFilter;
      if (revStartDate) params.startDate = revStartDate;
      if (revEndDate) params.endDate = revEndDate;
      if (revSearch) params.search = revSearch;
    }
    const url = api.accounts.exportCsvUrl(params);
    window.open(url, '_blank');
  };

  // ============================================================
  // MODALS STATE: Add, Edit, Void, Audit
  // ============================================================
  const getTodayInputStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBranchId, setAddBranchId] = useState<string>(isSuperAdmin ? '' : String(userBranchId || ''));
  const [addDate, setAddDate] = useState<string>(getTodayInputStr());
  const [addAmount, setAddAmount] = useState<string>('');
  const [addRemarks, setAddRemarks] = useState<string>('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const openAddModal = () => {
    setAddBranchId(isSuperAdmin ? (revBranchFilter !== 'ALL' ? revBranchFilter : '') : String(userBranchId || ''));
    setAddDate(getTodayInputStr());
    setAddAmount('');
    setAddRemarks('');
    setAddError(null);
    setShowAddModal(true);
  };

  const handleSaveRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(addAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setAddError('Amount must be greater than zero.');
      return;
    }
    if (isSuperAdmin && !addBranchId) {
      setAddError('Please select a branch.');
      return;
    }

    setAddSaving(true);
    setAddError(null);
    try {
      const payload: any = {
        amount: parsedAmt,
        revenueDate: addDate,
        remarks: addRemarks.trim(),
      };
      if (isSuperAdmin) {
        payload.branchId = parseInt(addBranchId, 10);
      } else {
        payload.branchId = userBranchId;
      }

      const res = await api.accounts.createRevenue(payload);
      if (res.success) {
        setShowAddModal(false);
        // Refresh records and dashboard
        if (activeTab === 'revenue') fetchRevenues(1);
        if (isSuperAdmin) fetchDashboardData();
      } else {
        setAddError(res.message || 'Failed to save revenue.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Error saving revenue.');
    } finally {
      setAddSaving(false);
    }
  };

  // Quick remarks suggestion chips
  const QUICK_REMARKS = [
    'Daily customer collection',
    'New connection revenue',
    'Renewal collection',
    'Counter collection',
    'Field collection',
  ];

  // 2. Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BranchRevenue | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (entry: BranchRevenue) => {
    setEditingEntry(entry);
    setEditDate(entry.revenueDate);
    setEditAmount(String(entry.amount));
    setEditRemarks(entry.remarks || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const parsedAmt = parseFloat(editAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setEditError('Amount must be greater than zero.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await api.accounts.updateRevenue(editingEntry.id, {
        amount: parsedAmt,
        revenueDate: editDate,
        remarks: editRemarks.trim(),
      });
      if (res.success) {
        setShowEditModal(false);
        fetchRevenues(revPage);
        if (isSuperAdmin) fetchDashboardData();
      } else {
        setEditError(res.message || 'Failed to update revenue.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error updating revenue.');
    } finally {
      setEditSaving(false);
    }
  };

  // 3. Void Confirmation Modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidingEntry, setVoidingEntry] = useState<BranchRevenue | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidSaving, setVoidSaving] = useState(false);

  const openVoidModal = (entry: BranchRevenue) => {
    setVoidingEntry(entry);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleConfirmVoid = async () => {
    if (!voidingEntry) return;
    setVoidSaving(true);
    try {
      const res = await api.accounts.voidRevenue(voidingEntry.id, { reason: voidReason.trim() });
      if (res.success) {
        setShowVoidModal(false);
        fetchRevenues(revPage);
        if (isSuperAdmin) fetchDashboardData();
      } else {
        alert(res.message || 'Failed to void entry.');
      }
    } catch (err: any) {
      alert(err.message || 'Error voiding entry.');
    } finally {
      setVoidSaving(false);
    }
  };

  // 4. History / Audit Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistoryModal = async (entry: BranchRevenue) => {
    setShowHistoryModal(true);
    setHistoryEntry(entry);
    setHistoryLoading(true);
    try {
      const res = await api.accounts.getRevenueById(entry.id);
      if (res.success) {
        setHistoryEntry(res.revenue);
        setHistoryList(res.history || []);
      }
    } catch (err) {
      console.warn('Failed to load audit history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Accounts & Revenue</h1>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isSuperAdmin ? 'Central Operations' : userBranchName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isSuperAdmin
                  ? 'Central daily revenue management, collection tracking, and analytics across all Fiberworld branches'
                  : `Record daily revenue collections and view branch financial history for ${userBranchName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                onClick={() => handleTabChange('revenue')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'revenue'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Revenue
              </button>
              <button
                onClick={() => handleTabChange('reports')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                Reports
              </button>
            </div>
          )}

          {/* Quick Action Button */}
          {hasRevenueCreate && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Revenue
            </button>
          )}

          {hasExport && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Export revenue data to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: SUPER ADMIN DASHBOARD */}
      {/* ============================================================ */}
      {activeTab === 'dashboard' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Dashboard Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setDashPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    dashPeriod === p.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {dashPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={dashStartDate}
                    onChange={e => setDashStartDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={dashEndDate}
                    onChange={e => setDashEndDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <button
                    onClick={fetchDashboardData}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={dashBranch}
                  onChange={e => setDashBranch(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchDashboardData}
                disabled={dashLoading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${dashLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 6 Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Today */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Today</span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {dashCards.today.toLocaleString()}
              </p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full w-2/3" />
              </div>
            </div>

            {/* 2. Yesterday */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Yesterday</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {dashCards.yesterday.toLocaleString()}
              </p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-500 h-full w-1/2" />
              </div>
            </div>

            {/* 3. This Week */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Week</span>
                <TrendingUp className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {dashCards.thisWeek.toLocaleString()}
              </p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-cyan-500 h-full w-3/4" />
              </div>
            </div>

            {/* 4. This Month */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Month</span>
                <BarChart3 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-emerald-600 tracking-tight">
                Rs. {dashCards.thisMonth.toLocaleString()}
              </p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full w-4/5" />
              </div>
            </div>

            {/* 5. This Year */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">This Year</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-lg font-black text-slate-900 tracking-tight">
                Rs. {dashCards.thisYear.toLocaleString()}
              </p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full w-full" />
              </div>
            </div>

            {/* 6. Selected Period Total */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4 rounded-2xl text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between text-indigo-300 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate" title={dashCards.periodLabel}>
                  {dashCards.periodLabel}
                </span>
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-lg font-black text-white tracking-tight">
                Rs. {dashCards.selectedPeriod.toLocaleString()}
              </p>
              <p className="text-[10px] text-indigo-200 font-medium mt-1">
                {dashCards.selectedEntries} total entries recorded
              </p>
            </div>
          </div>

          {/* Quick Graphical Top 6 Branches preview */}
          {dashBranchSummary.length > 0 && dashCards.selectedPeriod > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Branch Revenue Performance ({dashCards.periodLabel})</h3>
                  <p className="text-xs text-slate-500">Comparative revenue contribution of top collecting branches</p>
                </div>
                <button
                  onClick={() => handleTabChange('reports')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Full Graphical Reports <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashBranchSummary.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="branchName"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={val => (val.length > 12 ? val.substring(0, 10) + '...' : val)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={val => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Revenue']}
                      labelFormatter={label => `Branch: ${label}`}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Bar dataKey="selectedRevenue" name="Revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Branch-Wise Revenue Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Branch-Wise Revenue Summary</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Financial intake summary across all physical branch locations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search branch..."
                    value={dashBranchSearch}
                    onChange={e => setDashBranchSearch(e.target.value)}
                    className="text-xs border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 w-48 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <select
                  value={dashSortBy}
                  onChange={e => setDashSortBy(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 font-medium cursor-pointer"
                >
                  <option value="revenue">Sort: Selected Period</option>
                  <option value="today">Sort: Today</option>
                  <option value="month">Sort: This Month</option>
                  <option value="year">Sort: This Year</option>
                  <option value="name">Sort: Branch Name</option>
                </select>

                <button
                  onClick={() => setDashSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title={`Order: ${dashSortOrder.toUpperCase()}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Today</th>
                    <th className="py-3 px-4 text-right">Yesterday</th>
                    <th className="py-3 px-4 text-right">This Month</th>
                    <th className="py-3 px-4 text-right">This Year</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/50 text-indigo-900">
                      {dashCards.periodLabel}
                    </th>
                    <th className="py-3 px-4 text-center">Entries</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBranchSummary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No branches match the specified criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBranchSummary.map(row => (
                      <tr key={row.branchId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{row.branchName}</span>
                            {row.branchCode && (
                              <span className="text-[10px] font-mono text-slate-400">({row.branchCode})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          {row.todayRevenue > 0 ? `Rs. ${row.todayRevenue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {row.yesterdayRevenue > 0 ? `Rs. ${row.yesterdayRevenue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {row.monthRevenue > 0 ? `Rs. ${row.monthRevenue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {row.yearRevenue > 0 ? `Rs. ${row.yearRevenue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-indigo-600 bg-indigo-50/30">
                          {row.selectedRevenue > 0 ? `Rs. ${row.selectedRevenue.toLocaleString()}` : 'Rs. 0'}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {row.entriesCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleJumpToBranchRevenue(row.branchId)}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            View Entries →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: REVENUE ENTRY MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Branch Restricted Banner (for branch users) */}
          {!isSuperAdmin && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-indigo-900">Branch Revenue Registry: {userBranchName}</h3>
                  <p className="text-[11px] text-indigo-700">
                    Your account is authorized to view and submit daily collection figures for {userBranchName}.
                  </p>
                </div>
              </div>
              <button
                onClick={openAddModal}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Daily Revenue
              </button>
            </div>
          )}

          {/* Revenue Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by remarks, staff name, or branch..."
                    value={revSearch}
                    onChange={e => setRevSearch(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Branch & Status Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                {isSuperAdmin && (
                  <select
                    value={revBranchFilter}
                    onChange={e => {
                      setRevBranchFilter(e.target.value);
                      setRevPage(1);
                    }}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium cursor-pointer"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={revStatusFilter}
                  onChange={e => {
                    setRevStatusFilter(e.target.value);
                    setRevPage(1);
                  }}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium cursor-pointer"
                >
                  <option value="Active">Active Only</option>
                  <option value="all">All Entries</option>
                  <option value="Voided">Voided Entries</option>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={revStartDate}
                    onChange={e => {
                      setRevStartDate(e.target.value);
                      setRevPage(1);
                    }}
                    className="text-xs border border-slate-300 rounded-xl px-2 py-1.5 bg-white"
                    placeholder="From Date"
                    title="Start Date"
                  />
                  <span className="text-xs text-slate-400">-</span>
                  <input
                    type="date"
                    value={revEndDate}
                    onChange={e => {
                      setRevEndDate(e.target.value);
                      setRevPage(1);
                    }}
                    className="text-xs border border-slate-300 rounded-xl px-2 py-1.5 bg-white"
                    placeholder="To Date"
                    title="End Date"
                  />
                </div>

                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
                  title="Reset Filters"
                >
                  Reset
                </button>

                <button
                  onClick={() => fetchRevenues(revPage)}
                  disabled={revLoading}
                  className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${revLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filtered stats chip summary */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong className="text-slate-900">{revenues.length}</strong> of{' '}
                  <strong className="text-slate-900">{revTotalCount}</strong> entries
                </span>
                <span>
                  Filtered Collection Total:{' '}
                  <strong className="text-emerald-600 font-bold">
                    Rs. {revTotalAmount.toLocaleString()}
                  </strong>
                </span>
              </div>
              <div>
                <span>Displaying in NPR (Rs.) • Asia/Kathmandu Time</span>
              </div>
            </div>
          </div>

          {/* Revenue Entries Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Revenue Amount</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4">Entered By</th>
                    <th className="py-3 px-4">Created Time</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenues.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center text-slate-400">
                        {revLoading ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                            <span>Loading revenue entries...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Wallet className="w-8 h-8 text-slate-300" />
                            <span className="font-medium text-slate-600">No revenue entries recorded yet.</span>
                            {hasRevenueCreate && (
                              <button
                                onClick={openAddModal}
                                className="mt-2 px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-indigo-700"
                              >
                                + Record First Revenue Entry
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    revenues.map(entry => {
                      const isVoided = entry.status === 'Voided';
                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isVoided ? 'bg-rose-50/20 opacity-75' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{entry.revenueDate}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{entry.branchName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-black text-sm ${
                                isVoided ? 'text-slate-400 line-through' : 'text-emerald-700'
                              }`}
                            >
                              Rs. {entry.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={entry.remarks}>
                            {entry.remarks || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                            {entry.createdByName || 'Staff'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                            {entry.updatedByName ? (
                              <span title={`Updated by ${entry.updatedByName}`}>
                                {entry.updatedByName} (
                                {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : ''})
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isVoided ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Voided
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Audit trail button */}
                              <button
                                onClick={() => openHistoryModal(entry)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="View Audit History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Button */}
                              {hasRevenueEdit && !isVoided && (
                                <button
                                  onClick={() => openEditModal(entry)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                  title="Edit Entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Void Button (Super Admin only) */}
                              {isSuperAdmin && !isVoided && (
                                <button
                                  onClick={() => openVoidModal(entry)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Void Revenue Entry"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {revTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {revPage} of {revTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={revPage <= 1}
                    onClick={() => setRevPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={revPage >= revTotalPages}
                    onClick={() => setRevPage(p => Math.min(revTotalPages, p + 1))}
                    className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: GRAPHICAL REPORTS & ANALYTICS */}
      {/* ============================================================ */}
      {activeTab === 'reports' && hasReportsView && (
        <div className="space-y-6">
          {/* Reports Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setRepPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    repPeriod === p.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {repPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={repStartDate}
                    onChange={e => setRepStartDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={repEndDate}
                    onChange={e => setRepEndDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  />
                  <button
                    onClick={fetchReportsData}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={repBranch}
                  onChange={e => setRepBranch(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={fetchReportsData}
                disabled={repLoading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${repLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* KPI Highlight Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Revenue
              </span>
              <p className="text-xl font-black text-slate-900 tracking-tight">
                Rs. {repMetrics.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Across selected period</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Entries
              </span>
              <p className="text-xl font-black text-slate-900 tracking-tight">
                {repMetrics.totalEntries}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{repMetrics.activeDays} active collection days</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Average Daily
              </span>
              <p className="text-xl font-black text-slate-900 tracking-tight">
                Rs. {repMetrics.averageDaily.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Per collection day</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                🏆 Top Branch
              </span>
              <p className="text-sm font-black text-slate-900 truncate">
                {repMetrics.highestBranch ? repMetrics.highestBranch.name : '—'}
              </p>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                {repMetrics.highestBranch ? `Rs. ${repMetrics.highestBranch.amount.toLocaleString()}` : ''}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Lowest Branch
              </span>
              <p className="text-sm font-black text-slate-900 truncate">
                {repMetrics.lowestBranch ? repMetrics.lowestBranch.name : '—'}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {repMetrics.lowestBranch ? `Rs. ${repMetrics.lowestBranch.amount.toLocaleString()}` : ''}
              </p>
            </div>
          </div>

          {/* Charts Row: Bar Chart & Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900">
                  {repBranch === 'ALL' ? 'Branch Revenue Comparison' : `Daily Revenue Trend — ${branches.find(b => String(b.id) === String(repBranch))?.name || 'Selected Branch'}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {repBranch === 'ALL'
                    ? 'Total revenue collected by each branch in this period'
                    : 'Collection trend over time for this location'}
                </p>
              </div>

              <div className="h-72 w-full">
                {repBranch === 'ALL' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repBranchComparison.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="branchName"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={val => (val.length > 12 ? val.substring(0, 10) + '...' : val)}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={val => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                      />
                      <Tooltip
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Total Revenue']}
                        labelFormatter={label => `Branch: ${label}`}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                      />
                      <Bar dataKey="totalAmount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={val => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                      />
                      <Tooltip
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Revenue']}
                        labelFormatter={label => `Date: ${label}`}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                      />
                      <Bar dataKey="amount" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pie / Donut Chart (1 col) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Branch Contribution</h3>
                <p className="text-xs text-slate-500 mb-2">Percentage share of overall company revenue</p>
              </div>

              <div className="h-64 w-full">
                {repBranchComparison.filter(b => b.totalAmount > 0).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No collection data recorded for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repBranchComparison.filter(b => b.totalAmount > 0).slice(0, 8)}
                        dataKey="totalAmount"
                        nameKey="branchName"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {repBranchComparison.slice(0, 8).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Mini Legend */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                {repBranchComparison
                  .filter(b => b.totalAmount > 0)
                  .slice(0, 6)
                  .map((b, idx) => (
                    <div key={b.branchId} className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="truncate text-slate-700" title={b.branchName}>
                        {b.branchName}: <strong>{b.percentage}%</strong>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Report Summary Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Detailed Revenue Report</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Itemized metrics, averages, and peak collections by branch
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export Table
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-center">Entries</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Contribution %</th>
                    <th className="py-3 px-4 text-right">Average Daily</th>
                    <th className="py-3 px-4 text-right">Highest Single Entry</th>
                    <th className="py-3 px-4 text-right">Lowest Single Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repBranchComparison.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No report data available.
                      </td>
                    </tr>
                  ) : (
                    repBranchComparison.map(row => (
                      <tr key={row.branchId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.branchName}
                          {row.branchCode && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">({row.branchCode})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {row.entriesCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Rs. {row.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                          {row.percentage}%
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {row.avgDaily > 0 ? `Rs. ${row.avgDaily.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {row.maxDaily > 0 ? `Rs. ${row.maxDaily.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {row.minDaily > 0 ? `Rs. ${row.minDaily.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Total Row */}
                {repBranchComparison.length > 0 && (
                  <tfoot className="bg-slate-100/80 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="py-3 px-4">TOTAL (All Branches)</td>
                      <td className="py-3 px-4 text-center">
                        {repBranchComparison.reduce((sum, r) => sum + r.entriesCount, 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 text-sm">
                        Rs. {repMetrics.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">100.0%</td>
                      <td className="py-3 px-4 text-right">
                        Rs. {repMetrics.averageDaily.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">—</td>
                      <td className="py-3 px-4 text-right">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD REVENUE */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Revenue Collection</h3>
                  <p className="text-xs text-slate-500">Enter daily collection amount for branch accounts</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRevenue} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Branch Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Branch</label>
                {isSuperAdmin ? (
                  <select
                    value={addBranchId}
                    onChange={e => setAddBranchId(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Target Branch...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{userBranchName}</span>
                    <span className="text-[10px] text-slate-500 font-normal ml-auto">Locked to your login</span>
                  </div>
                )}
              </div>

              {/* Revenue Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Revenue Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={addDate}
                  max={getTodayInputStr()}
                  onChange={e => setAddDate(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Defaults to today. Future dates are prohibited.
                </span>
              </div>

              {/* Revenue Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Revenue Amount (NPR / Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 125000"
                    value={addAmount}
                    onChange={e => setAddAmount(e.target.value)}
                    required
                    className="w-full text-sm font-black border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {addAmount && !isNaN(parseFloat(addAmount)) && parseFloat(addAmount) > 0 && (
                  <p className="text-[11px] font-bold text-emerald-600 mt-1">
                    Entered: Rs. {parseFloat(addAmount).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Daily customer counter collection, new connection payments..."
                  value={addRemarks}
                  onChange={e => setAddRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-indigo-500"
                />

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_REMARKS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAddRemarks(q)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                    >
                      + {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {addSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{addSaving ? 'Saving...' : 'Save Revenue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT REVENUE */}
      {/* ============================================================ */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Revenue Entry #{editingEntry.id}</h3>
                  <p className="text-xs text-slate-500">Branch: {editingEntry.branchName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRevenue} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  All modifications to revenue figures will be logged in the permanent activity and security audit trail.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Revenue Date</label>
                <input
                  type="date"
                  value={editDate}
                  max={getTodayInputStr()}
                  onChange={e => setEditDate(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Revenue Amount (Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    required
                    className="w-full text-sm font-black border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {editAmount && !isNaN(parseFloat(editAmount)) && (
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    Previous: Rs. {editingEntry.amount.toLocaleString()} → New: Rs.{' '}
                    {parseFloat(editAmount).toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks / Reason for edit</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {editSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editSaving ? 'Updating...' : 'Update Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: VOID CONFIRMATION (Super Admin Only) */}
      {/* ============================================================ */}
      {showVoidModal && voidingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center font-bold">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Void Revenue Entry</h3>
                <p className="text-xs text-slate-500">Entry #{voidingEntry.id} • {voidingEntry.branchName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to void this revenue collection of{' '}
              <strong className="text-slate-900">Rs. {voidingEntry.amount.toLocaleString()}</strong> from{' '}
              <strong className="text-slate-900">{voidingEntry.revenueDate}</strong>? Financial records are not
              permanently deleted; this entry will be marked as Voided and removed from revenue totals.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for voiding</label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry by staff, erroneous receipt amount..."
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Keep Entry
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={voidSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {voidSaving ? 'Voiding...' : 'Yes, Void Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: AUDIT HISTORY TRAIL */}
      {/* ============================================================ */}
      {showHistoryModal && historyEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Audit Trail — Revenue #{historyEntry.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {historyEntry.branchName} • {historyEntry.revenueDate} • Rs. {Number(historyEntry.amount).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading audit trail...</div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No subsequent modification records logged for this entry.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((h, i) => (
                    <div
                      key={h.id || i}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          {h.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Actor: <strong className="text-slate-800">{h.actorName}</strong>
                      </p>
                      {h.details && typeof h.details === 'object' && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                          {h.details.oldAmount !== undefined && (
                            <p>
                              Amount changed: <strong className="text-slate-500">Rs. {h.details.oldAmount}</strong> →{' '}
                              <strong className="text-emerald-700 font-bold">Rs. {h.details.newAmount}</strong>
                            </p>
                          )}
                          {h.details.oldDate !== undefined && h.details.oldDate !== h.details.newDate && (
                            <p>
                              Date changed: <span className="text-slate-500">{h.details.oldDate}</span> →{' '}
                              <span className="text-slate-900 font-bold">{h.details.newDate}</span>
                            </p>
                          )}
                          {h.details.oldRemarks !== undefined && h.details.oldRemarks !== h.details.newRemarks && (
                            <p>
                              Remarks: <span className="text-slate-500">{h.details.oldRemarks || '—'}</span> →{' '}
                              <span className="text-slate-900">{h.details.newRemarks || '—'}</span>
                            </p>
                          )}
                          {h.details.reason && (
                            <p className="text-rose-600 font-semibold">Reason: {h.details.reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
