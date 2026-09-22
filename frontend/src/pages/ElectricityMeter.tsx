import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Gauge,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Edit2,
  Trash2,
  RefreshCw,
  TrendingUp,
  Building2,
  X,
  Camera,
  Upload,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const ElectricityMeter: React.FC = () => {
  const { user, hasPermission } = useAuth();

  // Scoping check
  const roleNameUpper = (user?.role || '').toUpperCase();
  const deptUpper = ((user as any)?.department_code || '').toUpperCase();
  const isOps = roleNameUpper === 'SUPER_ADMIN' || roleNameUpper === 'MANAGEMENT' || deptUpper === 'OPERATION' || deptUpper === 'OPS';
  const branchId = user?.branchId;

  // Active Tab: 'meters' | 'payments' | 'analytics'
  const [activeTab, setActiveTab] = useState<'meters' | 'payments' | 'analytics'>('meters');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [meters, setMeters] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  // Filter States
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(isOps ? 'ALL' : (branchId ? String(branchId) : 'ALL'));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');

  // Modals
  const [showAddMeterModal, setShowAddMeterModal] = useState(false);
  const [editingMeter, setEditingMeter] = useState<any | null>(null);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [selectedMeterForReading, setSelectedMeterForReading] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMeter, setHistoryMeter] = useState<any | null>(null);
  const [meterReadings, setMeterReadings] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTargetMeter, setPaymentTargetMeter] = useState<any | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Forms state
  const [meterForm, setMeterForm] = useState({
    branch_id: branchId ? String(branchId) : '',
    name: '',
    meter_number: '',
    meter_type: 'Main',
    location: '',
    installation_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    description: '',
    remarks: '',
    initial_reading: '',
  });

  const [readingForm, setReadingForm] = useState({
    reading_date: new Date().toISOString().split('T')[0],
    current_reading: '',
    is_reset: false,
    reset_reason: '',
    remarks: '',
    image: null as File | null,
  });

  const [paymentForm, setPaymentForm] = useState({
    meter_id: '',
    reading_id: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    billed_units: '',
    rate_per_unit: '12',
    bill_amount: '',
    paid_amount: '',
    paid_units: '',
    payment_status: 'UNPAID',
    payment_date: '',
    payment_method: 'Online',
    remarks: '',
    bill_image: null as File | null,
    receipt_image: null as File | null,
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBranchFilter, statusFilter, paymentStatusFilter]);

  const fetchBranches = async () => {
    try {
      const res = await api.branches.getAll();
      setBranches(res.branches || []);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranchFilter !== 'ALL' ? selectedBranchFilter : undefined;
      const [mRes, pRes, sRes] = await Promise.all([
        api.electricity.getMeters({ branch_id: branchParam, status: statusFilter }),
        api.electricity.getPayments({ branch_id: branchParam, payment_status: paymentStatusFilter }),
        api.electricity.getStats({ branch_id: branchParam }),
      ]);
      setMeters(mRes.meters || []);
      setPayments(pRes.payments || []);
      setStats(sRes.stats || null);
    } catch (err: any) {
      console.error('Failed to load electricity data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Reading Modal
  const openReadingModal = (meter: any) => {
    setSelectedMeterForReading(meter);
    setReadingForm({
      reading_date: new Date().toISOString().split('T')[0],
      current_reading: '',
      is_reset: false,
      reset_reason: '',
      remarks: '',
      image: null,
    });
    setFormError(null);
    setShowReadingModal(true);
  };

  // Open History Modal
  const openHistoryModal = async (meter: any) => {
    setHistoryMeter(meter);
    setShowHistoryModal(true);
    try {
      const res = await api.electricity.getReadings(meter.id);
      setMeterReadings(res.readings || []);
    } catch (err: any) {
      console.error('Failed to load readings history:', err);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (meter?: any, payment?: any) => {
    setPaymentTargetMeter(meter || null);
    setEditingPayment(payment || null);
    setFormError(null);

    if (payment) {
      setPaymentForm({
        meter_id: String(payment.meter_id),
        reading_id: payment.reading_id ? String(payment.reading_id) : '',
        bill_number: payment.bill_number || '',
        bill_date: payment.bill_date ? payment.bill_date.split('T')[0] : '',
        due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
        billed_units: String(payment.billed_units || ''),
        rate_per_unit: String(payment.rate_per_unit || '12'),
        bill_amount: String(payment.bill_amount || ''),
        paid_amount: String(payment.paid_amount || ''),
        paid_units: String(payment.paid_units || ''),
        payment_status: payment.payment_status || 'UNPAID',
        payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
        payment_method: payment.payment_method || 'Online',
        remarks: payment.remarks || '',
        bill_image: null,
        receipt_image: null,
      });
    } else {
      const latestUnits = meter?.latest_reading?.units_used || '';
      const defRate = 12;
      const defAmt = latestUnits ? String(parseFloat(latestUnits) * defRate) : '';
      setPaymentForm({
        meter_id: meter ? String(meter.id) : '',
        reading_id: meter?.latest_reading?.id ? String(meter.latest_reading.id) : '',
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        due_date: '',
        billed_units: latestUnits ? String(latestUnits) : '',
        rate_per_unit: String(defRate),
        bill_amount: defAmt,
        paid_amount: '',
        paid_units: '',
        payment_status: 'UNPAID',
        payment_date: '',
        payment_method: 'Online',
        remarks: '',
        bill_image: null,
        receipt_image: null,
      });
    }
    setShowPaymentModal(true);
  };

  // Handle Save Meter
  const handleSaveMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingMeter) {
        await api.electricity.updateMeter(editingMeter.id, meterForm);
      } else {
        await api.electricity.createMeter(meterForm);
      }
      setShowAddMeterModal(false);
      setEditingMeter(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save meter.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Save Reading
  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeterForReading) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('meter_id', String(selectedMeterForReading.id));
      formData.append('reading_date', readingForm.reading_date);
      formData.append('current_reading', readingForm.current_reading);
      formData.append('is_reset', String(readingForm.is_reset));
      if (readingForm.reset_reason) formData.append('reset_reason', readingForm.reset_reason);
      if (readingForm.remarks) formData.append('remarks', readingForm.remarks);
      if (readingForm.image) formData.append('image', readingForm.image);

      await api.electricity.recordReading(formData);
      setShowReadingModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record meter reading.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Save Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      Object.entries(paymentForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'bill_image' && k !== 'receipt_image') {
          formData.append(k, String(v));
        }
      });
      if (paymentForm.bill_image) formData.append('bill_image', paymentForm.bill_image);
      if (paymentForm.receipt_image) formData.append('receipt_image', paymentForm.receipt_image);

      if (editingPayment) {
        await api.electricity.updatePayment(editingPayment.id, formData);
      } else {
        await api.electricity.createPayment(formData);
      }
      setShowPaymentModal(false);
      setEditingPayment(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save payment record.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Meter
  const handleDeleteMeter = async (meter: any) => {
    if (!window.confirm(`Are you sure you want to remove meter '${meter.name}' (${meter.meter_number})? All readings and payment records will be permanently deleted.`)) {
      return;
    }
    try {
      await api.electricity.deleteMeter(meter.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete meter.');
    }
  };

  // Filtered meters
  const filteredMeters = useMemo(() => {
    return meters.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        m.name?.toLowerCase().includes(q) ||
        m.meter_number?.toLowerCase().includes(q) ||
        m.location?.toLowerCase().includes(q) ||
        m.branch_name?.toLowerCase().includes(q)
      );
    });
  }, [meters, searchQuery]);

  // Calculated units helper for reading modal
  const liveCalculatedUnits = useMemo(() => {
    if (!selectedMeterForReading || !readingForm.current_reading) return null;
    const curr = parseFloat(readingForm.current_reading);
    if (isNaN(curr)) return null;

    const prev = selectedMeterForReading.latest_reading?.current_reading !== undefined
      ? parseFloat(selectedMeterForReading.latest_reading.current_reading)
      : null;

    if (prev === null) return 0; // Baseline
    if (readingForm.is_reset) return curr;
    if (curr < prev) return 'INVALID';
    return (curr - prev).toFixed(2);
  }, [selectedMeterForReading, readingForm.current_reading, readingForm.is_reset]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Electricity Meter Management</h1>
              <p className="text-xs text-slate-500">Monitor branch electrical meters, photo reading entries, and billing reconciliation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('electricity.meters.create') && (
            <button
              onClick={() => {
                setEditingMeter(null);
                setMeterForm({
                  branch_id: branchId ? String(branchId) : (branches[0]?.id ? String(branches[0].id) : ''),
                  name: '',
                  meter_number: '',
                  meter_type: 'Main',
                  location: '',
                  installation_date: new Date().toISOString().split('T')[0],
                  status: 'Active',
                  description: '',
                  remarks: '',
                  initial_reading: '',
                });
                setFormError(null);
                setShowAddMeterModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Meter
            </button>
          )}

          {hasPermission('electricity.payment.create') && (
            <button
              onClick={() => openPaymentModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Record Bill / Payment
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Meters</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats?.activeMeters || meters.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across monitored branches</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">This Month Consumption</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {stats?.currentMonthUnits ? Number(stats.currentMonthUnits).toLocaleString() : '0'}{' '}
              <span className="text-xs font-normal text-slate-500">Units</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Last month: {stats?.lastMonthUnits ? Number(stats.lastMonthUnits).toLocaleString() : '0'} units
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Electricity Billed</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              Rs. {stats?.totalBilled ? Number(stats.totalBilled).toLocaleString() : '0'}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Paid: Rs. {stats?.totalPaid ? Number(stats.totalPaid).toLocaleString() : '0'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stats?.pendingBillsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending / Due Bills</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {stats?.pendingBillsCount || 0}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({stats?.totalDueAmount ? `Rs. ${Number(stats.totalDueAmount).toLocaleString()}` : 'Rs. 0'})
              </span>
            </p>
            <p className="text-[11px] text-rose-500 font-medium mt-0.5">
              {stats?.overdueBillsCount || 0} overdue payments
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('meters')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'meters'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gauge className="w-4 h-4" />
          Meters & Readings ({meters.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Billing & Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Consumption Analytics
        </button>
      </div>

      {/* Tab Content 1: METERS */}
      {activeTab === 'meters' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meter number, name, location..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {isOps && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                onClick={fetchData}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Meter Cards Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">Loading electricity meters...</div>
          ) : filteredMeters.length === 0 ? (
            <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center">
              <Zap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No electricity meters found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try changing filters or add a new meter for this branch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMeters.map((m) => {
                const lr = m.latest_reading;
                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top */}
                      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {m.meter_type || 'Main'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                m.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-1.5">{m.name}</h3>
                          <p className="text-xs text-slate-500 font-mono">No: {m.meter_number}</p>
                        </div>

                        {/* Branch badge */}
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                          {m.branch_name}
                        </span>
                      </div>

                      {/* Card Body / Latest Reading Preview */}
                      <div className="p-4 space-y-3">
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium">Latest Reading:</span>
                            <span>{lr?.reading_date ? new Date(lr.reading_date).toLocaleDateString() : 'No readings yet'}</span>
                          </div>

                          {lr ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-2xl font-black text-slate-900 tracking-tight">
                                  {Number(lr.current_reading).toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-400 ml-1">kWh</span>
                              </div>
                              <div className="text-right">
                                <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                                  +{lr.units_used} units
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Please enter the baseline reading.</p>
                          )}

                          {lr?.image_url && (
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[11px]">Photo Verified</span>
                              <button
                                onClick={() => setPreviewImage(lr.image_url)}
                                className="text-indigo-600 hover:text-indigo-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                View Photo
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Meta details */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Location</span>
                            <span className="truncate block">{m.location || '—'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total Consumed</span>
                            <span className="font-semibold text-slate-700">{Number(m.total_units_consumed || 0).toLocaleString()} units</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => openReadingModal(m)}
                        className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Enter Reading
                      </button>

                      <button
                        onClick={() => openHistoryModal(m)}
                        className="py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                        title="Reading Logs"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>

                      {hasPermission('electricity.payment.create') && (
                        <button
                          onClick={() => openPaymentModal(m)}
                          className="py-1.5 px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                          title="Record Bill"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {hasPermission('electricity.meters.edit') && (
                        <button
                          onClick={() => {
                            setEditingMeter(m);
                            setMeterForm({
                              branch_id: String(m.branch_id),
                              name: m.name,
                              meter_number: m.meter_number,
                              meter_type: m.meter_type || 'Main',
                              location: m.location || '',
                              installation_date: m.installation_date ? m.installation_date.split('T')[0] : '',
                              status: m.status || 'Active',
                              description: m.description || '',
                              remarks: m.remarks || '',
                              initial_reading: '',
                            });
                            setShowAddMeterModal(true);
                          }}
                          className="py-1.5 px-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                          title="Edit Meter"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {hasPermission('electricity.meters.delete') && (
                        <button
                          onClick={() => handleDeleteMeter(m)}
                          className="py-1.5 px-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                          title="Delete Meter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: BILLING & PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Payment Status</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
              </select>
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer ml-auto"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Bill Date / Due</th>
                    <th className="py-3 px-4">Branch / Meter</th>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4 text-right">Units</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">Bill Amount</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Due Units</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Photos</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        No electricity bills or payments recorded.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const isOverdue = p.payment_status === 'OVERDUE' || (p.payment_status !== 'PAID' && p.due_date && new Date(p.due_date) < new Date());
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">
                              {p.bill_date ? new Date(p.bill_date).toLocaleDateString() : '—'}
                            </span>
                            <span className={`text-[10px] ${isOverdue ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                              Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900 block">{p.branch_name}</span>
                            <span className="text-[11px] text-slate-500">{p.meter_name} ({p.meter_number})</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {p.bill_number || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-800">
                            {Number(p.billed_units || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            Rs. {p.rate_per_unit || '12'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            Rs. {Number(p.bill_amount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            Rs. {Number(p.paid_amount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-rose-600">
                            {p.due_units || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                p.payment_status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : p.payment_status === 'PARTIALLY_PAID'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : isOverdue
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {p.bill_image_url && (
                                <button
                                  onClick={() => setPreviewImage(p.bill_image_url)}
                                  className="text-indigo-600 hover:text-indigo-700 text-[11px] flex items-center gap-0.5 cursor-pointer"
                                  title="View Bill"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Bill
                                </button>
                              )}
                              {p.receipt_image_url && (
                                <button
                                  onClick={() => setPreviewImage(p.receipt_image_url)}
                                  className="text-emerald-600 hover:text-emerald-700 text-[11px] flex items-center gap-0.5 cursor-pointer"
                                  title="View Receipt"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Slip
                                </button>
                              )}
                              {!p.bill_image_url && !p.receipt_image_url && (
                                <span className="text-slate-300 text-[11px]">None</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {hasPermission('electricity.payment.edit') && (
                                <button
                                  onClick={() => openPaymentModal(undefined, p)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                  title="Edit Payment"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* Tab Content 3: ANALYTICS & BRANCH COMPARISON */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Monthly Consumption Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Monthly Consumption Trend (Units)</h3>
                <p className="text-xs text-slate-500">Historical electricity usage trend over recent months</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {stats?.trend && stats.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} Units`, 'Consumption']}
                    />
                    <Area type="monotone" dataKey="total_units" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUnits)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No consumption history records available yet.
                </div>
              )}
            </div>
          </div>

          {/* Branch-wise Consumption & Expense Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Branch Consumption & Expenditure Breakdown</h3>
                <p className="text-xs text-slate-500">Compare power usage, billing, and dues by branch</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-center">Active Meters</th>
                    <th className="py-3 px-4 text-right">This Month Units</th>
                    <th className="py-3 px-4 text-right">Total Billed</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Due Units</th>
                    <th className="py-3 px-4 text-center">Unpaid Bills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.branchComparison && stats.branchComparison.length > 0 ? (
                    stats.branchComparison.map((bc: any) => (
                      <tr key={bc.branch_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {bc.branch_name} <span className="text-slate-400 font-normal">({bc.code})</span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{bc.meters_count || 0}</td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-600">
                          {Number(bc.total_units || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">Rs. {Number(bc.total_billed || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">
                          Rs. {Number(bc.total_paid || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-rose-600">{bc.due_units || 0}</td>
                        <td className="py-3 px-4 text-center">
                          {bc.unpaid_bills > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px]">
                              {bc.unpaid_bills} pending
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Clear</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No branch data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT METER */}
      {showAddMeterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingMeter ? 'Edit Electricity Meter' : 'Register New Electricity Meter'}
              </h3>
              <button
                onClick={() => setShowAddMeterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMeter} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
                <select
                  value={meterForm.branch_id}
                  disabled={!isOps}
                  onChange={(e) => setMeterForm({ ...meterForm, branch_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Meter Name *</label>
                  <input
                    type="text"
                    value={meterForm.name}
                    onChange={(e) => setMeterForm({ ...meterForm, name: e.target.value })}
                    placeholder="e.g. Main Branch Meter"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Meter Number *</label>
                  <input
                    type="text"
                    value={meterForm.meter_number}
                    onChange={(e) => setMeterForm({ ...meterForm, meter_number: e.target.value })}
                    placeholder="e.g. MTR-98214"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Meter Type</label>
                  <select
                    value={meterForm.meter_type}
                    onChange={(e) => setMeterForm({ ...meterForm, meter_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Main">Main Meter</option>
                    <option value="Sub-meter">Sub-meter</option>
                    <option value="Generator">Generator</option>
                    <option value="POP/DC">POP / DC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={meterForm.status}
                    onChange={(e) => setMeterForm({ ...meterForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
                <input
                  type="text"
                  value={meterForm.location}
                  onChange={(e) => setMeterForm({ ...meterForm, location: e.target.value })}
                  placeholder="e.g. Ground floor panel board, front gate"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!editingMeter && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Baseline Reading (kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={meterForm.initial_reading}
                    onChange={(e) => setMeterForm({ ...meterForm, initial_reading: e.target.value })}
                    placeholder="e.g. 10250 (Units starting count)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Starting counter value when registering this meter.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMeterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : editingMeter ? 'Update Meter' : 'Register Meter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTER READING WITH PHOTO */}
      {showReadingModal && selectedMeterForReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enter Meter Reading</h3>
                <p className="text-xs text-slate-500">{selectedMeterForReading.name} ({selectedMeterForReading.meter_number})</p>
              </div>
              <button
                onClick={() => setShowReadingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveReading} className="mt-4 space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Previous Reading</span>
                  <span className="text-xl font-black text-indigo-950 font-mono">
                    {selectedMeterForReading.latest_reading?.current_reading !== undefined
                      ? Number(selectedMeterForReading.latest_reading.current_reading).toLocaleString()
                      : 'None (Initial Baseline)'}
                  </span>
                </div>
                {selectedMeterForReading.latest_reading?.reading_date && (
                  <span className="text-xs text-indigo-700 font-medium">
                    Date: {new Date(selectedMeterForReading.latest_reading.reading_date).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reading Date *</label>
                  <input
                    type="date"
                    value={readingForm.reading_date}
                    onChange={(e) => setReadingForm({ ...readingForm, reading_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Reading (kWh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={readingForm.current_reading}
                    onChange={(e) => setReadingForm({ ...readingForm, current_reading: e.target.value })}
                    placeholder="Enter counter value"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Automatic Units Preview Callout */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Calculated Consumption:</span>
                {liveCalculatedUnits === 'INVALID' ? (
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Less than previous reading!
                  </span>
                ) : (
                  <span className="text-base font-black text-emerald-600">
                    {liveCalculatedUnits !== null ? `${liveCalculatedUnits} Units` : '—'}
                  </span>
                )}
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meter Counter Photo (Recommended / Verification)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-3 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setReadingForm({ ...readingForm, image: e.target.files[0] });
                      }
                    }}
                    className="hidden"
                    id="reading-image-upload"
                  />
                  <label htmlFor="reading-image-upload" className="cursor-pointer flex flex-col items-center">
                    <Camera className="w-6 h-6 text-indigo-600 mb-1" />
                    <span className="text-xs font-medium text-slate-700">
                      {readingForm.image ? readingForm.image.name : 'Take photo or upload counter image'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG up to 10MB</span>
                  </label>
                </div>
              </div>

              {/* Reset/Replacement Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={readingForm.is_reset}
                    onChange={(e) => setReadingForm({ ...readingForm, is_reset: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  Meter was replaced or rolled over (Reset Baseline)
                </label>

                {readingForm.is_reset && (
                  <div className="mt-2 pl-6">
                    <input
                      type="text"
                      value={readingForm.reset_reason}
                      onChange={(e) => setReadingForm({ ...readingForm, reset_reason: e.target.value })}
                      placeholder="Reason for meter replacement / reset"
                      className="w-full px-3 py-1.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  value={readingForm.remarks}
                  onChange={(e) => setReadingForm({ ...readingForm, remarks: e.target.value })}
                  placeholder="Notes, meter observations, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReadingModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || liveCalculatedUnits === 'INVALID'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Recording...' : 'Submit Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: READING HISTORY */}
      {showHistoryModal && historyMeter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reading History Logs</h3>
                <p className="text-xs text-slate-500">{historyMeter.name} ({historyMeter.meter_number})</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Reading (kWh)</th>
                    <th className="py-2.5 px-3 text-right">Units Used</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-center">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meterReadings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No reading entries found.
                      </td>
                    </tr>
                  ) : (
                    meterReadings.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {new Date(r.reading_date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {Number(r.current_reading).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                          +{r.units_used}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.recorded_by_name || 'System'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r.image_url ? (
                            <button
                              onClick={() => setPreviewImage(r.image_url)}
                              className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 mt-4">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD / EDIT PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingPayment ? 'Edit Electricity Payment / Bill' : 'Record Electricity Bill & Payment'}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePayment} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Electricity Meter *</label>
                <select
                  value={paymentForm.meter_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, meter_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="">Select Meter</option>
                  {meters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.branch_name} — {m.name} ({m.meter_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Number</label>
                  <input
                    type="text"
                    value={paymentForm.bill_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bill_number: e.target.value })}
                    placeholder="e.g. NEA-49201"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    value={paymentForm.bill_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bill_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billed Units</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.billed_units}
                    onChange={(e) => {
                      const units = e.target.value;
                      const rate = paymentForm.rate_per_unit;
                      const calcAmt = units && rate ? String(parseFloat(units) * parseFloat(rate)) : paymentForm.bill_amount;
                      setPaymentForm({ ...paymentForm, billed_units: units, bill_amount: calcAmt });
                    }}
                    placeholder="Units"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rate / Unit (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.rate_per_unit}
                    onChange={(e) => {
                      const rate = e.target.value;
                      const units = paymentForm.billed_units;
                      const calcAmt = units && rate ? String(parseFloat(units) * parseFloat(rate)) : paymentForm.bill_amount;
                      setPaymentForm({ ...paymentForm, rate_per_unit: rate, bill_amount: calcAmt });
                    }}
                    placeholder="Rate"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Amount (Rs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.bill_amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bill_amount: e.target.value })}
                    placeholder="Amount"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paid Amount (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.paid_amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paid Units</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.paid_units}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paid_units: e.target.value })}
                    placeholder="Units cleared"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={paymentForm.due_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Online">Online / eSewa / Khalti</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Uploads */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bill Copy Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setPaymentForm({ ...paymentForm, bill_image: e.target.files[0] });
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Receipt / Slip</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setPaymentForm({ ...paymentForm, receipt_image: e.target.files[0] });
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : 'Save Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PHOTO PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Image Verification Preview
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center bg-slate-950/5 rounded-xl overflow-hidden max-h-[75vh]">
              <img src={previewImage} alt="Preview" className="max-h-[75vh] w-auto object-contain rounded-lg" />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open full size in new tab
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
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
