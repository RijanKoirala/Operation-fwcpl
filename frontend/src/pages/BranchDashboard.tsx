import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CheckSquare,
  AlertCircle,
  Plug,
  Clock,
  Target,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Activity,
  PackageCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

interface BranchDashboardProps {
  branchId?: number;
  onNavigate?: (path: string) => void;
}

export const BranchDashboard: React.FC<BranchDashboardProps> = ({ branchId: propBranchId, onNavigate }) => {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    propBranchId || user?.branchId || 1
  );
  const [branches, setBranches] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'tasks' | 'connections' | 'targets' | 'performance'>('overview');

  // React if propBranchId changes
  useEffect(() => {
    if (propBranchId) {
      setSelectedBranchId(propBranchId);
    }
  }, [propBranchId]);

  // Load branch list for picker if Admin/Management
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get('/branches?limit=50');
        if (res.success) {
          setBranches(res.branches || []);
          if (!propBranchId && !user?.branchId && res.branches.length > 0) {
            setSelectedBranchId(res.branches[0].id);
          }
        }
      } catch {}
    };
    loadBranches();
  }, [propBranchId, user]);

  const loadBranchDashboard = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/branches/${id}/dashboard`);
      if (res.success) {
        setDashboardData(res);
      } else {
        setError(res.message || 'Failed to load branch data');
      }
    } catch (err: any) {
      console.error('Failed to load branch dashboard', err);
      setError(err.message || 'Failed to load branch dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      loadBranchDashboard(selectedBranchId);
    }
  }, [selectedBranchId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading branch operational data...</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto my-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Unable to Load Branch Dashboard</h3>
        <p className="text-xs text-slate-500 mb-5">{error || 'Could not retrieve operational data for this branch.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => loadBranchDashboard(selectedBranchId)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Retry Loading
          </button>
          <button
            onClick={() => onNavigate?.('branches')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Back to Branches
          </button>
        </div>
      </div>
    );
  }

  const {
    branch = {},
    summary = {},
    goodsRequests = {},
    staff = [],
    tasks = [],
    connections = [],
    targets = [],
    performance = {},
    staffRankings = [],
  } = dashboardData || {};

  const userRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canSwitchBranch = userRole === 'SUPER_ADMIN' || userRole === 'MANAGEMENT';

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Branch Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <button
              onClick={() => onNavigate?.('branches')}
              className="mt-1 p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
              title="Return to all branches"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {branch.code || 'BR-00'}
                </span>
                <StatusBadge status={branch.status || 'Active'} />
                <span className="text-xs text-slate-400 font-medium">
                  Opened: {branch.opening_date ? String(branch.opening_date).split('T')[0] : 'N/A'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {branch.name}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {branch.address}, {branch.city}, {branch.province}
                </span>
                {branch.contact_number && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {branch.contact_number}
                  </span>
                )}
                {branch.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {branch.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action: Branch Switcher & Quick Return */}
          <div className="flex flex-wrap items-center gap-3 lg:self-start">
            {canSwitchBranch && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Branch:</span>
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(Number(e.target.value))}
                  className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => onNavigate?.('branches')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              All Branches
            </button>
          </div>
        </div>

        {/* Front Desk Banner */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Front Desk:</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              {branch.manager_name || 'Unassigned'}
            </span>
            {branch.manager_phone && (
              <span className="text-slate-500 font-medium ml-1">
                📞 {branch.manager_phone}
              </span>
            )}
            {branch.manager_email && (
              <span className="text-slate-500 font-medium ml-1">
                ✉️ {branch.manager_email}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Branch Health Score:</span>
            <span className="font-black text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {summary?.overallPerformanceScore || 80}/100 Excellent
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Active Staff"
          value={`${summary?.activeStaff || 0}/${summary?.totalStaff || 0}`}
          subtitle="Branch crew"
          icon={<Users className="w-5 h-5" />}
          variant="purple"
          onClick={() => setActiveTab('staff')}
        />
        <StatCard
          title="Open Tasks"
          value={summary?.openTasks || 0}
          subtitle={`${summary?.overdueTasks || 0} overdue`}
          icon={<CheckSquare className="w-5 h-5" />}
          variant={summary?.overdueTasks > 0 ? 'rose' : 'blue'}
          onClick={() => setActiveTab('tasks')}
        />
        <StatCard
          title="New Connections"
          value={summary?.todayNewConnections ?? 0}
          subtitle={`${summary?.activeConnections || connections?.length || 0} in pipeline`}
          icon={<Plug className="w-5 h-5" />}
          variant="emerald"
          onClick={() => setActiveTab('connections')}
        />
        <StatCard
          title="Target Achieved"
          value={`${summary?.targetAchievement || 0}%`}
          subtitle="Branch targets"
          icon={<Target className="w-5 h-5" />}
          variant="indigo"
          onClick={() => setActiveTab('targets')}
        />
        <StatCard
          title="Overall Score"
          value={`${summary?.overallPerformanceScore || 80}`}
          subtitle="Out of 100"
          icon={<Award className="w-5 h-5" />}
          variant="emerald"
          onClick={() => setActiveTab('performance')}
        />
      </div>

      {/* Branch Goods Requisitions Quick Access */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Branch Goods & Equipment Requisitions</h3>
            <p className="text-xs text-slate-500">Fiber, router, and drop wire requisition status for this branch</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            onClick={() => onNavigate?.('request-goods')}
            className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 cursor-pointer hover:bg-amber-100 transition flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Pending: <strong>{goodsRequests?.myPending || 0}</strong></span>
          </div>

          <div
            onClick={() => onNavigate?.('request-goods')}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900 cursor-pointer hover:bg-indigo-100 transition flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Approved: <strong>{(goodsRequests?.accepted || 0) + (goodsRequests?.partiallyAccepted || 0)}</strong></span>
          </div>

          <div
            onClick={() => onNavigate?.('request-goods')}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 cursor-pointer hover:bg-emerald-100 transition flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Delivered: <strong>{goodsRequests?.completed || 0}</strong></span>
          </div>

          <button
            onClick={() => onNavigate?.('request-goods')}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ml-auto md:ml-2"
          >
            <span>+ Request Goods</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview & Facilities' },
            { key: 'staff', label: `Staff (${staff?.length || 0})` },
            { key: 'tasks', label: `Tasks (${tasks?.length || 0})` },
            { key: 'connections', label: `New Connections (${connections?.length || 0})` },
            { key: 'targets', label: `Targets & KPI (${targets?.length || 0})` },
            { key: 'performance', label: 'Staff Rankings' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB 1: OVERVIEW & FACILITIES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branch Info Panel */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Branch Facility Profile
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Branch Code</span>
                      <span className="font-bold text-slate-800">{branch.code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Branch Name</span>
                      <span className="font-bold text-slate-800">{branch.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Operating City</span>
                      <span className="font-bold text-slate-800">{branch.city}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Province</span>
                      <span className="font-bold text-slate-800">{branch.province}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-medium">Street Address</span>
                      <span className="font-bold text-slate-800">{branch.address}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Contact Phone</span>
                      <span className="font-bold text-slate-800">{branch.contact_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Contact Email</span>
                      <span className="font-bold text-slate-800 truncate block">{branch.email || 'N/A'}</span>
                    </div>
                  </div>

                  {branch.description && (
                    <div className="pt-3 border-t border-slate-200/60 text-xs">
                      <span className="text-slate-400 block font-medium mb-1">Operational Notes</span>
                      <p className="text-slate-600 italic">{branch.description}</p>
                    </div>
                  )}
                </div>

                {/* Operations & Scoring Breakdown */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Performance Metrics Breakdown
                  </h3>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Task Completion Rate</span>
                        <span className="font-bold text-indigo-600">{performance.taskCompletionRate || 75}%</span>
                      </div>
                      <ProgressBar percentage={performance.taskCompletionRate || 75} />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>On-Time SLA Delivery</span>
                        <span className="font-bold text-emerald-600">{performance.onTimeRate || 85}%</span>
                      </div>
                      <ProgressBar percentage={performance.onTimeRate || 85} />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Target & KPI Achievement</span>
                        <span className="font-bold text-purple-600">{performance.targetAchievementRate || summary?.targetAchievement || 80}%</span>
                      </div>
                      <ProgressBar percentage={performance.targetAchievementRate || summary?.targetAchievement || 80} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Composite Branch Score:</span>
                    <span className="text-base font-black text-indigo-600">
                      {summary?.overallPerformanceScore || performance.overallScore || 80} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Branch Operations Quick Access</h4>
                    <p className="text-[11px] text-slate-500">Jump directly to specific operational modules</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate?.('tasks')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    View All Tasks
                  </button>
                  <button
                    onClick={() => onNavigate?.('connections')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    New Connections
                  </button>
                  <button
                    onClick={() => onNavigate?.('request-goods')}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    📦 Request Goods
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF LIST */}
          {activeTab === 'staff' && (
            <div className="overflow-x-auto">
              {staff.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No staff members currently assigned to this branch.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((s: any) => (
                      <tr
                        key={s.id}
                        onClick={() => onNavigate?.(`/staff/${s.id}`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-indigo-600">{s.employee_id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.full_name}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">{s.designation_name || 'Staff'}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{s.department_name || 'Operations'}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{s.phone || s.email}</td>
                        <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: TASKS */}
          {activeTab === 'tasks' && (
            <div className="overflow-x-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No tasks currently recorded for this branch.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Task ID</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Assigned To</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((t: any) => {
                      const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-indigo-600">{t.task_id || `TSK-${t.id}`}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{t.title}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{t.assigned_to_name || 'Unassigned'}</td>
                          <td className="py-3 px-4"><PriorityBadge priority={t.priority} /></td>
                          <td className={`py-3 px-4 text-xs font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                            {t.due_date ? String(t.due_date).split('T')[0] : 'N/A'}
                            {isOverdue && ' (Overdue)'}
                          </td>
                          <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: NEW CONNECTIONS */}
          {activeTab === 'connections' && (
            <div className="overflow-x-auto">
              {connections.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No new customer connections recorded for this branch.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Installation Address</th>
                      <th className="py-3 px-4">Plan / Package</th>
                      <th className="py-3 px-4">Assigned Tech</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {connections.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.customer_name || c.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{c.contact_number || c.phone || 'N/A'}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{c.installation_address || c.address}</td>
                        <td className="py-3 px-4 text-xs font-bold text-indigo-700">{c.package_name || c.package || 'Standard Fiber'}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{c.assigned_to_name || 'Unassigned'}</td>
                        <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 5: TARGETS & KPI */}
          {activeTab === 'targets' && (
            <div>
              {targets.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No targets or KPIs currently assigned to this branch.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {targets.map((tg: any) => {
                    const pct = Number(tg.achievement_percentage) || 0;
                    return (
                      <div key={tg.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{tg.target_name || tg.title}</h4>
                            <span className="text-xs text-slate-400 font-medium">
                              {tg.category || tg.metric_name} • {tg.period}
                            </span>
                          </div>
                          <StatusBadge status={tg.status || (pct >= 100 ? 'Achieved' : 'In Progress')} />
                        </div>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                          {tg.description || 'Branch performance target'}
                        </p>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                          <span>Achieved: {tg.achieved_value || 0} {tg.unit || ''}</span>
                          <span>Target: {tg.target_value || 0} {tg.unit || ''}</span>
                        </div>
                        <ProgressBar percentage={pct} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: STAFF PERFORMANCE RANKINGS */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">
                Staff Performance Leaderboard ({branch.name})
              </h4>
              {staffRankings.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No staff rankings available for this branch.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4 text-center">Tasks Done</th>
                        <th className="py-3 px-4 text-center">On-Time %</th>
                        <th className="py-3 px-4 text-center">Target %</th>
                        <th className="py-3 px-4 text-right">Composite Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffRankings.map((s: any, idx: number) => (
                        <tr key={s.staffId || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-indigo-600">
                            {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{s.fullName}</td>
                          <td className="py-3 px-4 text-xs text-slate-500">{s.designation}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">{s.completedTasks}</td>
                          <td className="py-3 px-4 text-center font-semibold text-emerald-600">{s.onTimeRate}%</td>
                          <td className="py-3 px-4 text-center font-semibold text-indigo-600">{s.targetAchievementRate}%</td>
                          <td className="py-3 px-4 text-right font-black text-indigo-700 text-base">{s.overallScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
