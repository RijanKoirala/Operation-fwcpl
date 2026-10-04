import React, { useState, useEffect, useMemo } from 'react';
import {
  Package2,
  Boxes,
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
  Layers,
  RefreshCw,
  FileSpreadsheet,
  Tag,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BranchAsset, AssetType, AssetSummary } from '../types';

export const Assets: React.FC = () => {
  const { user, hasPermission } = useAuth();

  // Role & Scope Detection
  const roleNameUpper = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleNameAlt = ((user as any)?.roleName || (user as any)?.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const deptUpper = ((user as any)?.departmentCode || (user as any)?.department_code || '').toUpperCase();
  const usernameLower = (user?.username || '').toLowerCase();

  const isSuperAdmin = roleNameUpper === 'SUPER_ADMIN' || roleNameAlt === 'SUPER_ADMIN' || usernameLower === 'superadmin';
  const hasViewAll = hasPermission('assets.view_all') || hasPermission('assets.all_branches.view');
  const isCentralUser =
    isSuperAdmin ||
    hasViewAll ||
    ((roleNameUpper === 'MANAGEMENT' || roleNameAlt === 'MANAGEMENT' || deptUpper === 'OPERATION' || deptUpper === 'OPS' || deptUpper === 'EXEC') &&
      (user?.allowedBranches === 'ALL' || user?.allowedBranches === '*'));

  const userBranchId = user?.branchId || (user as any)?.branch_id;
  const userBranchName = user?.branchName || (user as any)?.branch_name;

  // Permissions
  const canCreate = isSuperAdmin || hasPermission('assets.create') || hasPermission('assets');
  const canEdit = isSuperAdmin || hasPermission('assets.edit') || hasPermission('assets');
  const canDelete = isSuperAdmin || hasPermission('assets.delete');
  const canManageTypes = isSuperAdmin || hasPermission('assets.types.manage') || isCentralUser;

  // View Tabs: 'inventory' | 'matrix' | 'summary' | 'types'
  const [activeTab, setActiveTab] = useState<'inventory' | 'matrix' | 'summary' | 'types'>('inventory');

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<BranchAsset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [summary, setSummary] = useState<AssetSummary>({
    total_types: 0,
    total_quantity: 0,
    branches_with_assets: 0,
    most_common_asset: '—',
  });

  // Filter states
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(
    isCentralUser ? 'ALL' : userBranchId ? String(userBranchId) : 'ALL'
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated_at' | 'asset_name' | 'quantity' | 'branch_name'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<BranchAsset | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<BranchAsset | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<AssetType | null>(null);

  // Form states
  const [assetForm, setAssetForm] = useState({
    branch_id: isCentralUser ? '' : userBranchId ? String(userBranchId) : '',
    asset_type_id: '',
    quantity: 1,
    remarks: '',
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Branches (for central filter & add dropdowns)
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.branches.getAll();
        if (res.branches || Array.isArray(res)) {
          setBranches(res.branches || res);
        }
      } catch (err) {
        console.warn('Failed to load branches:', err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch Asset Types
  const fetchAssetTypes = async () => {
    try {
      const res = await api.assets.getTypes();
      if (res.success && res.types) {
        setAssetTypes(res.types);
      }
    } catch (err) {
      console.warn('Failed to load asset types:', err);
    }
  };

  // Fetch Assets & Summary
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const params: any = {};
      if (selectedBranchFilter !== 'ALL') {
        params.branch_id = selectedBranchFilter;
      }
      if (selectedTypeFilter !== 'ALL') {
        params.asset_type_id = selectedTypeFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [assetsRes, summaryRes] = await Promise.all([
        api.assets.getAll(params),
        api.assets.getSummary(),
      ]);

      if (assetsRes.success && assetsRes.assets) {
        setAssets(assetsRes.assets);
      }
      if (summaryRes.success && summaryRes.summary) {
        setSummary(summaryRes.summary);
      }
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setErrorMessage(err.message || 'Failed to fetch asset inventory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssetTypes();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBranchFilter, selectedTypeFilter]);

  // Flash message timer
  useEffect(() => {
    if (successMessage || errorMessage) {
      const t = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage, errorMessage]);

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    let list = [...assets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a =>
          a.asset_type_name.toLowerCase().includes(q) ||
          a.branch_name.toLowerCase().includes(q) ||
          (a.remarks && a.remarks.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let valA: any = a.updated_at;
      let valB: any = b.updated_at;
      if (sortBy === 'asset_name') {
        valA = a.asset_type_name.toLowerCase();
        valB = b.asset_type_name.toLowerCase();
      } else if (sortBy === 'branch_name') {
        valA = a.branch_name.toLowerCase();
        valB = b.branch_name.toLowerCase();
      } else if (sortBy === 'quantity') {
        valA = a.quantity;
        valB = b.quantity;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [assets, searchQuery, sortBy, sortOrder]);

  // Matrix calculation (Rows = Asset Types, Columns = Branches)
  const matrixData = useMemo(() => {
    const branchMap = new Map<number, { id: number; name: string }>();
    const typeTotals = new Map<string, { name: string; branchCounts: Record<number, number>; total: number }>();

    // Collect branches present
    assets.forEach(a => {
      if (!branchMap.has(a.branch_id)) {
        branchMap.set(a.branch_id, { id: a.branch_id, name: a.branch_name });
      }
      if (!typeTotals.has(a.asset_type_name)) {
        typeTotals.set(a.asset_type_name, {
          name: a.asset_type_name,
          branchCounts: {},
          total: 0,
        });
      }
      const entry = typeTotals.get(a.asset_type_name)!;
      entry.branchCounts[a.branch_id] = (entry.branchCounts[a.branch_id] || 0) + Number(a.quantity);
      entry.total += Number(a.quantity);
    });

    const activeBranchesList = Array.from(branchMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const matrixRows = Array.from(typeTotals.values()).sort((a, b) => b.total - a.total);

    return { activeBranchesList, matrixRows };
  }, [assets]);

  // Grouped quantities by asset type for Overall Summary tab
  const overallTypeSummary = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; branchCount: number }>();
    const branchPerType = new Map<string, Set<number>>();

    assets.forEach(a => {
      const cur = map.get(a.asset_type_name) || { name: a.asset_type_name, quantity: 0, branchCount: 0 };
      cur.quantity += Number(a.quantity);
      map.set(a.asset_type_name, cur);

      if (!branchPerType.has(a.asset_type_name)) {
        branchPerType.set(a.asset_type_name, new Set());
      }
      branchPerType.get(a.asset_type_name)!.add(a.branch_id);
    });

    return Array.from(map.entries())
      .map(([name, val]) => ({
        name,
        quantity: val.quantity,
        branchCount: branchPerType.get(name)?.size || 0,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [assets]);

  // Current branch view summary (when a single branch is selected)
  const singleBranchSummary = useMemo(() => {
    if (selectedBranchFilter === 'ALL') return null;
    const bId = Number(selectedBranchFilter);
    const branchAssets = assets.filter(a => a.branch_id === bId);
    const totalQty = branchAssets.reduce((s, a) => s + Number(a.quantity), 0);
    const branchName = branchAssets[0]?.branch_name || branches.find(b => b.id === bId)?.name || 'Selected Branch';
    return {
      branchName,
      assetTypesCount: branchAssets.length,
      totalQuantity: totalQty,
    };
  }, [assets, selectedBranchFilter, branches]);

  // Handlers: Add / Upsert Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMessage(null);

    const targetBranchId = isCentralUser ? Number(assetForm.branch_id) : Number(userBranchId);

    if (!targetBranchId) {
      setErrorMessage('Please select a valid branch.');
      setFormSubmitting(false);
      return;
    }
    if (!assetForm.asset_type_id) {
      setErrorMessage('Please select an asset type.');
      setFormSubmitting(false);
      return;
    }
    if (assetForm.quantity < 0) {
      setErrorMessage('Quantity cannot be negative.');
      setFormSubmitting(false);
      return;
    }

    try {
      const res = await api.assets.create({
        branch_id: targetBranchId,
        asset_type_id: Number(assetForm.asset_type_id),
        quantity: Number(assetForm.quantity),
        remarks: assetForm.remarks.trim() || undefined,
      });

      if (res.success) {
        setSuccessMessage('Asset record saved successfully.');
        setShowAddModal(false);
        setAssetForm({
          branch_id: isCentralUser ? '' : userBranchId ? String(userBranchId) : '',
          asset_type_id: '',
          quantity: 1,
          remarks: '',
        });
        fetchData();
      } else {
        setErrorMessage(res.message || 'Failed to save asset.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving asset.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers: Edit Asset
  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setFormSubmitting(true);
    setErrorMessage(null);

    if (editingAsset.quantity < 0) {
      setErrorMessage('Quantity cannot be negative.');
      setFormSubmitting(false);
      return;
    }

    try {
      const res = await api.assets.update(editingAsset.id, {
        quantity: Number(editingAsset.quantity),
        remarks: editingAsset.remarks || undefined,
      });

      if (res.success) {
        setSuccessMessage('Asset record updated.');
        setShowEditModal(false);
        setEditingAsset(null);
        fetchData();
      } else {
        setErrorMessage(res.message || 'Failed to update asset.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating asset.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers: Delete Asset
  const handleDeleteAsset = async () => {
    if (!deletingAsset) return;
    setFormSubmitting(true);
    try {
      const res = await api.assets.delete(deletingAsset.id);
      if (res.success) {
        setSuccessMessage('Asset record deleted.');
        setShowDeleteModal(false);
        setDeletingAsset(null);
        fetchData();
      } else {
        setErrorMessage(res.message || 'Failed to delete asset.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deleting asset.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers: Create Asset Type
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) {
      setErrorMessage('Asset type name is required.');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await api.assets.createType({
        name: typeForm.name.trim(),
        description: typeForm.description.trim() || undefined,
      });
      if (res.success) {
        setSuccessMessage(`Asset type "${res.type.name}" created.`);
        setShowTypeModal(false);
        setTypeForm({ name: '', description: '' });
        fetchAssetTypes();
      } else {
        setErrorMessage(res.message || 'Failed to create asset type.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating asset type.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // CSV Export Download
  const handleExportCsv = () => {
    const params: any = {};
    if (selectedBranchFilter !== 'ALL') params.branch_id = selectedBranchFilter;
    const url = api.assets.exportCsvUrl(params);
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Package2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Branch Assets</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Operational inventory of equipment, tools, and office assets per branch
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              fetchData();
              fetchAssetTypes();
            }}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {canManageTypes && (
            <button
              onClick={() => {
                setTypeForm({ name: '', description: '' });
                setShowTypeModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <Tag className="w-4 h-4" />
              <span>+ Asset Type</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => {
                setAssetForm({
                  branch_id: isCentralUser ? '' : userBranchId ? String(userBranchId) : '',
                  asset_type_id: '',
                  quantity: 1,
                  remarks: '',
                });
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between text-sm shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-sm shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Types</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {singleBranchSummary ? singleBranchSummary.assetTypesCount : summary.total_types}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {singleBranchSummary ? `Recorded in ${singleBranchSummary.branchName}` : 'Catalog categories recorded'}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quantity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Package2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">
            {singleBranchSummary ? singleBranchSummary.totalQuantity : summary.total_quantity}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {singleBranchSummary ? `Total units in ${singleBranchSummary.branchName}` : 'Total operational units across branches'}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branches</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {singleBranchSummary ? '1' : summary.branches_with_assets}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {singleBranchSummary ? singleBranchSummary.branchName : 'Active branches with logged inventory'}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Most Common Asset</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2 truncate" title={summary.most_common_asset}>
            {summary.most_common_asset || '—'}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Highest quantity in system</span>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package2 className="w-4 h-4" />
              <span>Branch Inventory</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'inventory' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {filteredAssets.length}
              </span>
            </button>

            {isCentralUser && (
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                  activeTab === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Branch-wise Matrix</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overall Summary</span>
            </button>

            {canManageTypes && (
              <button
                onClick={() => setActiveTab('types')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                  activeTab === 'types'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>Asset Types ({assetTypes.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets, branches, remarks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Branch filter (locked for branch users) */}
          <div className="sm:col-span-3">
            {isCentralUser ? (
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={selectedBranchFilter}
                  onChange={e => setSelectedBranchFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 appearance-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="truncate">{userBranchName || 'My Branch'}</span>
              </div>
            )}
          </div>

          {/* Asset Type filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <Boxes className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 appearance-none transition-all cursor-pointer"
              >
                <option value="ALL">All Asset Types</option>
                {assetTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Tab */}

      {/* 1. INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading asset inventory...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Package2 className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-slate-700">No Assets Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No asset inventory records matched your selected branch, type, or search query.
              </p>
              {canCreate && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 mt-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Asset</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <tr>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => {
                        if (sortBy === 'branch_name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortBy('branch_name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Branch</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => {
                        if (sortBy === 'asset_name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortBy('asset_name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Asset Type</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => {
                        if (sortBy === 'quantity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortBy('quantity');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Quantity</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3.5">Remarks</th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => {
                        if (sortBy === 'updated_at') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortBy('updated_at');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Last Updated</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    {(canEdit || canDelete) && <th className="px-4 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map(asset => {
                    const isMyBranch = Number(userBranchId) === Number(asset.branch_id);
                    const userCanEdit = isCentralUser || (canEdit && isMyBranch);
                    const userCanDelete = isCentralUser || (canDelete && isMyBranch);

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Branch */}
                        <td className="px-4 py-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{asset.branch_name}</span>
                            {asset.branch_code && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {asset.branch_code}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Asset Type */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <span className="font-medium text-slate-800">{asset.asset_type_name}</span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            {asset.quantity} units
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate" title={asset.remarks || ''}>
                          {asset.remarks ? asset.remarks : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Last Updated */}
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          <div>{new Date(asset.updated_at).toLocaleDateString()}</div>
                          {asset.updated_by_name && (
                            <span className="text-[11px] text-slate-400">by {asset.updated_by_name}</span>
                          )}
                        </td>

                        {/* Actions */}
                        {(canEdit || canDelete) && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              {userCanEdit && (
                                <button
                                  onClick={() => {
                                    setEditingAsset({ ...asset });
                                    setShowEditModal(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Edit Quantity / Remarks"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {userCanDelete && (
                                <button
                                  onClick={() => {
                                    setDeletingAsset(asset);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Asset Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. BRANCH-WISE MATRIX TAB (Pivot table: Asset x Branch) */}
      {activeTab === 'matrix' && isCentralUser && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Branch-wise Asset Matrix</h3>
              <p className="text-xs text-slate-500">
                Cross-comparison of asset distribution across all active company branches
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold sticky top-0">
                <tr>
                  <th className="px-4 py-3 bg-slate-50 border-r border-slate-200 sticky left-0 z-10 min-w-[160px]">
                    Asset
                  </th>
                  {matrixData.activeBranchesList.map(b => (
                    <th key={b.id} className="px-3 py-3 text-center min-w-[100px] border-r border-slate-200/60">
                      {b.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right bg-indigo-50/70 text-indigo-900 font-extrabold min-w-[90px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.matrixRows.map(row => (
                  <tr key={row.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-900 bg-white border-r border-slate-200 sticky left-0 z-10">
                      {row.name}
                    </td>
                    {matrixData.activeBranchesList.map(b => {
                      const count = row.branchCounts[b.id] || 0;
                      return (
                        <td key={b.id} className="px-3 py-2.5 text-center border-r border-slate-100 font-medium">
                          {count > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50/70 text-indigo-700 font-bold">
                              {count}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right font-extrabold text-indigo-600 bg-indigo-50/30">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. OVERALL SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Total Asset Quantities</h3>
              <p className="text-xs text-slate-500">
                Aggregated equipment totals calculated live from branch-level inventory
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Total Assets: <span className="text-indigo-600 font-extrabold">{summary.total_quantity}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {overallTypeSummary.map(item => (
              <div
                key={item.name}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs hover:border-indigo-200 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 truncate max-w-[160px]" title={item.name}>
                    {item.name}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    in {item.branchCount} {item.branchCount === 1 ? 'branch' : 'branches'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-indigo-600 block">{item.quantity}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ASSET TYPES MANAGEMENT TAB */}
      {activeTab === 'types' && canManageTypes && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Global Asset Types Catalog</h3>
              <p className="text-xs text-slate-500">
                Central predefined catalog of assets that branches can select and record
              </p>
            </div>
            <button
              onClick={() => {
                setTypeForm({ name: '', description: '' });
                setShowTypeModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Type</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {assetTypes.map(type => (
              <div
                key={type.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between hover:border-indigo-200 transition-colors"
              >
                <div className="truncate pr-2">
                  <span className="text-xs font-semibold text-slate-900 block truncate" title={type.name}>
                    {type.name}
                  </span>
                  {type.description && (
                    <span className="text-[11px] text-slate-400 truncate block" title={type.description}>
                      {type.description}
                    </span>
                  )}
                </div>
                <div className="shrink-0">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD ASSET */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Package2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">Add Asset to Branch</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4">
              {/* Branch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch *</label>
                {isCentralUser ? (
                  <select
                    required
                    value={assetForm.branch_id}
                    onChange={e => setAssetForm({ ...assetForm, branch_id: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={userBranchName || 'My Branch'}
                    className="w-full text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-600 cursor-not-allowed"
                  />
                )}
              </div>

              {/* Asset Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset Type *</label>
                <select
                  required
                  value={assetForm.asset_type_id}
                  onChange={e => setAssetForm({ ...assetForm, asset_type_id: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="">-- Select Asset Type --</option>
                  {assetTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select from existing standard asset types.
                </span>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={assetForm.quantity}
                  onChange={e => setAssetForm({ ...assetForm, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be zero or greater. If asset already exists in branch, quantity will be updated.
                </span>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={assetForm.remarks}
                  onChange={e => setAssetForm({ ...assetForm, remarks: e.target.value })}
                  placeholder="e.g. 1 in maintenance, 2 in active field use..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ASSET */}
      {showEditModal && editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">Edit Asset Quantity</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAsset} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Branch</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingAsset.branch_name}
                  className="w-full text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Asset Type</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingAsset.asset_type_name}
                  className="w-full text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingAsset.quantity}
                  onChange={e =>
                    setEditingAsset({
                      ...editingAsset,
                      quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={editingAsset.remarks || ''}
                  onChange={e => setEditingAsset({ ...editingAsset, remarks: e.target.value })}
                  placeholder="e.g. condition, status..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Updating...' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ASSET CONFIRMATION */}
      {showDeleteModal && deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete Asset Record?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong>{deletingAsset.asset_type_name}</strong> ({deletingAsset.quantity} units) from <strong>{deletingAsset.branch_name}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                This will only remove the branch record. The global "{deletingAsset.asset_type_name}" category will remain untouched.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAsset}
                disabled={formSubmitting}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {formSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ASSET TYPE */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">Add New Asset Type</h3>
              </div>
              <button
                onClick={() => setShowTypeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Air Compressor, Power Drill..."
                  value={typeForm.name}
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description or category note..."
                  value={typeForm.description}
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Create Asset Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
