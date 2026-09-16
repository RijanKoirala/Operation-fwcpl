import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Search,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Activity,
  Wrench,
  Wifi,
  WifiOff,
  Server,
  Zap,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NocIncident, NocPriority, NocStatus, Branch, User } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';

export const NocIssues: React.FC = () => {
  const { user } = useAuth();

  // Incidents state
  const [incidents, setIncidents] = useState<NocIncident[]>([]);
  const [stats, setStats] = useState<any>({
    activeCount: 0,
    p1CriticalCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    p2HighCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Auxiliary data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    issue_type: 'Net issue in all area',
    branch_id: user?.branchId ? String(user.branchId) : '',
    complain_by_name: user?.fullName || user?.full_name || '',
    suggestions: '',
    affected_services: 'Broadband Internet, Leased Lines, IPTV',
    affected_customers_count: '',
    description: '',
    impact_details: '',
  });

  // Details Modal
  const [selectedIncident, setSelectedIncident] = useState<NocIncident | null>(null);
  const [incidentUpdates, setIncidentUpdates] = useState<any[]>([]);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  // Quick Action / Status Transition Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<NocStatus>('Acknowledged');
  const [assignedEngineerId, setAssignedEngineerId] = useState<string>('');
  const [statusRemark, setStatusRemark] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const issueTypes = [
    'Net issue in all area',
    'Issue in particular area or costumer',
    'Latency Issue',
    'Video call issue',
    'IPTV issue',
    'Others',
  ];

  const fetchIncidents = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;
      if (issueTypeFilter) params.issueType = issueTypeFilter;
      if (branchFilter) params.branchId = branchFilter;

      const res = await api.noc.getAll(params);
      if (res.success) {
        setIncidents(res.incidents || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (error) {
      console.error('Failed to load NOC incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [branchesRes, staffRes] = await Promise.all([
        api.branches.getAll(),
        api.get('/staff'),
      ]);
      if (branchesRes.success) setBranches(branchesRes.branches || []);
      if (staffRes.success) setStaffList(staffRes.staff || []);
    } catch (e) {
      console.error('Failed to fetch branches/staff for NOC:', e);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [search, priorityFilter, statusFilter, issueTypeFilter, branchFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  // Open incident detail drawer/modal
  const handleOpenDetails = async (incident: NocIncident) => {
    setSelectedIncident(incident);
    try {
      const res = await api.noc.getById(incident.id);
      if (res.success) {
        setSelectedIncident(res.incident);
        setIncidentUpdates(res.updates || []);
      }
    } catch (err) {
      console.error('Failed to fetch incident details:', err);
    }
  };

  // Post update to timeline
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newUpdateText.trim()) return;

    setPostingUpdate(true);
    try {
      const res = await api.noc.addUpdate(selectedIncident.id, {
        update_text: newUpdateText.trim(),
      });
      if (res.success && res.update) {
        setIncidentUpdates(prev => [...prev, res.update]);
        setNewUpdateText('');
        fetchIncidents(); // refresh list updates count
      }
    } catch (err) {
      console.error('Failed to post NOC update:', err);
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateForm(prev => ({
      ...prev,
      complain_by_name: prev.complain_by_name || user?.fullName || user?.full_name || '',
      branch_id: prev.branch_id || (user?.branchId ? String(user.branchId) : ''),
    }));
    setShowCreateModal(true);
  };

  // Handle raise new incident form submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) {
      alert('Please fill out the incident title and description.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: createForm.title.trim(),
        issue_type: createForm.issue_type,
        branch_id: createForm.branch_id ? parseInt(createForm.branch_id, 10) : null,
        complain_by_name: createForm.complain_by_name.trim() || null,
        suggestions: createForm.suggestions.trim() || null,
        affected_services: createForm.affected_services.trim() || null,
        affected_customers_count: createForm.affected_customers_count ? parseInt(createForm.affected_customers_count, 10) : 0,
        priority: 'P2',
        description: createForm.description.trim(),
        impact_details: createForm.impact_details.trim() || null,
      };

      const res = await api.noc.create(payload);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          issue_type: 'Net issue in all area',
          branch_id: user?.branchId ? String(user.branchId) : '',
          complain_by_name: user?.fullName || user?.full_name || '',
          suggestions: '',
          affected_services: 'Broadband Internet, Leased Lines, IPTV',
          affected_customers_count: '',
          description: '',
          impact_details: '',
        });
        fetchIncidents();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to raise NOC incident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open status modal for transition
  const handleOpenStatusModal = (status: NocStatus) => {
    if (!selectedIncident) return;
    setTargetStatus(status);
    setAssignedEngineerId(selectedIncident.assigned_noc_engineer_id ? String(selectedIncident.assigned_noc_engineer_id) : '');
    setStatusRemark('');
    setResolutionNotes(selectedIncident.resolution_notes || '');
    setRootCauseAnalysis(selectedIncident.root_cause_analysis || '');
    setShowStatusModal(true);
  };

  // Submit status update
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setUpdatingStatus(true);
    try {
      const payload: any = {
        status: targetStatus,
        assigned_noc_engineer_id: assignedEngineerId ? parseInt(assignedEngineerId, 10) : null,
        update_remarks: statusRemark.trim() || undefined,
        resolution_notes: resolutionNotes.trim() || undefined,
        root_cause_analysis: rootCauseAnalysis.trim() || undefined,
      };

      const res = await api.noc.updateStatus(selectedIncident.id, payload);
      if (res.success) {
        setShowStatusModal(false);
        // Refresh details
        handleOpenDetails(res.incident || selectedIncident);
        fetchIncidents();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getPriorityBadge = (priority: NocPriority) => {
    switch (priority) {
      case 'P1':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
            <Zap className="w-3 h-3 mr-1 text-rose-600 animate-pulse" />
            P1 - Critical
          </span>
        );
      case 'P2':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            P2 - High
          </span>
        );
      case 'P3':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            P3 - Medium
          </span>
        );
      case 'P4':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            P4 - Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: NocStatus) => {
    switch (status) {
      case 'Reported':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Reported
          </span>
        );
      case 'Acknowledged':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
            <Info className="w-3 h-3 mr-1 text-indigo-600" />
            Acknowledged
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench className="w-3 h-3 mr-1 text-amber-600" />
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-800">
            <ShieldCheck className="w-3 h-3 mr-1 text-slate-600" />
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                NOC Network Incidents
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Real-time network operational outage reporting, fiber break escalation, and NOC live repair coordination
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh Network Incidents"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer space-x-2"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>+ Raise Issue to NOC</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Outages"
          value={stats.activeCount || 0}
          icon={<WifiOff className="w-6 h-6" />}
          subtitle={stats.activeCount > 0 ? `${stats.activeCount} unresolved` : 'All links clear'}
          variant="danger"
        />

        <StatCard
          title="Critical Incidents"
          value={stats.p1CriticalCount || 0}
          icon={<Zap className="w-6 h-6" />}
          subtitle={stats.p1CriticalCount > 0 ? 'Major outage active' : 'No critical active'}
          variant="danger"
        />

        <StatCard
          title="Under Repair / Investigation"
          value={stats.inProgressCount || 0}
          icon={<Wrench className="w-6 h-6" />}
          subtitle="Technicians on site"
          variant="warning"
        />

        <StatCard
          title="Resolved Network Issues"
          value={stats.resolvedCount || 0}
          icon={<CheckCircle2 className="w-6 h-6" />}
          subtitle="Restored successfully"
          variant="success"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Incident ID, Complain By, or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Issue Type */}
          <div>
            <select
              value={issueTypeFilter}
              onChange={e => setIssueTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
            >
              <option value="">All Issue Types</option>
              {issueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Reported">Reported</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Branch row filter if more than 1 branch */}
        {branches.length > 0 && (
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs text-slate-500 overflow-x-auto">
            <span className="font-medium text-slate-700 shrink-0">Filter by Branch:</span>
            <button
              onClick={() => setBranchFilter('')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                branchFilter === ''
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Branches
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => setBranchFilter(String(b.id))}
                className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  branchFilter === String(b.id)
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Incidents List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium text-slate-500">Loading NOC network incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Wifi className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Network Incidents Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              All optical distribution nodes, backbone paths, and POP infrastructure are operating normally without active escalations.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-5 inline-flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
            >
              + Raise New NOC Issue
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {incidents.map(inc => (
              <div
                key={inc.id}
                onClick={() => handleOpenDetails(inc)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {inc.incident_id}
                    </span>
                    {getStatusBadge(inc.status)}
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      {inc.issue_type}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {inc.title}
                  </h3>

                  <p className="text-sm text-slate-600 line-clamp-2">
                    {inc.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                    {(inc.complain_by_name || inc.reported_by_name) && (
                      <span className="flex items-center text-slate-700 font-medium">
                        <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Complain by: <strong className="ml-1 text-slate-900">{inc.complain_by_name || inc.reported_by_name}</strong>
                      </span>
                    )}

                    {inc.branch_name && (
                      <span className="flex items-center">
                        <Server className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {inc.branch_name}
                      </span>
                    )}

                    {inc.affected_customers_count ? (
                      <span className="flex items-center text-rose-600 font-medium">
                        ~{inc.affected_customers_count} subscribers impacted
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 gap-2">
                  {inc.assigned_noc_engineer_name ? (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">NOC Engineer</span>
                      <span className="text-xs font-semibold text-slate-800 flex items-center justify-end">
                        <Wrench className="w-3 h-3 mr-1 text-indigo-500" />
                        {inc.assigned_noc_engineer_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Unassigned NOC
                    </span>
                  )}

                  <div className="flex items-center space-x-2">
                    {inc.updates_count ? (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {inc.updates_count} updates
                      </span>
                    ) : null}
                    <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
                      View Details <ChevronRight className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raise NOC Issue Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Raise Network Issue to NOC"
        subtitle="Escalate major network outages, fiber breaks, or core hardware faults to the central Network Operations Center"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Incident Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 48F Core Fiber Cut near Mahalaxmisthan Ring Road"
                value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Issue Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Network Issue Type *
              </label>
              <select
                required
                value={createForm.issue_type}
                onChange={e => setCreateForm({ ...createForm, issue_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                {issueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Complain By (Name) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Complain By (Name) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Shrestha / Customer Name"
                value={createForm.complain_by_name}
                onChange={e => setCreateForm({ ...createForm, complain_by_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Responsible Branch
              </label>
              <select
                value={createForm.branch_id}
                onChange={e => setCreateForm({ ...createForm, branch_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="">None / Backbone Level</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            {/* Approx Customers Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estimated Impacted Subscribers
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1 or 50"
                value={createForm.affected_customers_count}
                onChange={e => setCreateForm({ ...createForm, affected_customers_count: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Affected Services */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Affected Services
              </label>
              <input
                type="text"
                placeholder="e.g. Internet Broadband, IPTV, Leased Line"
                value={createForm.affected_services}
                onChange={e => setCreateForm({ ...createForm, affected_services: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outage Symptoms & Technical Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe what occurred, customer complaints, errors or symptoms..."
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Suggestions Box */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Suggestion / Recommendation for NOC
              </label>
              <textarea
                rows={2}
                placeholder="Any suggestions or recommendations for the NOC team to investigate or fix..."
                value={createForm.suggestions}
                onChange={e => setCreateForm({ ...createForm, suggestions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Impact Details */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Impact Details & Redundancy Status
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Traffic slow in sector 4, client ONU losing optical signal intermittently..."
                value={createForm.impact_details}
                onChange={e => setCreateForm({ ...createForm, impact_details: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Escalating to NOC...
                </>
              ) : (
                '🚨 Escalate to NOC'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Incident Details & Timeline Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident ? `${selectedIncident.incident_id}: ${selectedIncident.title}` : 'Incident Details'}
        subtitle="Network incident progress, NOC assignments, and live chronological field telemetry"
        maxWidth="2xl"
      >
        {selectedIncident && (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Status Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex items-center space-x-2">
                {getStatusBadge(selectedIncident.status)}
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  {selectedIncident.issue_type}
                </span>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center space-x-2">
                {selectedIncident.status === 'Reported' && (
                  <button
                    onClick={() => handleOpenStatusModal('Acknowledged')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Acknowledge Incident
                  </button>
                )}

                {selectedIncident.status !== 'In Progress' && selectedIncident.status !== 'Resolved' && selectedIncident.status !== 'Closed' && (
                  <button
                    onClick={() => handleOpenStatusModal('In Progress')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Mark In Progress
                  </button>
                )}

                {selectedIncident.status !== 'Resolved' && selectedIncident.status !== 'Closed' && (
                  <button
                    onClick={() => handleOpenStatusModal('Resolved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Resolve Incident
                  </button>
                )}

                <button
                  onClick={() => handleOpenStatusModal(selectedIncident.status)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  title="Edit Status / Assign Engineer"
                >
                  Update Info
                </button>
              </div>
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Complain By</span>
                <span className="font-semibold text-slate-800 text-sm flex items-center mt-0.5">
                  <Users className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  {selectedIncident.complain_by_name || selectedIncident.reported_by_name || 'Staff'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Assigned Branch</span>
                <span className="font-semibold text-slate-800 text-sm flex items-center mt-0.5">
                  <Server className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                  {selectedIncident.branch_name || 'Core Network'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Assigned NOC Engineer</span>
                <span className="font-semibold text-slate-800 text-sm flex items-center mt-0.5">
                  <Wrench className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  {selectedIncident.assigned_noc_engineer_name || 'Pending Assignment'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Affected Subscribers</span>
                <span className="font-semibold text-rose-600 text-sm flex items-center mt-0.5">
                  <Users className="w-3.5 h-3.5 mr-1" />
                  {selectedIncident.affected_customers_count ? `${selectedIncident.affected_customers_count} Users` : 'None / Trunk only'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Reported By</span>
                <span className="font-semibold text-slate-800 text-sm block mt-0.5">
                  {selectedIncident.reported_by_name || 'System Staff'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Reported Time</span>
                <span className="font-semibold text-slate-800 text-sm block mt-0.5">
                  {new Date(selectedIncident.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Description, Suggestions & Impact */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description & Initial Symptoms
                </h4>
                <p className="text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.suggestions && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Suggestions / Recommendations
                  </h4>
                  <p className="text-sm text-slate-800 bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/70 leading-relaxed whitespace-pre-wrap">
                    {selectedIncident.suggestions}
                  </p>
                </div>
              )}

              {selectedIncident.impact_details && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Impact Details
                  </h4>
                  <p className="text-sm text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 leading-relaxed">
                    {selectedIncident.impact_details}
                  </p>
                </div>
              )}

              {/* Resolution / RCA if resolved */}
              {(selectedIncident.resolution_notes || selectedIncident.root_cause_analysis) && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Resolution & Root Cause Analysis (RCA)
                  </h4>
                  {selectedIncident.resolution_notes && (
                    <p className="text-sm text-emerald-950">
                      <strong>Resolution Notes:</strong> {selectedIncident.resolution_notes}
                    </p>
                  )}
                  {selectedIncident.root_cause_analysis && (
                    <p className="text-sm text-emerald-950">
                      <strong>Root Cause:</strong> {selectedIncident.root_cause_analysis}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Chronological Updates Timeline */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Activity className="w-4 h-4 mr-1.5 text-indigo-600" />
                Live Incident Timeline & Updates ({incidentUpdates.length})
              </h4>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {incidentUpdates.map(upd => (
                  <div key={upd.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {upd.user_name || 'Staff'}{' '}
                        {upd.user_role ? (
                          <span className="text-[10px] text-indigo-600 font-normal">({upd.user_role})</span>
                        ) : null}
                      </span>
                      <span>{new Date(upd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">{upd.update_text}</p>
                  </div>
                ))}
              </div>

              {/* Add Update Input */}
              <form onSubmit={handlePostUpdate} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Post operational remark or OTDR measurement..."
                  value={newUpdateText}
                  onChange={e => setNewUpdateText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={postingUpdate || !newUpdateText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Transition Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update Incident Status: ${targetStatus}`}
        subtitle="Transition status, assign NOC engineer, or record Root Cause Analysis"
        maxWidth="lg"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Transition Status To *
            </label>
            <select
              value={targetStatus}
              onChange={e => setTargetStatus(e.target.value as NocStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Reported">Reported</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress (Splicing / Investigation)</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assign / Reassign NOC Engineer
            </label>
            <select
              value={assignedEngineerId}
              onChange={e => setAssignedEngineerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">-- Select NOC Engineer / Field Lead --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName || s.full_name || s.username} ({s.designation || s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Status Change Remark
            </label>
            <input
              type="text"
              placeholder="e.g. Splicing team dispatched; OTDR indicates break at 1.8km"
              value={statusRemark}
              onChange={e => setStatusRemark(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {(targetStatus === 'Resolved' || targetStatus === 'Closed') && (
            <>
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="How was the network restored? (e.g. Respliced 24 loose tube fibers, link power back to -18dBm)"
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-emerald-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Root Cause Analysis (RCA)
                </label>
                <textarea
                  rows={2}
                  placeholder="Root cause (e.g. Road expansion backhoe damaged underground conduit)"
                  value={rootCauseAnalysis}
                  onChange={e => setRootCauseAnalysis(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-emerald-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStatus}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center"
            >
              {updatingStatus ? 'Updating...' : 'Confirm Status Transition'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
