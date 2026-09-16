import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Target,
  Award,
  AlertCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';

interface StaffDashboardProps {
  onNavigate?: (path: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffDashboard = async () => {
      try {
        const res = await api.get('/dashboard/staff');
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaffDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    tasksOverview = {},
    targets = [],
    performance = {},
    ranking = {},
    recentTasks = [],
    instructions = [],
  } = data || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Staff Operations Portal</span>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">Welcome, {user?.fullName}!</h1>
          <p className="text-xs text-slate-500">
            {user?.designationName} • {user?.branchName} • Employee ID: <b className="text-slate-800">{user?.employeeId}</b>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Company Rank</span>
            <span className="text-xl font-black text-brand-700">#{ranking?.companyRank || 1}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Branch Rank</span>
            <span className="text-xl font-black text-emerald-600">#{ranking?.branchRank || 1}</span>
          </div>
        </div>
      </div>

      {/* Task Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="New Tasks" value={tasksOverview?.new || 0} icon={<CheckSquare className="w-5 h-5" />} variant="blue" />
        <StatCard title="In Progress" value={tasksOverview?.inProgress || 0} icon={<Clock className="w-5 h-5" />} variant="purple" />
        <StatCard title="Completed" value={tasksOverview?.completed || 0} icon={<Award className="w-5 h-5" />} variant="emerald" />
        <StatCard title="Overdue" value={tasksOverview?.overdue || 0} icon={<AlertCircle className="w-5 h-5" />} variant="rose" />
        <StatCard title="My Score" value={performance?.overallScore || 85} icon={<Target className="w-5 h-5" />} variant="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Performance Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">My Performance Metrics</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Task Completion Rate:</span>
                <b>{performance?.taskCompletionRate || 0}%</b>
              </div>
              <ProgressBar percentage={performance?.taskCompletionRate || 0} showPercentage={false} />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>On-Time Completion (SLA):</span>
                <b>{performance?.onTimeRate || 0}%</b>
              </div>
              <ProgressBar percentage={performance?.onTimeRate || 0} showPercentage={false} />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Target Achievement:</span>
                <b>{performance?.targetAchievementRate || 0}%</b>
              </div>
              <ProgressBar percentage={performance?.targetAchievementRate || 0} showPercentage={false} />
            </div>
          </div>
        </div>

        {/* My Targets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 mb-3">My Assigned Targets</h3>
          <div className="space-y-3">
            {targets?.map((tg: any) => (
              <div key={tg.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{tg.target_name}</span>
                  <StatusBadge status={tg.status} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress: {tg.achieved_value} / {tg.target_value}</span>
                  <span className="font-bold text-slate-800">{tg.achievement_percentage}%</span>
                </div>
                <ProgressBar percentage={Number(tg.achievement_percentage)} showPercentage={false} size="sm" />
              </div>
            ))}
            {(!targets || targets.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No specific targets assigned yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Queue */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900">My Priority Tasks</h3>
          <button onClick={() => onNavigate('/tasks')} className="text-xs font-bold text-brand-600 hover:underline">
            View all tasks →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentTasks?.map((t: any) => (
            <div key={t.id} className="py-3 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-slate-900">{t.title}</h5>
                <p className="text-xs text-slate-500 mt-0.5">{t.task_id} • Due: {t.due_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))}
          {(!recentTasks || recentTasks.length === 0) && (
            <p className="text-xs text-slate-400 text-center py-6">No active tasks assigned to you right now.</p>
          )}
        </div>
      </div>
    </div>
  );
};
