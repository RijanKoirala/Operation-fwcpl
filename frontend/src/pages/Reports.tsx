import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Branch } from '../types';
import {
  FileText, Download, Filter, Calendar, Building2,
  RefreshCw, CheckCircle2, AlertTriangle, ArrowDownToLine,
  ChevronLeft, ChevronRight, Lock, Search, Eye, X,
  ListFilter, CheckSquare, Layers, ShieldCheck, Clock,
  User as UserIcon, ChevronDown, ChevronUp
} from 'lucide-react';

interface ExecutiveReportDef {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

interface OperationalReportDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  permission?: string;
}

const EXECUTIVE_REPORTS: ExecutiveReportDef[] = [
  { id: 'branch-performance', name: 'Branch Performance & Podium Scores', description: 'Overall scores, target completion, and ranking of all 20+ branches', category: 'Executive', icon: '🏆' },
  { id: 'staff-productivity', name: 'Staff Task Productivity & Leaderboard', description: 'Total tasks completed, on-time delivery %, and staff ranking', category: 'Human Resources', icon: '👥' },
  { id: 'connections-pipeline', name: 'Customer Connection Funnel & Conversions', description: 'Detailed breakdown across 8 installation pipeline stages', category: 'Sales & Field', icon: '🔌' },
  { id: 'goods-requisitions', name: 'Goods Requisitions & Stock Dispatches', description: 'Branch material requisitions, approval ratios, and fulfillment statuses', category: 'Supply Chain', icon: '📦' },
  { id: 'followups-conversion', name: 'Follow-ups Status & Lead Conversion', description: 'Pipeline follow-up outcomes, won/lost ratios, and pending calls', category: 'Sales', icon: '📞' },
  { id: 'overdue-audit', name: 'Critical Overdue Audit (Tasks & Follow-ups)', description: 'Immediate operational bottlenecks and overdue action items', category: 'Compliance', icon: '⚠️' },
  { id: 'directives-compliance', name: 'Management Directives Acknowledgment Audit', description: 'Top-down instructions status and branch response times', category: 'Executive', icon: '📜' },
  { id: 'targets-kpis', name: 'Target & KPI Achievement Matrix', description: 'Goal vs achieved comparison for branches and individual personnel', category: 'Performance', icon: '🎯' },
  { id: 'audit-trail', name: 'Complete System Activity & Audit Log', description: 'Timestamped record of all user operations and entity modifications', category: 'Security', icon: '🛡️' }
];

const OPERATIONAL_REPORTS: OperationalReportDef[] = [
  { id: 'tasks', name: 'Tasks', description: 'Operational task records, multi-staff assignments, dates, and completion status', icon: '📋' },
  { id: 'follow-ups', name: 'Follow-ups', description: 'Customer cases, leads, status, and scheduled follow-up tracking', icon: '📞' },
  { id: 'connections', name: 'New Connections', description: 'Connection requests, package plans, installation dates, and multi-staff technicians', icon: '🔌' },
  { id: 'goods', name: 'Goods / Requisitions', description: 'Material requests, item-level quantities, units, and delivery statuses', icon: '📦' },
  { id: 'targets', name: 'Targets', description: 'Branch and personnel targets with automated connection achievement sync', icon: '🎯' },
  { id: 'staff-productivity', name: 'Staff Productivity', description: 'Staff task delivery rates, on-time completion %, and performance scores', icon: '👥' },
  { id: 'audit', name: 'Audit Log', description: 'Audited log of system-wide operations and security actions', icon: '🛡️', permission: 'audit.view' },
];

