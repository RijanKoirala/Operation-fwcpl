import React, { useState, useEffect } from 'react';
import {
  Plug,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Target,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Connection, ConnectionMetrics } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { MultiStaffSelect, AssignedStaffPills } from '../components/common/MultiStaffSelect';

export const Connections: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [updateCompletionDate, setUpdateCompletionDate] = useState('');
  const [updateStaffIds, setUpdateStaffIds] = useState<number[]>([]);
  const [targetContribution, setTargetContribution] = useState<any>(null);
  const [loadingContribution, setLoadingContribution] = useState(false);

  const [createForm, setCreateForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    branchId: user?.branchId || '',
    assignedStaffIds: [] as number[],
    connectionType: 'Fiber Internet',
    packagePlan: 'Home Super 200 Mbps',
    requestDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const pipelineStages = [
    'New Request',
    'Contacted',
    'Site Survey Required',
    'Site Survey Completed',
    'Documents Pending',
    'Installation Scheduled',
    'Installed',
    'Activated',
    'Completed',
  ];

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const qObj: Record<string, string> = {
        search,
        status: statusFilter,
        branchId: branchFilter,
      };
      if (staffFilter) qObj.staffId = staffFilter;
      const q = new URLSearchParams(qObj).toString();

      const [cRes, mRes] = await Promise.all([
        api.get(`/connections?${q}`),
        api.get('/connections/metrics'),
      ]);

      if (cRes.success) setConnections(cRes.connections);
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
    fetchConnections();
  }, [search, statusFilter, branchFilter, staffFilter]);

  useEffect(() => {
    if (selectedConn && (selectedConn.status === 'Completed' || updateStatus === 'Completed')) {
      setLoadingContribution(true);
      api.connections.getTargetContribution(selectedConn.id)
        .then((res: any) => {
          if (res?.success) {
            setTargetContribution(res.contribution);
          } else {
            setTargetContribution(null);
          }
        })
        .catch(err => {
          console.error('Failed to load target contribution:', err);
          setTargetContribution(null);
        })
        .finally(() => setLoadingContribution(false));
    } else {
      setTargetContribution(null);
    }
  }, [selectedConn, updateStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/connections', createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          customerName: '',
          phone: '',
          email: '',
          address: '',
          branchId: user?.branchId || '',
          assignedStaffIds: [],
          connectionType: 'Fiber Internet',
          packagePlan: 'Home Super 200 Mbps',
          requestDate: new Date().toISOString().split('T')[0],
          remarks: '',
        });
        fetchConnections();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create connection');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConn) return;

    try {
      const payload: any = {
        status: updateStatus,
        remarks: updateRemarks,
        assignedStaffIds: updateStaffIds,
      };
      if (updateStatus === 'Installed') {
        payload.installationDate = new Date().toISOString().split('T')[0];
      } else if (updateStatus === 'Activated') {
        payload.activationDate = new Date().toISOString().split('T')[0];
      } else if (updateStatus === 'Completed') {
        const compDate = updateCompletionDate || new Date().toISOString().split('T')[0];
        payload.completionDate = compDate;
        payload.activationDate = selectedConn.activation_date || compDate;
      }

      const res = await api.put(`/connections/${selectedConn.id}`, payload);
      if (res.success) {
        setShowStatusModal(false);
        fetchConnections();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">New Customer Connections</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            End-to-end customer onboarding pipeline from inquiry to optical fiber activation
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Connection Request
        </button>
      </div>

      {/* Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Inquiries"
          value={metrics?.total || 0}
          subtitle="All received requests"
          icon={<Plug className="w-5 h-5" />}
          variant="blue"
        />
        <StatCard
          title="Conversion Rate"
          value={`${metrics?.conversionRate || 0}%`}
          subtitle="Activated vs eligible"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
        />
        <StatCard
          title="Avg Delivery Time"
          value={`${metrics?.avgCompletionDays || 2.4} Days`}
          subtitle="Inquiry to activation"
          icon={<Clock className="w-5 h-5" />}
          variant="purple"
        />
        <StatCard
          title="Completed"
          value={metrics?.counts?.completed || 0}
          subtitle={`${metrics?.counts?.activated || 0} active in service`}
          icon={<Layers className="w-5 h-5" />}
          variant="amber"
        />
      </div>

      {/* Pipeline Status Flow Pills */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {pipelineStages.map((st, idx) => (
            <React.Fragment key={st}>
              <button
                onClick={() => setStatusFilter(statusFilter === st ? '' : st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
              {idx < pipelineStages.length - 1 && <span className="text-slate-300">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer name, phone, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
          >
            <option value="">All Pipeline Stages</option>
            {pipelineStages.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="Cancelled">Cancelled</option>
            <option value="Rejected">Rejected</option>
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

      {/* Connections Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Connection ID</th>
              <th className="py-3.5 px-4">Customer Details</th>
              <th className="py-3.5 px-4">Branch</th>
              <th className="py-3.5 px-4">Package Plan</th>
              <th className="py-3.5 px-4">Assigned Staff</th>
              <th className="py-3.5 px-4">Request Date</th>
              <th className="py-3.5 px-4">Stage</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {connections.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-800">{c.connection_id}</td>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-900 block">{c.customer_name}</span>
                  <span className="text-xs text-slate-400 block">{c.phone} • {c.address}</span>
                </td>
                <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{c.branch_name}</td>
                <td className="py-3.5 px-4">
                  <span className="font-medium text-slate-800 text-xs block">{c.package_plan}</span>
                  <span className="text-[11px] text-slate-400">{c.connection_type}</span>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  <AssignedStaffPills staff={c.assigned_staff} fallbackName={c.assigned_staff_name} />
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">{c.request_date}</td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge status={c.status} />
                    {c.status === 'Completed' && (
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 flex items-center gap-1">
                        <Target className="w-2.5 h-2.5 text-brand-600" /> Target Synced
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedConn(c);
                      setUpdateStatus(c.status);
                      setUpdateRemarks(c.remarks || '');
                      setUpdateCompletionDate(c.completion_date || (c.status === 'Completed' ? new Date().toISOString().split('T')[0] : ''));
                      const currentIds = (c.assigned_staff && c.assigned_staff.length > 0)
                        ? c.assigned_staff.map(s => (s.staff_id || s.id) as number).filter(Boolean)
                        : (c.assigned_staff_id ? [c.assigned_staff_id] : []);
                      setUpdateStaffIds(currentIds);
                      setShowStatusModal(true);
                    }}
                    className="text-xs font-bold text-brand-600 hover:bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 transition-colors"
                  >
                    Advance Stage
                  </button>
                </td>
              </tr>
            ))}
            {connections.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No connection records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Advance Stage Modal */}
      {selectedConn && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title={`Update Connection: ${selectedConn.customer_name}`}
          subtitle={`Current Stage: ${selectedConn.status} • Plan: ${selectedConn.package_plan}`}
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pipeline Stage *</label>
              <select
                value={updateStatus}
                onChange={e => {
                  const val = e.target.value;
                  setUpdateStatus(val);
                  if (val === 'Completed' && !updateCompletionDate) {
                    setUpdateCompletionDate(selectedConn.completion_date || new Date().toISOString().split('T')[0]);
                  }
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
              >
                {pipelineStages.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {updateStatus === 'Completed' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Completion Date *</label>
                <input
                  type="date"
                  required
                  value={updateCompletionDate}
                  onChange={e => setUpdateCompletionDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The target engine attributes this completed connection to the target matching this date period.
                </p>
              </div>
            )}

            {/* Target Contribution Banner for Completed Connections */}
            {(selectedConn.status === 'Completed' || updateStatus === 'Completed') && (
              <div className="p-4 rounded-xl border bg-gradient-to-br from-brand-50/70 via-indigo-50/40 to-slate-50 border-brand-200/80 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-brand-950 uppercase tracking-wider">
                          Target Integration
                        </h4>
                        <span className="text-[10px] bg-brand-200/60 text-brand-800 font-bold px-1.5 py-0.5 rounded-md">
                          ⚡ Auto-Sync
                        </span>
                      </div>
                      {targetContribution?.hasTarget && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Target Matched
                        </span>
                      )}
                    </div>

                    {loadingContribution ? (
                      <p className="text-xs text-slate-500 mt-1.5 animate-pulse">
                        Evaluating branch target contribution...
                      </p>
                    ) : targetContribution?.hasTarget ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-slate-800 leading-snug">
                          Counts toward <strong className="font-black text-brand-900">{targetContribution.branchName}</strong> — <strong className="font-bold">{targetContribution.targetName}</strong> ({targetContribution.period})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                          <div className="bg-white/80 p-2 rounded-lg border border-brand-100">
                            <span className="text-[10px] text-slate-500 block">Goal</span>
                            <span className="text-xs font-black text-slate-900">{targetContribution.targetValue}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-brand-100">
                            <span className="text-[10px] text-slate-500 block">Achieved</span>
                            <span className="text-xs font-black text-emerald-700">{targetContribution.achievedValue}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-brand-100">
                            <span className="text-[10px] text-slate-500 block">Remaining</span>
                            <span className="text-xs font-black text-amber-700">{targetContribution.remainingValue}</span>
                          </div>
                          <div className="bg-brand-600 text-white p-2 rounded-lg shadow-xs">
                            <span className="text-[10px] text-brand-100 block">This Record</span>
                            <span className="text-xs font-black">+1 Completed</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                        {targetContribution?.reason || (
                          updateStatus === 'Completed' && selectedConn.status !== 'Completed'
                            ? 'Saving this connection as Completed will automatically credit +1 to the branch New Connection target.'
                            : 'No active New Connection target found for this branch and completion date period.'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Technicians / Staff ({updateStaffIds.length} assigned)
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Assign one or more technicians for survey, cabling, splicing, or activation.
              </p>
              <MultiStaffSelect
                staff={staffMembers.filter(s => Number(s.branch_id) === Number(selectedConn.branch_id))}
                selectedIds={updateStaffIds}
                onChange={setUpdateStaffIds}
                placeholder="Assign technicians..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Survey & Optical Notes</label>
              <textarea
                rows={3}
                value={updateRemarks}
                onChange={e => setUpdateRemarks(e.target.value)}
                placeholder="Optical power reading, ONT serial number, customer verification..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
              >
                Save Progress
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Connection Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Customer Onboarding Request"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Shyam Sundar Shrestha"
                value={createForm.customerName}
                onChange={e => setCreateForm({ ...createForm, customerName: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                placeholder="+977-98..."
                value={createForm.phone}
                onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Physical Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ward 4, Kumaripati, near Eye Hospital"
              value={createForm.address}
              onChange={e => setCreateForm({ ...createForm, address: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
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
                Assigned Technicians ({createForm.assignedStaffIds.length} selected)
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Assign one or multiple technicians to handle this connection.
              </p>
              <MultiStaffSelect
                staff={staffMembers.filter(s => !createForm.branchId || Number(s.branch_id) === Number(createForm.branchId))}
                selectedIds={createForm.assignedStaffIds}
                onChange={ids => setCreateForm({ ...createForm, assignedStaffIds: ids })}
                placeholder="Search technicians to assign..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Connection Type</label>
              <select
                value={createForm.connectionType}
                onChange={e => setCreateForm({ ...createForm, connectionType: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="Fiber Internet">Residential Fiber Internet</option>
                <option value="Corporate Lease">Corporate Dedicated Leased Line</option>
                <option value="SME Bundle">SME Pro Bundle</option>
                <option value="IPTV + Net">Fiber Internet + NetTV</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Package Plan *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ultra Fiber 300 Mbps"
                value={createForm.packagePlan}
                onChange={e => setCreateForm({ ...createForm, packagePlan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
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
              Submit Connection Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
