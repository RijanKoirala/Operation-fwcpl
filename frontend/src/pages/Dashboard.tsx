import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CheckSquare,
  AlertCircle,
  Plug,
  Clock,
  FileText,
  Activity,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { TaskPodium } from '../components/podium/TaskPodium';
import { BranchPodium } from '../components/podium/BranchPodium';
import { StaffLeaderboard } from '../components/leaderboard/StaffLeaderboard';
import { BranchLeaderboard } from '../components/leaderboard/BranchLeaderboard';
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
} from 'recharts';

interface DashboardProps {
  onNavigate?: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskPeriod, setTaskPeriod] = useState('month');
  const [leaderboardTab, setLeaderboardTab] = useState<'branch' | 'staff'>('branch');

  const fetchDashboard = async (period: string = taskPeriod) => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/main');
      if (res.success) {
        setData(res);
      }
      // If period changed, fetch task podium specifically
      if (period !== 'month') {
        const pRes = await api.get(`/performance/podium/task-completers?period=${period}`);
        if (pRes.success) {
          setData((prev: any) => ({
            ...prev,
            podiums: {
              ...prev.podiums,
              taskCompleters: pRes.podium,
            },
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(taskPeriod);
  }, [taskPeriod]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Loading operational analytics...</p>
        </div>
      </div>
    );
  }

  const {
    summary = {},
    goodsRequests = {},
    podiums = {},
    leaderboards = {},
    recentInstructions = [],
    recentActivity = [],
    taskCategories = [],
    connectionStatusCategories = [],
    connectionMetrics = {},
  } = data || {};

  const COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Executive Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Cross-branch operational performance, task completion SLAs, and customer connection pipelines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboard(taskPeriod)}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Refresh Data
          </button>
          <button
            onClick={() => onNavigate?.('reports')}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>View All Reports</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Branches"
          value={summary?.totalBranches || 0}
          subtitle="20+ Target Network"
          icon={<Building2 className="w-6 h-6" />}
          variant="blue"
          onClick={() => onNavigate?.('branches')}
        />
        <StatCard
          title="Active Staff"
          value={summary?.totalStaff || 0}
          subtitle="Across all departments"
          icon={<Users className="w-6 h-6" />}
          variant="purple"
          onClick={() => onNavigate?.('staff')}
        />
        <StatCard
          title="Active Tasks"
          value={summary?.activeTasks || 0}
          subtitle={`${summary?.completedTasks || 0} completed`}
          icon={<CheckSquare className="w-6 h-6" />}
          variant="emerald"
          onClick={() => onNavigate?.('tasks')}
        />
        <StatCard
          title="Overdue Tasks"
          value={summary?.overdueTasks || 0}
          subtitle="Requires immediate attention"
          icon={<AlertCircle className="w-6 h-6" />}
          variant="rose"
          onClick={() => onNavigate?.('tasks')}
        />
      </div>

      {/* Secondary Operational Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate?.('connections')}
          className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total New Connections Today</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-3xl font-black text-slate-900">{summary?.totalNewConnectionsToday ?? 0}</h4>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Today</span>
            </div>
            <p className="text-xs text-indigo-600 font-semibold mt-1">
              Combined across all branches • {summary?.activeConnections || 0} active in pipeline
            </p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Plug className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => onNavigate?.('followups')}
          className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Follow-ups</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-3xl font-black text-slate-900">{summary?.pendingFollowUps || 0}</h4>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Due</span>
            </div>
            <p className="text-xs text-amber-600 font-semibold mt-1">Customer & payment retention</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Goods Requisitions & Fulfillment Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Branch Goods Requisitions & Supply Chain</h3>
              <p className="text-xs text-slate-500">Track fiber, routers, drop wire requests, approvals, and dispatch fulfillment</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('request-goods')}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Manage Goods Requests</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4">
          <div
            onClick={() => onNavigate?.('request-goods')}
            className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 hover:border-amber-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Review</span>
              {goodsRequests?.urgent > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-100 text-rose-700 animate-pulse">
                  {goodsRequests.urgent} Urgent
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-amber-950">{goodsRequests?.pending || 0}</div>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5 group-hover:underline">Awaiting Operation decision</p>
          </div>

          <div
            onClick={() => onNavigate?.('request-goods')}
            className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 hover:border-indigo-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">In Fulfillment</span>
              {goodsRequests?.partiallyAccepted > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                  {goodsRequests.partiallyAccepted} Partial
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-indigo-950">{goodsRequests?.awaitingFulfillment || 0}</div>
            <p className="text-[11px] text-indigo-700 font-medium mt-0.5 group-hover:underline">Ready for dispatch</p>
          </div>

          <div
            onClick={() => onNavigate?.('request-goods')}
            className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Completed</span>
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950">{goodsRequests?.completed || 0}</div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5 group-hover:underline">Dispatched to branches</p>
          </div>

          <div
            onClick={() => onNavigate?.('request-goods')}
            className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 hover:border-rose-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Denied</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-950">{goodsRequests?.denied || 0}</div>
            <p className="text-[11px] text-rose-700 font-medium mt-0.5 group-hover:underline">With rejection notes</p>
          </div>
        </div>
      </div>

      {/* 2 & 3. 3D Podiums Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {podiums?.taskCompleters && (
          <TaskPodium
            podium={podiums.taskCompleters}
            currentPeriod={taskPeriod}
            onPeriodChange={p => setTaskPeriod(p)}
          />
        )}
        {podiums?.branches && <BranchPodium podium={podiums.branches} onNavigate={onNavigate} />}
      </div>

      {/* 4. Leaderboard Section with Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Performance Leaderboards</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time database performance ranking based on configured weights</p>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setLeaderboardTab('branch')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                leaderboardTab === 'branch'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Branch Leaderboard
            </button>
            <button
              onClick={() => setLeaderboardTab('staff')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                leaderboardTab === 'staff'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Staff Leaderboard
            </button>
          </div>
        </div>

        {leaderboardTab === 'branch' ? (
          <BranchLeaderboard branches={leaderboards?.branches || []} onNavigate={onNavigate} />
        ) : (
          <StaffLeaderboard staff={leaderboards?.staff || []} />
        )}
      </div>

      {/* 5. Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Category Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h4 className="text-base font-bold text-slate-900 mb-1">Task Operations Breakdown</h4>
          <p className="text-xs text-slate-500 mb-4">Volume of tasks grouped by operational discipline</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskCategories || []}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={45} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Connections Pipeline Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h4 className="text-base font-bold text-slate-900 mb-1">New Connections Pipeline Breakdown</h4>
          <p className="text-xs text-slate-500 mb-4">Distribution of customer connection stages across all branches</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={connectionStatusCategories || []}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={45} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. Recent Directives & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Management Instructions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              <h4 className="text-base font-bold text-slate-900">Recent Management Instructions</h4>
            </div>
            <button
              onClick={() => onNavigate?.('instructions')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              View all →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInstructions?.map((i: any) => (
              <div key={i.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{i.title}</h5>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{i.description}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      To: <b className="text-slate-700">{i.branch_name}</b> • Sent by: {i.sender_name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      i.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : i.status === 'Acknowledged'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {i.status}
                  </span>
                </div>
              </div>
            ))}
            {(!recentInstructions || recentInstructions.length === 0) && (
              <p className="text-xs text-slate-400 py-6 text-center">No instructions dispatched yet.</p>
            )}
          </div>
        </div>

        {/* Live Operational Audit Feed */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h4 className="text-base font-bold text-slate-900">Live Operational Audit Trail</h4>
            </div>
            <button
              onClick={() => onNavigate?.('audit')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              View full audit →
            </button>
          </div>

          <div className="space-y-3">
            {recentActivity?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-800 font-semibold">
                    <span className="font-bold text-slate-900">{a.user_name || 'System'}:</span> {a.action.replace(/_/g, ' ')}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Module: {a.module} • {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-xs text-slate-400 py-6 text-center">No audit activity logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
