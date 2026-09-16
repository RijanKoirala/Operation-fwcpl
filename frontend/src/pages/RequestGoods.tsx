import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  Boxes,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  Send,
  Check,
  X,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Truck,
  ShieldCheck,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  History,
  XCircle,
  Sliders,
  CheckSquare,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import {
  GoodsItem,
  GoodsRequest,
  GoodsRequestItem,
  GoodsRequestHistory,
  GoodsRequestStats,
  GoodsRequestStatus,
  GoodsRequestPriority,
  Branch,
} from '../types';

interface RequestGoodsProps {
  initialFilter?: string;
  onNavigate?: (path: string) => void;
}

export const RequestGoods: React.FC<RequestGoodsProps> = ({
  initialFilter,
  onNavigate,
}) => {
  const { user, hasPermission } = useAuth();

  // Reference data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [goodsCatalog, setGoodsCatalog] = useState<GoodsItem[]>([]);

  // Requests state
  const [requests, setRequests] = useState<GoodsRequest[]>([]);
  const [stats, setStats] = useState<GoodsRequestStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTabFilter, setActiveTabFilter] = useState<string>(initialFilter || 'ALL');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<GoodsRequest | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Operation Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<GoodsRequest | null>(null);
  const [reviewItemDecisions, setReviewItemDecisions] = useState<
    { itemId: number; approvedQuantity: number; operationRemark: string }[]
  >([]);
  const [reviewApprovalRemarks, setReviewApprovalRemarks] = useState('');
  const [reviewDenialReason, setReviewDenialReason] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Fulfillment / Dispatch Modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchingRequest, setDispatchingRequest] = useState<GoodsRequest | null>(null);
  const [deliveredItems, setDeliveredItems] = useState<{ itemId: number; deliveredQuantity: number }[]>([]);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [savingDispatch, setSavingDispatch] = useState(false);

  // Cancel Request Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetRequest, setCancelTargetRequest] = useState<GoodsRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);

  // Goods Catalog Management Modal / View
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingGoodsItem, setEditingGoodsItem] = useState<GoodsItem | null>(null);
  const [showAddGoodsItemModal, setShowAddGoodsItemModal] = useState(false);
  const [itemFormName, setItemFormName] = useState('');
  const [itemFormCategory, setItemFormCategory] = useState('Fiber');
  const [itemFormDescription, setItemFormDescription] = useState('');
  const [itemFormUnit, setItemFormUnit] = useState('KM');
  const [itemFormQuantityType, setItemFormQuantityType] = useState<'Integer' | 'Decimal'>('Decimal');
  const [savingGoodsItem, setSavingGoodsItem] = useState(false);

  // New Request Form State
  const [formBranchId, setFormBranchId] = useState<number>(user?.branchId || 1);
  const [formPriority, setFormPriority] = useState<GoodsRequestPriority>('Normal');
  const [formRequiredBy, setFormRequiredBy] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formItems, setFormItems] = useState<
    { goodsItemId: number; requestedQuantity: string; itemDescription: string }[]
  >([]);
  const [savingRequest, setSavingRequest] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isSuper = user?.role === 'SUPER_ADMIN' || user?.roleName === 'Super Admin';
  const isOperation = isSuper || user?.departmentName === 'OPERATION' || user?.departmentCode === 'OPERATION';
  const canReview = isOperation || hasPermission('goods_requests.accept') || hasPermission('goods_requests.partial_accept');
  const canComplete = isOperation || hasPermission('goods_requests.complete');
  const canManageGoods = isSuper || hasPermission('goods_items.create') || hasPermission('goods_items.edit');

  // Initial load
  useEffect(() => {
    loadReferenceData();
    loadStats();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [activeTabFilter, branchFilter, priorityFilter, startDate, endDate]);

  const loadReferenceData = async () => {
    try {
      const [branchesRes, catalogRes] = await Promise.all([
        api.branches.getAll().catch(() => ({ branches: [] })),
        api.goodsItems.getAll().catch(() => ({ goodsItems: [] })),
      ]);

      setBranches(branchesRes.branches || []);
      setGoodsCatalog(catalogRes.goodsItems || []);

      if (user?.branchId) {
        setFormBranchId(user.branchId);
      } else if (branchesRes.branches && branchesRes.branches.length > 0) {
        setFormBranchId(branchesRes.branches[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load reference data:', err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.goodsRequests.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch {}
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };

      if (activeTabFilter === 'PENDING') params.status = 'PENDING';
      else if (activeTabFilter === 'URGENT') {
        params.status = 'PENDING';
        params.priority = 'Urgent';
      } else if (activeTabFilter === 'ACCEPTED') params.status = 'ACCEPTED';
      else if (activeTabFilter === 'PARTIALLY_ACCEPTED') params.status = 'PARTIALLY ACCEPTED';
      else if (activeTabFilter === 'AWAITING_FULFILLMENT') params.status = 'AWAITING_FULFILLMENT';
      else if (activeTabFilter === 'COMPLETED') params.status = 'COMPLETED';
      else if (activeTabFilter === 'DENIED') params.status = 'DENIED';

      if (search) params.search = search;
      if (branchFilter) params.branchId = branchFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.goodsRequests.getAll(params);
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load requisitions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // NEW REQUEST MODAL LOGIC
  // -------------------------------------------------------------
  const handleOpenNewRequest = () => {
    setFormBranchId(user?.branchId || (branches.length > 0 ? branches[0].id : 1));
    setFormPriority('Normal');
    setFormRequiredBy('');
    setFormRemarks('');
    setFormError(null);

    // Seed with 1 initial empty row if catalog available
    if (goodsCatalog.length > 0) {
      setFormItems([
        {
          goodsItemId: goodsCatalog[0].id,
          requestedQuantity: '',
          itemDescription: '',
        },
      ]);
    } else {
      setFormItems([]);
    }

    setShowNewRequestModal(true);
  };

  const handleAddItemRow = () => {
    if (goodsCatalog.length === 0) return;
    setFormItems(prev => [
      ...prev,
      {
        goodsItemId: goodsCatalog[0].id,
        requestedQuantity: '',
        itemDescription: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveRequest = async (submitStatus: 'DRAFT' | 'PENDING') => {
    if (formItems.length === 0) {
      setFormError('Please add at least one goods item to request.');
      return;
    }

    // Client-side validation
    for (let i = 0; i < formItems.length; i++) {
      const row = formItems[i];
      const catalogItem = goodsCatalog.find(g => g.id === Number(row.goodsItemId));
      if (!catalogItem) {
        setFormError(`Row #${i + 1}: Please select a valid goods item.`);
        return;
      }

      const qty = parseFloat(row.requestedQuantity);
      if (isNaN(qty) || qty <= 0) {
        setFormError(`Row #${i + 1} (${catalogItem.name}): Enter a valid quantity greater than 0.`);
        return;
      }

      if (catalogItem.quantity_type === 'Integer' && !Number.isInteger(qty)) {
        setFormError(
          `Row #${i + 1} (${catalogItem.name}): Quantity must be an integer (${catalogItem.unit}). Decimals like ${qty} are not allowed.`
        );
        return;
      }
    }

    try {
      setSavingRequest(true);
      setFormError(null);

      const payload = {
        branchId: formBranchId,
        priority: formPriority,
        requiredBy: formRequiredBy || undefined,
        remarks: formRemarks.trim() || undefined,
        status: submitStatus,
        items: formItems.map(row => ({
          goodsItemId: Number(row.goodsItemId),
          requestedQuantity: parseFloat(row.requestedQuantity),
          itemDescription: row.itemDescription?.trim() || undefined,
        })),
      };

      await api.goodsRequests.create(payload);
      showToast(
        submitStatus === 'DRAFT'
          ? 'Draft requisition saved successfully.'
          : 'Goods requisition submitted to Operation successfully.',
        'success'
      );
      setShowNewRequestModal(false);
      loadRequests();
      loadStats();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit requisition.');
    } finally {
      setSavingRequest(false);
    }
  };

  // -------------------------------------------------------------
  // DETAILS & TIMELINE MODAL
  // -------------------------------------------------------------
  const handleOpenDetail = async (req: GoodsRequest) => {
    try {
      setLoadingDetail(true);
      setSelectedRequest(null);
      setShowDetailModal(true);

      const res = await api.goodsRequests.getById(req.id);
      if (res.success) {
        setSelectedRequest({
          ...res.request,
          items: res.items,
          history: res.history,
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load request details.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // -------------------------------------------------------------
  // OPERATION REVIEW (ACCEPT / PARTIAL / DENY)
  // -------------------------------------------------------------
  const handleOpenReview = async (req: GoodsRequest) => {
    try {
      setReviewingRequest(null);
      setReviewApprovalRemarks('');
      setReviewDenialReason('');

      const res = await api.goodsRequests.getById(req.id);
      if (res.success) {
        setReviewingRequest(res.request);
        // Prepopulate items with full requested qty
        setReviewItemDecisions(
          res.items.map((it: GoodsRequestItem) => ({
            itemId: it.id,
            approvedQuantity: it.approved_quantity !== null && it.approved_quantity !== undefined ? it.approved_quantity : it.requested_quantity,
            operationRemark: it.operation_remark || '',
          }))
        );
        setShowReviewModal(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to open approval screen.', 'error');
    }
  };

  const handleReviewDecision = async (action: 'ACCEPT_ALL' | 'PARTIAL_ACCEPT' | 'DENY') => {
    if (!reviewingRequest) return;

    if (action === 'DENY' && !reviewDenialReason.trim()) {
      showToast('Please provide a reason for denying this requisition.', 'error');
      return;
    }

    try {
      setSavingReview(true);
      const payload: any = {
        action,
        approvalRemarks: reviewApprovalRemarks.trim() || undefined,
        denialReason: reviewDenialReason.trim() || undefined,
        itemDecisions: reviewItemDecisions,
      };

      const res = await api.goodsRequests.review(reviewingRequest.id, payload);
      showToast(res.message || 'Requisition reviewed successfully.', 'success');
      setShowReviewModal(false);
      loadRequests();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      setSavingReview(false);
    }
  };

  // -------------------------------------------------------------
  // FULFILLMENT / DISPATCH MODAL
  // -------------------------------------------------------------
  const handleOpenDispatch = async (req: GoodsRequest) => {
    try {
      setDispatchingRequest(null);
      setCompletionRemarks('');

      const res = await api.goodsRequests.getById(req.id);
      if (res.success) {
        setDispatchingRequest({
          ...res.request,
          items: res.items,
        });
        setDeliveredItems(
          res.items.map((it: GoodsRequestItem) => ({
            itemId: it.id,
            deliveredQuantity: it.approved_quantity !== null && it.approved_quantity !== undefined ? it.approved_quantity : it.requested_quantity,
          }))
        );
        setShowDispatchModal(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to open dispatch modal.', 'error');
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchingRequest) return;

    try {
      setSavingDispatch(true);
      const payload = {
        deliveredItems,
        completionRemarks: completionRemarks.trim() || undefined,
      };

      await api.goodsRequests.dispatch(dispatchingRequest.id, payload);
      showToast('Requisition fulfilled and completed successfully.', 'success');
      setShowDispatchModal(false);
      loadRequests();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to record fulfillment.', 'error');
    } finally {
      setSavingDispatch(false);
    }
  };

  // -------------------------------------------------------------
  // CANCEL REQUEST
  // -------------------------------------------------------------
  const handleOpenCancel = (req: GoodsRequest) => {
    setCancelTargetRequest(req);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetRequest) return;
    try {
      setSavingCancel(true);
      await api.goodsRequests.cancel(cancelTargetRequest.id, cancelReason.trim());
      showToast('Requisition cancelled successfully.', 'success');
      setShowCancelModal(false);
      loadRequests();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel requisition.', 'error');
    } finally {
      setSavingCancel(false);
    }
  };

  // -------------------------------------------------------------
  // GOODS ITEMS CATALOG MANAGEMENT
  // -------------------------------------------------------------
  const handleOpenCreateGoodsItem = () => {
    setEditingGoodsItem(null);
    setItemFormName('');
    setItemFormCategory('Fiber');
    setItemFormDescription('');
    setItemFormUnit('KM');
    setItemFormQuantityType('Decimal');
    setShowAddGoodsItemModal(true);
  };

  const handleOpenEditGoodsItem = (item: GoodsItem) => {
    setEditingGoodsItem(item);
    setItemFormName(item.name);
    setItemFormCategory(item.category);
    setItemFormDescription(item.description || '');
    setItemFormUnit(item.unit);
    setItemFormQuantityType(item.quantity_type);
    setShowAddGoodsItemModal(true);
  };

  const handleSaveGoodsItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormName.trim() || !itemFormUnit.trim()) {
      showToast('Item Name and Unit are required.', 'error');
      return;
    }

    try {
      setSavingGoodsItem(true);
      const payload = {
        name: itemFormName.trim(),
        category: itemFormCategory,
        description: itemFormDescription.trim() || undefined,
        unit: itemFormUnit.trim(),
        quantityType: itemFormQuantityType,
      };

      if (editingGoodsItem) {
        await api.goodsItems.update(editingGoodsItem.id, payload);
        showToast(`Goods item "${itemFormName}" updated.`, 'success');
      } else {
        await api.goodsItems.create(payload);
        showToast(`Goods item "${itemFormName}" added to catalog.`, 'success');
      }

      setShowAddGoodsItemModal(false);
      loadReferenceData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save goods item.', 'error');
    } finally {
      setSavingGoodsItem(false);
    }
  };

  const handleToggleGoodsItemStatus = async (item: GoodsItem) => {
    const nextActive = !Boolean(item.active);
    try {
      await api.goodsItems.toggleStatus(item.id, nextActive);
      showToast(`Item "${item.name}" marked ${nextActive ? 'Active' : 'Inactive'}.`, 'success');
      loadReferenceData();
    } catch (err: any) {
      showToast(err.message || 'Failed to change item status.', 'error');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: GoodsRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>PENDING</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ACCEPTED</span>
          </span>
        );
      case 'PARTIALLY ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Sliders className="w-3 h-3 text-blue-600" />
            <span>PARTIALLY ACCEPTED</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <Truck className="w-3 h-3 text-purple-600" />
            <span>COMPLETED</span>
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>DENIED</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>DRAFT</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-400 border border-slate-200 line-through">
            <span>CANCELLED</span>
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  // Priority Badge Helper
  const renderPriorityBadge = (priority: GoodsRequestPriority) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            Critical
          </span>
        );
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
            Normal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all transform duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Request Goods & Requisitions</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isOperation
                  ? 'Central Operations Requisitions Review, Multi-Stage Approvals & Dispatch Fulfillment'
                  : 'Branch Material Requisitions, Inventory Dispatch & Status Tracking'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManageGoods && (
            <button
              onClick={() => setShowCatalogModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <Boxes className="w-4 h-4" />
              <span>Goods Items ({goodsCatalog.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              loadRequests();
              loadStats();
              showToast('Requisitions refreshed.', 'info');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>

          {hasPermission('goods_requests.create') && (
            <button
              onClick={handleOpenNewRequest}
              className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          onClick={() => setActiveTabFilter('PENDING')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'PENDING'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'PENDING' ? 'text-amber-100' : 'text-slate-400'}`}>
            Pending Review
          </span>
          <span className="text-xl font-black">{stats?.pendingCount || 0}</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('URGENT')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'URGENT'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'URGENT' ? 'text-rose-100' : 'text-slate-400'}`}>
            Urgent Requests
          </span>
          <span className="text-xl font-black">{stats?.urgentCount || 0}</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('ACCEPTED')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'ACCEPTED'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'ACCEPTED' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Fully Accepted
          </span>
          <span className="text-xl font-black">{stats?.acceptedCount || 0}</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('PARTIALLY_ACCEPTED')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'PARTIALLY_ACCEPTED'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'PARTIALLY_ACCEPTED' ? 'text-blue-100' : 'text-slate-400'}`}>
            Partial Accepted
          </span>
          <span className="text-xl font-black">{stats?.partiallyAcceptedCount || 0}</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('AWAITING_FULFILLMENT')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'AWAITING_FULFILLMENT'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'AWAITING_FULFILLMENT' ? 'text-indigo-100' : 'text-slate-400'}`}>
            Awaiting Dispatch
          </span>
          <span className="text-xl font-black">{stats?.awaitingFulfillmentCount || 0}</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('COMPLETED')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'COMPLETED'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'COMPLETED' ? 'text-purple-100' : 'text-slate-400'}`}>
            Completed
          </span>
          <span className="text-xl font-black">{stats?.completedCount || 0}</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTabFilter === 'ALL'
              ? 'bg-slate-800 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
          }`}
        >
          <span className={`text-[10px] font-black uppercase tracking-wider block ${activeTabFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
            All Requests
          </span>
          <span className="text-xl font-black">{stats?.totalCount || 0}</span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search request number, branch, requester, remarks, or items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadRequests()}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Branch Selector for Operation/Super Admin */}
        {isOperation && (
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        )}

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="Normal">Normal</option>
          <option value="Urgent">Urgent</option>
          <option value="Critical">Critical</option>
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          title="From Date"
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer"
        />

        <button
          onClick={loadRequests}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
        >
          Filter
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Request No.</th>
                {isOperation && <th className="py-3.5 px-4">Branch</th>}
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Requested Items</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Requested By</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading goods requisitions...</span>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <PackageCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No goods requisitions found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeTabFilter !== 'ALL'
                        ? 'Try clearing filters to see all requests.'
                        : 'Click "+ New Request" to create your first goods requisition.'}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const isPending = req.status === 'PENDING';
                  const isApproved = req.status === 'ACCEPTED' || req.status === 'PARTIALLY ACCEPTED';
                  const isDraft = req.status === 'DRAFT';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Request Number */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenDetail(req)}
                          className="font-mono font-black text-indigo-600 hover:text-indigo-800 hover:underline block cursor-pointer"
                        >
                          {req.request_number}
                        </button>
                        {req.required_by && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Required by: {req.required_by}
                          </span>
                        )}
                      </td>

                      {/* Branch (if operation) */}
                      {isOperation && (
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{req.branch_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{req.branch_code}</span>
                        </td>
                      )}

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Requested Items Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-slate-800 block">
                          {req.items_count} item{Number(req.items_count) > 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1 block" title={req.items_preview}>
                          {req.items_preview || '—'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">{renderPriorityBadge(req.priority)}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{renderStatusBadge(req.status)}</td>

                      {/* Requested By */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{req.requested_by_name || 'Staff'}</span>
                        <span className="text-[10px] font-mono text-slate-400">@{req.requested_by_username}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetail(req)}
                            title="View Requisition Details & Timeline"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Operation: Review & Approve */}
                          {canReview && isPending && (
                            <button
                              onClick={() => handleOpenReview(req)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          )}

                          {/* Operation: Dispatch / Fulfill */}
                          {canComplete && isApproved && (
                            <button
                              onClick={() => handleOpenDispatch(req)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Fulfill</span>
                            </button>
                          )}

                          {/* Requester: Cancel */}
                          {(isDraft || isPending) && (
                            <button
                              onClick={() => handleOpenCancel(req)}
                              title="Cancel Requisition"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
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

      {/* ========================================================= */}
      {/* MODAL 1: + NEW REQUEST FORM                               */}
      {/* ========================================================= */}
      <Modal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        title="New Goods Requisition"
        subtitle="Select required inventory items, specify quantities and purpose, and submit to Central Operation."
        maxWidth="3xl"
      >
        <div className="space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Request Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            {/* Branch (locked for branch user, selectable for Operation/SuperAdmin) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Branch <span className="text-rose-500">*</span>
              </label>
              {isOperation ? (
                <select
                  value={formBranchId}
                  onChange={e => setFormBranchId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800">
                  {branches.find(b => b.id === formBranchId)?.name || user?.branchName || 'Assigned Branch'}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={formPriority}
                onChange={e => setFormPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold cursor-pointer"
              >
                <option value="Normal">Normal (Standard inventory restocking)</option>
                <option value="Urgent">Urgent (Customer deployment blocked)</option>
                <option value="Critical">Critical (Network outage / zero stock)</option>
              </select>
            </div>

            {/* Required By Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Required By (Optional)</label>
              <input
                type="date"
                value={formRequiredBy}
                onChange={e => setFormRequiredBy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          {/* Requested Items Dynamic Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                Requested Items ({formItems.length})
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {formItems.map((row, index) => {
                const catalogItem = goodsCatalog.find(g => g.id === Number(row.goodsItemId));
                const isDecimal = catalogItem?.quantity_type === 'Decimal';

                return (
                  <div
                    key={index}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase">Item #{index + 1}</span>
                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Goods item select */}
                      <div className="md:col-span-6">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Item Name</label>
                        <select
                          value={row.goodsItemId}
                          onChange={e => handleItemChange(index, 'goodsItemId', parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold cursor-pointer"
                        >
                          {goodsCatalog.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name} — [{g.category} / {g.unit}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity input */}
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Quantity ({catalogItem?.unit || 'Unit'})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step={isDecimal ? '0.01' : '1'}
                            min="0.01"
                            placeholder={isDecimal ? 'e.g. 2.5' : 'e.g. 10'}
                            value={row.requestedQuantity}
                            onChange={e => handleItemChange(index, 'requestedQuantity', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                            {catalogItem?.unit}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {isDecimal ? 'Supports decimals (e.g. 0.5, 1.25)' : 'Whole numbers only'}
                        </span>
                      </div>

                      {/* Unit snapshot preview */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Unit</label>
                        <div className="px-3 py-2 text-xs rounded-xl bg-slate-100 font-bold text-slate-700 text-center">
                          {catalogItem?.unit || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Item Description */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Item Description / Justification (Visible to Operation)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Required for new FTTH rollout in area, customer installation, or backup"
                        value={row.itemDescription}
                        onChange={e => handleItemChange(index, 'itemDescription', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Overall Request Remarks</label>
            <textarea
              rows={2}
              value={formRemarks}
              onChange={e => setFormRemarks(e.target.value)}
              placeholder="Any specific delivery instructions or dispatch preferences..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNewRequestModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingRequest}
                onClick={() => handleSaveRequest('DRAFT')}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={savingRequest}
                onClick={() => handleSaveRequest('PENDING')}
                className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {savingRequest && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <Send className="w-3.5 h-3.5" />
                <span>Submit Requisition</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: OPERATION APPROVAL / REVIEW SCREEN              */}
      {/* ========================================================= */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Review Requisition: ${reviewingRequest?.request_number}`}
        subtitle="Review requested quantities. Operation can Accept in Full, Partially Approve per item, or Deny."
        maxWidth="4xl"
      >
        {reviewingRequest && (
          <div className="space-y-5">
            {/* Meta summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requisition</span>
                <h3 className="font-mono font-black text-indigo-600 text-sm">{reviewingRequest.request_number}</h3>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch</span>
                <span className="font-extrabold text-slate-900 text-xs">{reviewingRequest.branch_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested By</span>
                <span className="font-bold text-slate-800 text-xs">{reviewingRequest.requested_by_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                {renderPriorityBadge(reviewingRequest.priority)}
              </div>
              {reviewingRequest.remarks && (
                <div className="w-full pt-2 border-t border-slate-200/60 text-xs text-slate-600 italic">
                  "{reviewingRequest.remarks}"
                </div>
              )}
            </div>

            {/* Item Decision Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Item Name & Description</th>
                    <th className="py-2.5 px-3 text-right">Requested</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center w-40">Approved Qty</th>
                    <th className="py-2.5 px-3 text-center">Decision</th>
                    <th className="py-2.5 px-3">Operation Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviewItemDecisions.map((dec, i) => {
                    const originalItem = (reviewingRequest.items || [])[i];
                    if (!originalItem) return null;

                    const reqQty = Number(originalItem.requested_quantity);
                    const appQty = Number(dec.approvedQuantity);
                    const isDecimal = originalItem.quantity_type_snapshot === 'Decimal';

                    let decisionBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Accepted
                      </span>
                    );
                    if (appQty === 0) {
                      decisionBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Denied
                        </span>
                      );
                    } else if (appQty < reqQty) {
                      decisionBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          Partial
                        </span>
                      );
                    }

                    return (
                      <tr key={dec.itemId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{originalItem.item_name_snapshot}</span>
                          {originalItem.item_description && (
                            <span className="text-[11px] text-slate-500 block italic">
                              "{originalItem.item_description}"
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-black text-slate-800">{reqQty}</td>

                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                          {originalItem.unit_snapshot}
                        </td>

                        {/* Approved Quantity Input */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            step={isDecimal ? '0.01' : '1'}
                            min="0"
                            max={reqQty}
                            value={dec.approvedQuantity}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setReviewItemDecisions(prev => {
                                const next = [...prev];
                                next[i].approvedQuantity = Math.min(val, reqQty);
                                return next;
                              });
                            }}
                            className="w-28 px-2.5 py-1 text-xs font-black text-center rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">{decisionBadge}</td>

                        {/* Operation remark */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Optional remark..."
                            value={dec.operationRemark}
                            onChange={e => {
                              const text = e.target.value;
                              setReviewItemDecisions(prev => {
                                const next = [...prev];
                                next[i].operationRemark = text;
                                return next;
                              });
                            }}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Denial Reason Box (if denying) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Denial Reason (Required ONLY if completely denying request)
              </label>
              <input
                type="text"
                placeholder="e.g. Insufficient warehouse stock available; alternative model allocated..."
                value={reviewDenialReason}
                onChange={e => setReviewDenialReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Approval Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operation Approval Remarks</label>
              <textarea
                rows={2}
                value={reviewApprovalRemarks}
                onChange={e => setReviewApprovalRemarks(e.target.value)}
                placeholder="Instructions for dispatch / dispatch warehouse / delivery vehicle info..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Review Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingReview}
                  onClick={() => handleReviewDecision('DENY')}
                  className="px-4 py-2 text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                >
                  Deny Request
                </button>

                <button
                  type="button"
                  disabled={savingReview}
                  onClick={() => handleReviewDecision('PARTIAL_ACCEPT')}
                  className="px-4 py-2 text-xs font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
                >
                  Save Decisions (Partial)
                </button>

                <button
                  type="button"
                  disabled={savingReview}
                  onClick={() => handleReviewDecision('ACCEPT_ALL')}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {savingReview && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <Check className="w-4 h-4" />
                  <span>Accept All</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: FULFILLMENT / DISPATCH (MARK COMPLETED)          */}
      {/* ========================================================= */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title={`Fulfill Requisition: ${dispatchingRequest?.request_number}`}
        subtitle={`Branch: ${dispatchingRequest?.branch_name} | Record quantities physically dispatched and delivered.`}
        maxWidth="3xl"
      >
        {dispatchingRequest && (
          <div className="space-y-5">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Enter the quantities physically issued from warehouse. Delivered quantity cannot exceed approved quantity.
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-right">Requested</th>
                    <th className="py-2.5 px-3 text-right">Approved</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center w-36">Delivered Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveredItems.map((item, i) => {
                    const matchItem = (dispatchingRequest.items || [])[i];
                    if (!matchItem) return null;

                    const appQty = Number(matchItem.approved_quantity ?? matchItem.requested_quantity);
                    const isDecimal = matchItem.quantity_type_snapshot === 'Decimal';

                    return (
                      <tr key={item.itemId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{matchItem.item_name_snapshot}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{matchItem.requested_quantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{appQty}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-600">{matchItem.unit_snapshot}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            step={isDecimal ? '0.01' : '1'}
                            min="0"
                            max={appQty}
                            value={item.deliveredQuantity}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setDeliveredItems(prev => {
                                const next = [...prev];
                                next[i].deliveredQuantity = Math.min(val, appQty);
                                return next;
                              });
                            }}
                            className="w-24 px-2 py-1 text-xs font-black text-center rounded-lg border border-slate-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fulfillment / Dispatch Remarks</label>
              <textarea
                rows={2}
                value={completionRemarks}
                onChange={e => setCompletionRemarks(e.target.value)}
                placeholder="Waybill number, driver info, or handover verification remarks..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDispatch}
                onClick={handleConfirmDispatch}
                className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {savingDispatch && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Dispatch & Mark Completed</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: REQUEST DETAIL & AUDIT TIMELINE                  */}
      {/* ========================================================= */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Requisition Details: ${selectedRequest?.request_number}`}
        subtitle={`Branch: ${selectedRequest?.branch_name} (${selectedRequest?.branch_code})`}
        maxWidth="4xl"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Header overview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                <div className="mt-1">{renderStatusBadge(selectedRequest.status)}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                <div className="mt-1">{renderPriorityBadge(selectedRequest.priority)}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested By</span>
                <span className="font-bold text-slate-900 text-xs block mt-1">
                  {selectedRequest.requested_by_name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">@{selectedRequest.requested_by_username}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted On</span>
                <span className="font-semibold text-slate-800 text-xs block mt-1">
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Denial Banner if denied */}
            {selectedRequest.status === 'DENIED' && selectedRequest.denial_reason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-rose-900 text-xs">Requisition Denied by Operation</h5>
                  <p className="text-xs text-rose-700 mt-0.5">
                    <strong>Reason:</strong> {selectedRequest.denial_reason}
                  </p>
                  {selectedRequest.denied_by_name && (
                    <span className="text-[10px] text-rose-500 block mt-1">
                      Denied by {selectedRequest.denied_by_name} on {new Date(selectedRequest.denied_at || '').toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Requested Goods</h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-right">Requested</th>
                      <th className="py-2.5 px-3 text-right">Approved</th>
                      <th className="py-2.5 px-3 text-right">Delivered</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Remarks / Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRequest.items || []).map(it => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{it.item_name_snapshot}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{it.requested_quantity}</td>
                        <td className="py-2.5 px-3 text-right font-black text-indigo-600">
                          {it.approved_quantity !== null && it.approved_quantity !== undefined ? it.approved_quantity : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-purple-600">
                          {it.delivered_quantity || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">{it.unit_snapshot}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              it.item_status === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : it.item_status === 'PARTIAL'
                                ? 'bg-blue-100 text-blue-800'
                                : it.item_status === 'DENIED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {it.item_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {it.item_description && <span className="block">Branch: {it.item_description}</span>}
                          {it.operation_remark && <span className="block text-indigo-600">Ops: {it.operation_remark}</span>}
                          {!it.item_description && !it.operation_remark && '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* History Timeline */}
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Requisition Audit Timeline</span>
              </h4>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                {(selectedRequest.history || []).map((h, idx) => (
                  <div key={h.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {h.user_name || 'System'} <span className="text-[10px] font-normal text-slate-400">(@{h.username || 'system'})</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium mt-0.5">{h.remarks || h.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 5: CANCEL REQUISITION CONFIRMATION                  */}
      {/* ========================================================= */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Goods Requisition"
        subtitle={`Request No: ${cancelTargetRequest?.request_number}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to cancel this requisition? This will permanently retire the request.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cancellation Reason</label>
            <input
              type="text"
              placeholder="e.g. Requested by mistake, duplicate request, etc."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Back
            </button>
            <button
              disabled={savingCancel}
              onClick={handleConfirmCancel}
              className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
            >
              {savingCancel ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 6: GOODS ITEMS CATALOG MANAGEMENT                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        title="Goods Items Catalog Management"
        subtitle="Configure predefined goods items, categories, measurement units, and integer/decimal quantity rules."
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Items defined here are selectable across all branch requisitions.
            </span>
            {hasPermission('goods_items.create') && (
              <button
                onClick={handleOpenCreateGoodsItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Goods Item</span>
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-center">Quantity Type</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goodsCatalog.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      {item.description && <span className="text-[10px] text-slate-500 block">{item.description}</span>}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{item.category}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{item.unit}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.quantity_type === 'Decimal'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.quantity_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          Boolean(item.active)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {Boolean(item.active) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasPermission('goods_items.edit') && (
                          <button
                            onClick={() => handleOpenEditGoodsItem(item)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission('goods_items.disable') && (
                          <button
                            onClick={() => handleToggleGoodsItemStatus(item)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                              Boolean(item.active)
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {Boolean(item.active) ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowCatalogModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 7: ADD / EDIT GOODS ITEM FORM                       */}
      {/* ========================================================= */}
      <Modal
        isOpen={showAddGoodsItemModal}
        onClose={() => setShowAddGoodsItemModal(false)}
        title={editingGoodsItem ? `Edit Goods Item: ${editingGoodsItem.name}` : 'Add New Goods Item'}
        subtitle="Configure item name, measurement unit, category, and integer/decimal quantity rules."
        maxWidth="md"
      >
        <form onSubmit={handleSaveGoodsItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SPLICING TRAY 24F"
              value={itemFormName}
              onChange={e => setItemFormName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={itemFormCategory}
                onChange={e => setItemFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white cursor-pointer"
              >
                <option value="Fiber">Fiber</option>
                <option value="Routers">Routers</option>
                <option value="Drop Wire">Drop Wire</option>
                <option value="Accessories">Accessories</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unit of Measure <span className="text-rose-500">*</span>
              </label>
              <select
                value={itemFormUnit}
                onChange={e => setItemFormUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white cursor-pointer"
              >
                <option value="KM">KM (Kilometer)</option>
                <option value="PCS">PCS (Pieces)</option>
                <option value="Meter">Meter</option>
                <option value="Box">Box</option>
                <option value="Roll">Roll</option>
                <option value="Set">Set</option>
                <option value="Pair">Pair</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={itemFormQuantityType}
              onChange={e => setItemFormQuantityType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white cursor-pointer"
            >
              <option value="Decimal">Decimal (e.g. 0.5 KM, 2.75 KM)</option>
              <option value="Integer">Integer (e.g. 1, 5, 20 PCS - whole numbers only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Technical specifications or model info..."
              value={itemFormDescription}
              onChange={e => setItemFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddGoodsItemModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingGoodsItem}
              className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
            >
              {savingGoodsItem ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RequestGoods;