export const Reports: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const isSuperAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.roleName === 'Super Admin' ||
    user?.role_name === 'Super Admin' ||
    user?.username === 'superadmin';

  const roleUpper = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleNameUpper = (user?.roleName || user?.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const deptUpper = (user?.departmentCode || user?.department_code || user?.departmentName || '').toUpperCase();

  const isCentralLeadership =
    isSuperAdmin ||
    roleUpper === 'MANAGEMENT' ||
    roleNameUpper === 'MANAGEMENT' ||
    deptUpper.includes('EXEC') ||
    deptUpper.includes('OPERATION') ||
    deptUpper.includes('OPS');

  const canViewAudit = isSuperAdmin || hasPermission('audit.view') || hasPermission('audit');
  const canExport = isSuperAdmin || hasPermission('reports.export') || hasPermission('reports.view') || hasPermission('reports');

  // Filter & Selection State
  const [selectedReport, setSelectedReport] = useState('tasks');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<string>('');
  const [staffId, setStaffId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI State
  const [showExecutiveCards, setShowExecutiveCards] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 1. Initial Setup: Branches and Branch Security
  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (!isCentralLeadership && user?.branchId) {
      setBranchId(String(user.branchId));
    }
  }, [isCentralLeadership, user]);

  // 2. Load Staff for Staff Filter
  useEffect(() => {
    loadStaff();
  }, [branchId]);

  // 3. Auto Fetch Report When Selected Report or Branch changes (initial)
  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport]);

  const loadBranches = async () => {
    try {
      const res = await api.branches.getAll();
      setBranches(res.branches || []);
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const loadStaff = async () => {
    try {
      const effectiveBId = !isCentralLeadership && user?.branchId ? user.branchId : (branchId ? parseInt(branchId, 10) : undefined);
      const res = await api.staff.getAll({ branchId: effectiveBId, limit: 300 });
      setStaffList(res.staff || res.data || []);
    } catch (err) {
      console.error('Failed to load staff list', err);
    }
  };

  const isStaffFilterApplicable = (report: string) => {
    return [
      'tasks', 'connections', 'connections-pipeline', 'new-connections',
      'follow-ups', 'followups', 'followups-conversion',
      'goods', 'goods-requisitions', 'requisitions',
      'targets', 'targets-kpis',
      'staff', 'staff-productivity', 'staff-performance',
      'audit', 'audit-trail', 'activity'
    ].includes(report);
  };

  const isStatusFilterApplicable = (report: string) => {
    return [
      'tasks', 'connections', 'connections-pipeline', 'new-connections',
      'follow-ups', 'followups', 'followups-conversion',
      'goods', 'goods-requisitions', 'requisitions',
      'targets', 'targets-kpis',
      'directives-compliance', 'instructions'
    ].includes(report);
  };

  const getStatusOptions = (report: string): { label: string; value: string }[] => {
    switch (report) {
      case 'tasks':
        return [
          { label: 'All Statuses', value: '' },
          { label: 'New', value: 'New' },
          { label: 'Assigned', value: 'Assigned' },
          { label: 'Acknowledged', value: 'Acknowledged' },
          { label: 'In Progress', value: 'In Progress' },
          { label: 'Completed', value: 'Completed' },
          { label: 'Overdue (Auto-calculated)', value: 'Overdue' },
          { label: 'Cancelled', value: 'Cancelled' },
          { label: 'Rejected', value: 'Rejected' },
          { label: 'Closed', value: 'Closed' }
        ];

      case 'connections':
      case 'connections-pipeline':
      case 'new-connections':
        return [
          { label: 'All Statuses', value: '' },
          { label: 'New Request', value: 'New Request' },
          { label: 'Contacted', value: 'Contacted' },
          { label: 'Site Survey Required', value: 'Site Survey Required' },
          { label: 'Site Survey Completed', value: 'Site Survey Completed' },
          { label: 'Documents Pending', value: 'Documents Pending' },
          { label: 'Installation Pending', value: 'Installation Pending' },
          { label: 'Installation Scheduled', value: 'Installation Scheduled' },
          { label: 'Installed', value: 'Installed' },
          { label: 'Activated', value: 'Activated' },
          { label: 'Completed', value: 'Completed' },
          { label: 'Cancelled', value: 'Cancelled' },
          { label: 'Rejected', value: 'Rejected' }
        ];

      case 'follow-ups':
      case 'followups':
      case 'followups-conversion':
        return [
          { label: 'All Statuses', value: '' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Contacted', value: 'Contacted' },
          { label: 'Waiting', value: 'Waiting' },
          { label: 'Completed', value: 'Completed' },
          { label: 'Overdue (Auto-calculated)', value: 'Overdue' },
          { label: 'Failed', value: 'Failed' },
          { label: 'Cancelled', value: 'Cancelled' }
        ];

      case 'goods':
      case 'goods-requisitions':
      case 'requisitions':
        return [
          { label: 'All Statuses', value: '' },
          { label: 'Pending', value: 'PENDING' },
          { label: 'Accepted', value: 'ACCEPTED' },
          { label: 'Partially Accepted', value: 'PARTIALLY ACCEPTED' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Denied', value: 'DENIED' },
          { label: 'Cancelled', value: 'CANCELLED' }
        ];

      case 'targets':
      case 'targets-kpis':
        return [
          { label: 'All Statuses', value: '' },
          { label: 'Not Started', value: 'Not Started' },
          { label: 'In Progress', value: 'In Progress' },
          { label: 'Achieved', value: 'Achieved' },
          { label: 'Partially Achieved', value: 'Partially Achieved' },
          { label: 'Missed', value: 'Missed' }
        ];

      default:
        return [{ label: 'All Statuses', value: '' }];
    }
  };

  const fetchReport = async (reportId = selectedReport) => {
    try {
      setLoading(true);
      const params: any = {};
      const effectiveBId = !isCentralLeadership && user?.branchId ? String(user.branchId) : branchId;
      if (effectiveBId) params.branchId = effectiveBId;
      if (staffId && isStaffFilterApplicable(reportId)) params.staffId = staffId;
      if (status && isStatusFilterApplicable(reportId)) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.reports.get(reportId, params);
      setReportData(res);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to fetch report', err);
      alert(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params: any = {};
      const effectiveBId = !isCentralLeadership && user?.branchId ? String(user.branchId) : branchId;
      if (effectiveBId) params.branchId = effectiveBId;
      if (staffId && isStaffFilterApplicable(selectedReport)) params.staffId = staffId;
      if (status && isStatusFilterApplicable(selectedReport)) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const blob = await api.reports.exportCsv(selectedReport, params);
      const serverFilename = (blob as any).filename;
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = serverFilename || `${selectedReport}_${effectiveBId || 'all_branches'}_${todayStr}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export CSV', err);
      alert(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    if (isCentralLeadership) {
      setBranchId('');
    }
    setStaffId('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setTimeout(() => {
      fetchReport(selectedReport);
    }, 50);
  };

  // Date Presets
  const applyDatePreset = (preset: 'today' | '7days' | 'month' | 'clear') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper to extract items from report data
  const rawItems = useMemo(() => {
    if (!reportData) return [];
    if (Array.isArray(reportData)) return reportData;
    if (Array.isArray(reportData.data)) return reportData.data;
    if (Array.isArray(reportData.records)) return reportData.records;
    if (Array.isArray(reportData.items)) return reportData.items;
    return [];
  }, [reportData]);

  // Client-side quick search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase();
    return rawItems.filter(item => {
      return Object.values(item).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [rawItems, searchQuery]);

  // Headers
  const headers = useMemo(() => {
    if (filteredItems.length === 0) return [];
    return Object.keys(filteredItems[0]).filter(k => k !== 'id' && !k.endsWith('_id'));
  }, [filteredItems]);

  // Paginated records
  const totalCount = filteredItems.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Report info lookup
  const currentExecDef = EXECUTIVE_REPORTS.find(r => r.id === selectedReport);
  const currentOpDef = OPERATIONAL_REPORTS.find(r => r.id === selectedReport);
  const currentTitle = currentOpDef?.name || currentExecDef?.name || selectedReport.toUpperCase();
  const currentDescription = currentOpDef?.description || currentExecDef?.description || 'Audited operational records';

  // Badge styler for status & priority
  const renderCellContent = (header: string, val: any) => {
    if (val === null || val === undefined || val === '') return <span className="text-gray-400">-</span>;
    const str = String(val);

    // Multi-staff chip formatting
    if (header === 'Assigned Staff' || header === 'Primary Staff') {
      if (str === 'Unassigned') return <span className="text-gray-400 italic">Unassigned</span>;
      const staffMembers = str.split(', ');
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {staffMembers.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
            >
              {name}
            </span>
          ))}
        </div>
      );
    }

    // Status Badges
    if (header.includes('Status')) {
      const lower = str.toLowerCase();
      let color = 'bg-gray-100 text-gray-700 border-gray-200';
      if (['completed', 'activated', 'installed', 'achieved', 'accepted'].some(s => lower.includes(s))) {
        color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (['in progress', 'pending', 'waiting', 'partially'].some(s => lower.includes(s))) {
        color = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (['overdue', 'cancelled', 'rejected', 'failed', 'denied', 'missed'].some(s => lower.includes(s))) {
        color = 'bg-rose-50 text-rose-700 border-rose-200';
      } else if (['new', 'assigned', 'contacted', 'acknowledged'].some(s => lower.includes(s))) {
        color = 'bg-blue-50 text-blue-700 border-blue-200';
      }

      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${color}`}>
          {str}
        </span>
      );
    }

    // Priority Badges
    if (header.includes('Priority')) {
      const lower = str.toLowerCase();
      let color = 'bg-gray-100 text-gray-700';
      if (lower.includes('urgent') || lower.includes('critical') || lower.includes('p1') || lower.includes('high')) {
        color = 'bg-rose-100 text-rose-800 font-bold';
      } else if (lower.includes('medium') || lower.includes('p2') || lower.includes('normal')) {
        color = 'bg-amber-100 text-amber-800 font-semibold';
      } else {
        color = 'bg-slate-100 text-slate-700';
      }
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${color}`}>
          {str}
        </span>
      );
    }

    // Days Overdue
    if (header.includes('Overdue') && !isNaN(Number(str))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-xs">
          {str} days
        </span>
      );
    }

    // Percentage
    if (header.includes('%')) {
      return <span className="font-semibold text-gray-900">{str}</span>;
    }

    return <span className="text-gray-700 font-medium">{str}</span>;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header with Title & Top-Level Export / Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            Operational & Executive Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Explore live operational records, audit branch performance, and download verified CSV reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>

          {canExport && (
            <button
              onClick={handleExportCsv}
              disabled={exporting || totalCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Generating CSV...' : 'Export to CSV'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Executive Summaries Toggle Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
            🏆
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Executive & Compliance Report Categories</h3>
            <p className="text-xs text-slate-300">
              High-level management cards for Branch podiums, KPI achievement, staff rank, and overdue audits.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowExecutiveCards(!showExecutiveCards)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition border border-white/10"
        >
          {showExecutiveCards ? (
            <>
              Hide Executive Cards <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              View Executive Cards ({EXECUTIVE_REPORTS.length}) <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 3. Executive Report Cards Grid (Collapsible) */}
      {showExecutiveCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 transition-all">
          {EXECUTIVE_REPORTS.map(r => {
            const isSelected = selectedReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedReport(r.id);
                  fetchReport(r.id);
                }}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100 shadow-2xs">
                      {r.category}
                    </span>
                    <span className="text-lg">{r.icon}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{r.name}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{r.description}</p>
                </div>
                {isSelected && (
                  <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs font-semibold text-indigo-600">
                    <span>Active Report</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Operational Report Explorer Selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900 text-sm">Select Operational Report Type</h2>
          </div>
          <span className="text-xs text-gray-500">
            Click to view and export raw operational records
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {OPERATIONAL_REPORTS.filter(r => !r.permission || (r.permission === 'audit.view' && canViewAudit)).map(r => {
            const isSelected = selectedReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedReport(r.id);
                  fetchReport(r.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.name}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white/90" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Dynamic Report Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Filter Records</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-2 py-1 rounded-lg hover:bg-gray-100 transition"
            >
              Reset Filters
            </button>
            <button
              onClick={() => fetchReport()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Branch Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" /> Branch
              </span>
              {!isCentralLeadership && (
                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </label>
            <select
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              disabled={!isCentralLeadership}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed font-medium"
            >
              {isCentralLeadership && <option value="">ALL BRANCHES</option>}
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Staff Filter (where applicable) */}
          {isStaffFilterApplicable(selectedReport) ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-gray-400" /> Staff Member
              </label>
              <select
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
              >
                <option value="">All Staff</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.fullName || s.name} ({s.branch_name || s.branchName || 'Staff'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 opacity-50">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-gray-300" /> Staff Filter
              </label>
              <input
                disabled
                value="N/A for this report"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          )}

          {/* Status Filter (where applicable) */}
          {isStatusFilterApplicable(selectedReport) ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-gray-400" /> Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
              >
                {getStatusOptions(selectedReport).map((opt, i) => (
                  <option key={i} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 opacity-50">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-gray-300" /> Status Filter
              </label>
              <input
                disabled
                value="N/A for this report"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          )}

          {/* Date Range Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Date Range
              </label>
              <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold">
                <button type="button" onClick={() => applyDatePreset('today')} className="hover:underline">Today</button>
                <span>•</span>
                <button type="button" onClick={() => applyDatePreset('month')} className="hover:underline">Month</button>
                <span>•</span>
                <button type="button" onClick={() => applyDatePreset('clear')} className="hover:underline text-gray-400">Clear</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-1/2 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                title="From Date"
              />
              <span className="text-xs text-gray-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-1/2 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                title="To Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Report Content & Operational Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table Sub-header with Record Count & Quick Search */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-gray-900 text-base">{currentTitle}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                {totalCount} total matching {totalCount === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{currentDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick in-table search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search visible records..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-700"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Loading / Empty / Data Table */}
        {loading ? (
          <div className="p-20 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm font-semibold text-gray-700">Compiling report data...</p>
            <p className="text-xs text-gray-400">Querying verified database records and applying branch filters</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="p-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">No records found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No records match the current filter criteria for this report. Try resetting your filters or expanding the date range.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200/80 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap uppercase tracking-wider text-[10px]">
                    #
                  </th>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap uppercase tracking-wider text-[10px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map((row, rIdx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + rIdx + 1;
                  return (
                    <tr key={rIdx} className="hover:bg-indigo-50/30 transition">
                      <td className="px-4 py-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {absoluteIndex}
                      </td>
                      {headers.map((h, cIdx) => (
                        <td key={cIdx} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {renderCellContent(h, row[h])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-gray-800">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-bold text-gray-800">{totalCount}</span> records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <span className="px-3 py-1 bg-white border border-gray-200 rounded-xl font-bold text-indigo-600 shadow-2xs">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
