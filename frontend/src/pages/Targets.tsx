import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Branch, User } from '../types';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { 
  Target as TargetIcon, Plus, Search, Filter, 
  TrendingUp, CheckCircle, AlertCircle, Edit3, Building2, User as UserIcon,
  ExternalLink, Layers, Sparkles, Phone, MapPin, Calendar, CheckCircle2
} from 'lucide-react';
import { AssignedStaffPills } from '../components/common/MultiStaffSelect';

export const Targets: React.FC = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showContributingModal, setShowContributingModal] = useState(false);
  const [contributingData, setContributingData] = useState<any | null>(null);
  const [loadingContributing, setLoadingContributing] = useState(false);

  // Forms
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_type: 'Branch' as 'Branch' | 'Individual',
    branch_id: '',
    user_id: '',
    metric_name: 'New Connections',
    target_value: 50,
    unit: 'Connections',
    period: 'Monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [updateAchieved, setUpdateAchieved] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [periodFilter, branchFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (periodFilter) params.period = periodFilter;
      if (branchFilter) params.branchId = branchFilter;

      const [targetsRes, branchesRes, staffRes] = await Promise.all([
        api.targets.getAll(params),
        api.branches.getAll(),
        api.staff.getAll({ limit: 100 })
      ]);

      setTargets(targetsRes.targets || []);
      setBranches(branchesRes.branches || []);
      setStaffList(staffRes.staff || []);
    } catch (err) {
      console.error('Failed to load targets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.targets.create({
        targetName: formData.title,
        title: formData.title,
        description: formData.description,
        targetType: formData.target_type,
        category: formData.metric_name,
        branchId: formData.branch_id ? Number(formData.branch_id) : undefined,
        employeeId: formData.user_id ? Number(formData.user_id) : undefined,
        targetValue: Number(formData.target_value),
        unit: formData.unit,
        period: formData.period,
        startDate: formData.start_date,
        endDate: formData.end_date,
      });
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        target_type: 'Branch',
        branch_id: '',
        user_id: '',
        metric_name: 'New Connections',
        target_value: 50,
        unit: 'Connections',
        period: 'Monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create target');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;
    try {
      setSubmitting(true);
      await api.targets.updateProgress(selectedTarget.id, Number(updateAchieved));
      setShowUpdateModal(false);
      setSelectedTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update achievement');
    } finally {
      setSubmitting(false);
    }
  };

  const isNewConn = (cat?: string) => {
    if (!cat) return false;
    const c = cat.toLowerCase();
    return c === 'new connection' || c === 'new connections' || c === 'new_connection' || c.startsWith('new connection');
  };

  const handleOpenContributing = async (target: any) => {
    setSelectedTarget(target);
    setShowContributingModal(true);
    setLoadingContributing(true);
    try {
      const res = await api.targets.getContributingConnections(target.id);
      if (res.success) {
        setContributingData(res);
      }
    } catch (err: any) {
      console.error('Failed to load contributing connections', err);
    } finally {
      setLoadingContributing(false);
    }
  };

  const userRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManage = userRole === 'SUPER_ADMIN' || userRole === 'MANAGEMENT' || userRole === 'BRANCH_MANAGER';

  const filtered = targets.filter(t => {
    const title = (t.title || t.target_name || '').toLowerCase();
    const metric = (t.metric_name || t.category || '').toLowerCase();
    const branch = (t.branch_name || '').toLowerCase();
    const staff = (t.user_name || t.employee_name || '').toLowerCase();
    const q = search.toLowerCase();
    return title.includes(q) || metric.includes(q) || branch.includes(q) || staff.includes(q);
  });

  const avgAchievement = targets.length > 0
    ? Math.round(targets.reduce((acc, t) => acc + (Number(t.achievement_percentage) || 0), 0) / targets.length)
    : 0;

  const completedCount = targets.filter(t => (Number(t.achievement_percentage) || 0) >= 100).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TargetIcon className="w-7 h-7 text-indigo-600" />
            Targets & Key Performance Indicators (KPIs)
          </h1>
          <p className="text-gray-500 text-sm">
            Set, track, and evaluate operational goals for branches and individual personnel.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" /> Set New Target
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Targets" 
          value={targets.length} 
          icon={<TargetIcon className="w-5 h-5" />} 
          variant="default" 
        />
        <StatCard 
          title="Avg Achievement" 
          value={`${avgAchievement}%`} 
          icon={<TrendingUp className="w-5 h-5" />} 
          variant={avgAchievement >= 80 ? 'success' : avgAchievement >= 50 ? 'warning' : 'danger'} 
        />
        <StatCard 
          title="100%+ Achieved" 
          value={completedCount} 
          icon={<CheckCircle className="w-5 h-5" />} 
          variant="success" 
        />
        <StatCard 
          title="Lagging / In Progress" 
          value={targets.length - completedCount} 
          icon={<AlertCircle className="w-5 h-5" />} 
          variant="warning" 
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search targets, branch, metric..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Periods</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Targets Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl text-center text-gray-400 border border-gray-100">
          Loading operational targets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center text-gray-400 border border-gray-100">
          No targets found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => {
            const achievementPct = Number(t.achievement_percentage) || 0;
            const pct = Math.min(Math.round(achievementPct), 100);
            const isExceeded = achievementPct >= 100;
            const targetTitle = t.title || t.target_name || 'Operational Goal';
            const targetMetric = t.metric_name || t.category || 'Metric';
            const isBranch = t.target_type === 'Branch' || !t.employee_id;
            const isNC = isNewConn(targetMetric);
            const remaining = Math.max(0, (Number(t.target_value) || 0) - (Number(t.achieved_value) || 0));

            return (
              <div 
                key={t.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {t.period || 'Monthly'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isExceeded 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : pct >= 60 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {Math.round(achievementPct)}% Achieved
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    {targetTitle}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                    {t.description || `${targetMetric} operational target`}
                  </p>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs text-gray-500 font-medium">{targetMetric}</span>
                      {isNC ? (
                        <button
                          type="button"
                          onClick={() => handleOpenContributing(t)}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer transition"
                          title="Click to view contributing completed connections"
                        >
                          <span>{t.achieved_value || 0} / {t.target_value || 0}</span>
                          <span className="text-xs font-normal text-gray-500">{t.unit || 'Units'}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                        </button>
                      ) : (
                        <span className="text-sm font-bold text-gray-900">
                          {t.achieved_value || 0} / {t.target_value || 0} <span className="text-xs font-normal text-gray-500">{t.unit || 'Units'}</span>
                        </span>
                      )}
                    </div>
                    <ProgressBar 
                      value={pct} 
                      color={isExceeded ? 'green' : pct >= 60 ? 'blue' : 'yellow'} 
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-1.5 border-t border-gray-200/60">
                      <span>Remaining: <strong className="text-gray-800 font-bold">{remaining}</strong></span>
                      <span>Progress: <strong className="text-gray-800 font-bold">{achievementPct}%</strong></span>
                    </div>
                    {isNC && (
                      <div className="mt-2 text-[10px] text-indigo-700 bg-indigo-50/90 border border-indigo-100/90 rounded-md px-2 py-1 flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Auto-calculated from completed New Connections</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      {isBranch ? (
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>
                        {isBranch
                          ? (t.branch_name || 'All Branches')
                          : `${t.employee_name || t.user_name || 'Staff Member'} (${t.branch_name || 'HQ'})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-50">
                      <span>Window: {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'N/A'}</span>
                      <span>To: {t.end_date ? new Date(t.end_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    {isNC ? (
                      <button
                        onClick={() => handleOpenContributing(t)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Layers className="w-3.5 h-3.5" /> View Completed ({t.achieved_value || 0})
                      </button>
                    ) : (
                      <div />
                    )}
                    <button
                      onClick={() => {
                        setSelectedTarget(t);
                        setUpdateAchieved(Number(t.achieved_value) || 0);
                        setShowUpdateModal(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> {isNC ? 'Target Info' : 'Update Progress'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Set Target Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Set Operational Target / KPI"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 New FTTH Subscriptions"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Scope</label>
              <select
                value={formData.target_type}
                onChange={e => setFormData({ ...formData, target_type: e.target.value as any })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Branch">Branch Level</option>
                <option value="Individual">Individual Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Period</label>
              <select
                value={formData.period}
                onChange={e => setFormData({ ...formData, period: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>

          {formData.target_type === 'Branch' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Branch</label>
              <select
                value={formData.branch_id}
                onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Branch...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Staff Member</label>
              <select
                value={formData.user_id}
                onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Staff...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName || s.name} ({s.branchName || s.branch_name || 'HQ'})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Metric Category</label>
              <input
                type="text"
                value={formData.metric_name}
                onChange={e => setFormData({ ...formData, metric_name: e.target.value })}
                placeholder="Connections, Sales, etc."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Goal *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.target_value}
                onChange={e => setFormData({ ...formData, target_value: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Units, NPR, etc."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              {submitting ? 'Saving...' : 'Set Target'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Progress Modal */}
      {selectedTarget && (
        <Modal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          title={`${isNewConn(selectedTarget.metric_name || selectedTarget.category) ? 'Target Details' : 'Update Progress'}: ${selectedTarget.title || selectedTarget.target_name}`}
        >
          {isNewConn(selectedTarget.metric_name || selectedTarget.category) ? (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
                <div className="flex items-center gap-2 font-bold text-sm text-indigo-900 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Auto-Calculated Target
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  This target is synchronized directly with the <strong>New Connection</strong> module.
                  Completed connection records are the verified single source of truth. Manual entry is disabled to preserve audit integrity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-500 block">Target Goal:</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedTarget.target_value} {selectedTarget.unit || 'Connections'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Completed Connections:</span>
                  <span className="font-bold text-emerald-600 text-sm">{selectedTarget.achieved_value || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Remaining Goal:</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {Math.max(0, Number(selectedTarget.target_value) - Number(selectedTarget.achieved_value || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Achievement Rate:</span>
                  <span className="font-bold text-indigo-600 text-sm">{selectedTarget.achievement_percentage || 0}%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-gray-600">
                <p><span className="text-gray-400">Branch:</span> <strong className="text-gray-800">{selectedTarget.branch_name || 'All Branches'}</strong></p>
                <p><span className="text-gray-400">Period Window:</span> {selectedTarget.start_date ? new Date(selectedTarget.start_date).toLocaleDateString() : 'N/A'} to {selectedTarget.end_date ? new Date(selectedTarget.end_date).toLocaleDateString() : 'N/A'}</p>
                <p><span className="text-gray-400">Status:</span> <span className="font-semibold text-gray-800">{selectedTarget.status}</span></p>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    handleOpenContributing(selectedTarget);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Layers className="w-4 h-4" /> View {selectedTarget.achieved_value || 0} Contributing Connections
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateAchievement} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                <p><span className="text-gray-500">Metric:</span> <span className="font-semibold">{selectedTarget.metric_name || selectedTarget.category}</span></p>
                <p><span className="text-gray-500">Goal:</span> <span className="font-semibold">{selectedTarget.target_value} {selectedTarget.unit || 'Units'}</span></p>
                <p><span className="text-gray-500">Current Achieved:</span> <span className="font-semibold">{selectedTarget.achieved_value || 0} {selectedTarget.unit || 'Units'}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Total Achieved Value ({selectedTarget.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={updateAchieved}
                  onChange={e => setUpdateAchieved(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-lg font-bold"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Calculated completion: {Math.round((updateAchieved / (Number(selectedTarget.target_value) || 1)) * 100)}%
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Progress'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Contributing Connections Drill-Down Modal */}
      <Modal
        isOpen={showContributingModal}
        onClose={() => {
          setShowContributingModal(false);
          setContributingData(null);
        }}
        title={`Contributing Connections: ${selectedTarget?.title || selectedTarget?.target_name || ''}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Summary bar */}
          {selectedTarget && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px]">Branch</span>
                <span className="font-bold text-gray-900">{selectedTarget.branch_name || 'All Branches'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Period</span>
                <span className="font-bold text-gray-900">{selectedTarget.period || 'Monthly'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Target vs Completed</span>
                <span className="font-bold text-indigo-600">
                  {selectedTarget.achieved_value || 0} / {selectedTarget.target_value || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Achievement</span>
                <span className="font-bold text-emerald-600">{selectedTarget.achievement_percentage || 0}%</span>
              </div>
            </div>
          )}

          {loadingContributing ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Loading contributing connections...
            </div>
          ) : contributingData?.connections?.length > 0 ? (
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5">Connection ID</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Package</th>
                    <th className="px-3 py-2.5">Completion Date</th>
                    <th className="px-3 py-2.5">Assigned Staff</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contributingData.connections.map((c: any) => (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition">
                      <td className="px-3 py-2.5 font-mono font-bold text-indigo-600">{c.connection_id}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{c.customer_name}</td>
                      <td className="px-3 py-2.5 text-gray-500">{c.phone}</td>
                      <td className="px-3 py-2.5 text-gray-600">{c.package_plan}</td>
                      <td className="px-3 py-2.5 text-gray-700 font-semibold">
                        {c.completion_date ? new Date(c.completion_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">
                        <AssignedStaffPills staff={c.assigned_staff} fallbackName={c.assigned_staff_name} />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No completed New Connections found for this branch in the selected target period.
            </div>
          )}

          <div className="flex justify-end pt-3 border-t">
            <button
              type="button"
              onClick={() => {
                setShowContributingModal(false);
                setContributingData(null);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
