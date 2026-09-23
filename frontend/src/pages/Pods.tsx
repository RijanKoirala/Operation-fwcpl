import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Edit,
  Trash2,
  Layers,
  Zap,
  Key,
  ShieldCheck,
  Building,
  Navigation,
  ArrowLeft,
  ChevronRight,
  Package,
  History,
  FileText,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Pod, PodItem, PodHistory, PodStats, PodStatus, PodType } from '../types';
import { Modal } from '../components/common/Modal';

interface PodsProps {
  onNavigate?: (path: string) => void;
  initialPodId?: number;
}

export const Pods: React.FC<PodsProps> = ({ onNavigate, initialPodId }) => {
  const { user, hasPermission } = useAuth();

  // Selected POD for detail view (null means List View)
  const [selectedPodId, setSelectedPodId] = useState<number | null>(initialPodId || null);
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'history'>('overview');

  // List View State
  const [pods, setPods] = useState<Pod[]>([]);
  const [stats, setStats] = useState<PodStats>({
    totalPods: 0,
    active: 0,
    maintenance: 0,
    inactive: 0,
    unavailable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Items State (for detail view)
  const [items, setItems] = useState<PodItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // History State (for detail view)
  const [history, setHistory] = useState<PodHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals State
  const [showAddPodModal, setShowAddPodModal] = useState(false);
  const [showEditPodModal, setShowEditPodModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PodItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State: Add/Edit POD
  const [podForm, setPodForm] = useState({
    name: '',
    status: 'Active' as PodStatus,
    pod_type: 'Commercial' as PodType,
    latitude: '',
    longitude: '',
    house_owner_name: '',
    house_owner_contact: '',
    house_owner_alt_contact: '',
    address: '',
    property_description: '',
    relative_name: '',
    relative_relationship: '',
    relative_contact: '',
    relative_alt_contact: '',
    installation_date: '',
    access_information: '',
    access_restrictions: '',
    key_holder: '',
    key_holder_contact: '',
    power_available: true,
    backup_power_available: false,
    backup_power_type: 'UPS',
    power_remarks: '',
    equipment_location: '',
    physical_location_description: '',
    description: '',
    remarks: '',
  });

  // Form State: Add/Edit Item
  const [itemForm, setItemForm] = useState({
    item_name: '',
    quantity: '1',
    unit: 'PCS',
    description: '',
    status: 'Active' as 'Active' | 'Inactive',
    remarks: '',
  });

  // Location Picker State
  const [gpsForm, setGpsForm] = useState({
    latitude: '',
    longitude: '',
  });
  const [detectingGps, setDetectingGps] = useState(false);

  // Permissions check
  const canCreatePod = hasPermission('pods.create');
  const canEditPod = hasPermission('pods.edit');
  const canDeletePod = hasPermission('pods.delete');
  const canViewItems = hasPermission('pods.items.view');
  const canCreateItem = hasPermission('pods.items.create');
  const canEditItem = hasPermission('pods.items.edit');
  const canDeleteItem = hasPermission('pods.items.delete');
  const canViewHistory = hasPermission('pods.history.view');

  // Fetch PODs list
  const fetchPods = async () => {
    setLoading(true);
    try {
      const cleanParams: Record<string, string> = {};
      if (search.trim()) cleanParams.search = search.trim();
      if (statusFilter !== 'All') cleanParams.status = statusFilter;
      if (typeFilter !== 'All') cleanParams.podType = typeFilter;

      const res = await api.pods.getAll(cleanParams);
      if (res.success) {
        setPods(res.pods || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch PODs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPods();
  }, [search, statusFilter, typeFilter]);

  // Fetch single POD details when selected
  const fetchPodDetails = async (id: number) => {
    try {
      const res = await api.pods.getById(id);
      if (res.success && res.pod) {
        setSelectedPod(res.pod);
      }
    } catch (err) {
      console.error('Failed to fetch POD details:', err);
    }
  };

  // Fetch items for selected POD
  const fetchPodItems = async (podId: number) => {
    setLoadingItems(true);
    try {
      const res = await api.pods.getItems(podId);
      if (res.success) {
        setItems(res.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch POD items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch history for selected POD
  const fetchPodHistory = async (podId: number) => {
    setLoadingHistory(true);
    try {
      const res = await api.pods.getHistory(podId);
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch POD history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Effect when selectedPodId changes
  useEffect(() => {
    if (selectedPodId) {
      fetchPodDetails(selectedPodId);
      if (activeTab === 'items') fetchPodItems(selectedPodId);
      if (activeTab === 'history') fetchPodHistory(selectedPodId);
    } else {
      setSelectedPod(null);
    }
  }, [selectedPodId, activeTab]);

  // Handle Open Create POD Modal
  const openCreatePodModal = () => {
    setPodForm({
      name: '',
      status: 'Active',
      pod_type: 'Commercial',
      latitude: '',
      longitude: '',
      house_owner_name: '',
      house_owner_contact: '',
      house_owner_alt_contact: '',
      address: '',
      property_description: '',
      relative_name: '',
      relative_relationship: '',
      relative_contact: '',
      relative_alt_contact: '',
      installation_date: '',
      access_information: '',
      access_restrictions: '',
      key_holder: '',
      key_holder_contact: '',
      power_available: true,
      backup_power_available: false,
      backup_power_type: 'UPS',
      power_remarks: '',
      equipment_location: '',
      physical_location_description: '',
      description: '',
      remarks: '',
    });
    setShowAddPodModal(true);
  };

  // Handle Open Edit POD Modal
  const openEditPodModal = (pod: Pod) => {
    setPodForm({
      name: pod.name,
      status: pod.status,
      pod_type: pod.pod_type,
      latitude: pod.latitude !== null && pod.latitude !== undefined ? String(pod.latitude) : '',
      longitude: pod.longitude !== null && pod.longitude !== undefined ? String(pod.longitude) : '',
      house_owner_name: pod.house_owner_name || '',
      house_owner_contact: pod.house_owner_contact || '',
      house_owner_alt_contact: pod.house_owner_alt_contact || '',
      address: pod.address || '',
      property_description: pod.property_description || '',
      relative_name: pod.relative_name || '',
      relative_relationship: pod.relative_relationship || '',
      relative_contact: pod.relative_contact || '',
      relative_alt_contact: pod.relative_alt_contact || '',
      installation_date: pod.installation_date ? pod.installation_date.split('T')[0] : '',
      access_information: pod.access_information || '',
      access_restrictions: pod.access_restrictions || '',
      key_holder: pod.key_holder || '',
      key_holder_contact: pod.key_holder_contact || '',
      power_available: Boolean(pod.power_available),
      backup_power_available: Boolean(pod.backup_power_available),
      backup_power_type: pod.backup_power_type || 'UPS',
      power_remarks: pod.power_remarks || '',
      equipment_location: pod.equipment_location || '',
      physical_location_description: pod.physical_location_description || '',
      description: pod.description || '',
      remarks: pod.remarks || '',
    });
    setShowEditPodModal(true);
  };

  // Save New POD
  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podForm.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.pods.create(podForm);
      if (res.success) {
        setShowAddPodModal(false);
        fetchPods();
        // Automatically open the new POD detail safely
        if (res.pod?.id) {
          setSelectedPod(res.pod);
          setSelectedPodId(res.pod.id);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create POD / DC');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edited POD
  const handleUpdatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !podForm.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.pods.update(selectedPodId, podForm);
      if (res.success) {
        setShowEditPodModal(false);
        setSelectedPod(res.pod);
        fetchPods();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update POD / DC');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Item Modal
  const openAddItemModal = () => {
    setItemForm({
      item_name: '',
      quantity: '1',
      unit: 'PCS',
      description: '',
      status: 'Active',
      remarks: '',
    });
    setShowAddItemModal(true);
  };

  // Open Edit Item Modal
  const openEditItemModal = (item: PodItem) => {
    setEditingItem(item);
    setItemForm({
      item_name: item.item_name,
      quantity: String(item.quantity),
      unit: item.unit,
      description: item.description || '',
      status: item.status,
      remarks: item.remarks || '',
    });
    setShowEditItemModal(true);
  };

  // Save New Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !itemForm.item_name.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.pods.createItem(selectedPodId, itemForm);
      if (res.success) {
        setShowAddItemModal(false);
        fetchPodItems(selectedPodId);
        fetchPodDetails(selectedPodId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edited Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !editingItem || !itemForm.item_name.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.pods.updateItem(selectedPodId, editingItem.id, itemForm);
      if (res.success) {
        setShowEditItemModal(false);
        setEditingItem(null);
        fetchPodItems(selectedPodId);
        fetchPodDetails(selectedPodId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (!selectedPodId) return;
    if (!window.confirm(`Are you sure you want to remove "${itemName}" from this POD?`)) return;
    try {
      const res = await api.pods.deleteItem(selectedPodId, itemId);
      if (res.success) {
        fetchPodItems(selectedPodId);
        fetchPodDetails(selectedPodId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove item');
    }
  };

  // Open GPS Modal
  const openLocationModal = () => {
    if (!selectedPod) return;
    setGpsForm({
      latitude: selectedPod.latitude !== null && selectedPod.latitude !== undefined ? String(selectedPod.latitude) : '',
      longitude: selectedPod.longitude !== null && selectedPod.longitude !== undefined ? String(selectedPod.longitude) : '',
    });
    setShowLocationModal(true);
  };

  // Detect Device GPS
  const handleDetectDeviceGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setDetectingGps(false);
        setGpsForm({
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        });
      },
      err => {
        setDetectingGps(false);
        alert(`Failed to retrieve device location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Save GPS from modal
  const handleSaveGps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId) return;
    setSubmitting(true);
    try {
      const res = await api.pods.update(selectedPodId, {
        latitude: gpsForm.latitude ? parseFloat(gpsForm.latitude) : null,
        longitude: gpsForm.longitude ? parseFloat(gpsForm.longitude) : null,
      });
      if (res.success) {
        setShowLocationModal(false);
        setSelectedPod(res.pod);
        fetchPods();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update GPS coordinates');
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers
  const getStatusBadge = (status: PodStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inactive':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Temporarily Unavailable':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: PodStatus) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Maintenance':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'Inactive':
        return <XCircle className="w-3.5 h-3.5 text-slate-500" />;
      case 'Temporarily Unavailable':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
    }
  };

  // Safe coordinate formatting helper (handles string or number, prevents .toFixed crash)
  const formatCoord = (val: any) => {
    if (val === null || val === undefined || String(val).trim() === '') return '';
    const num = parseFloat(String(val));
    return isNaN(num) ? String(val) : num.toFixed(4);
  };

  // Filter items in Item Tab
  const filteredItems = items.filter(
    it =>
      it.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (it.description && it.description.toLowerCase().includes(itemSearch.toLowerCase())) ||
      (it.unit && it.unit.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  // =========================================================================
  // VIEW: SINGLE POD/DC DETAIL PAGE
  // =========================================================================
  if (selectedPodId) {
    if (!selectedPod) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading POD / DC details...</p>
        </div>
      );
    }

    const hasGps = Boolean(
      selectedPod.latitude !== null &&
      selectedPod.latitude !== undefined &&
      String(selectedPod.latitude).trim() !== '' &&
      selectedPod.longitude !== null &&
      selectedPod.longitude !== undefined &&
      String(selectedPod.longitude).trim() !== ''
    );
    const mapUrl = hasGps ? `https://www.google.com/maps?q=${selectedPod.latitude},${selectedPod.longitude}` : '';

    return (
      <div className="space-y-6 pb-16">
        {/* Navigation Breadcrumbs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedPodId(null)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-2xs transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to PODs</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="cursor-pointer hover:text-slate-600" onClick={() => setSelectedPodId(null)}>PODs</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-bold text-slate-800">{selectedPod.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {hasGps && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Open in Maps</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            {canEditPod && (
              <button
                onClick={() => openEditPodModal(selectedPod)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit POD / DC</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                <Server className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black tracking-tight">{selectedPod.name}</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(selectedPod.status)}`}>
                    {getStatusIcon(selectedPod.status)}
                    {selectedPod.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 text-[11px] font-semibold uppercase tracking-wider">
                    {selectedPod.pod_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                  {selectedPod.description || 'Distribution Center (POD) serving regional nodes, field teams, and local subscriber routing.'}
                </p>
                {selectedPod.address && (
                  <p className="text-xs text-indigo-200 mt-2 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {selectedPod.address}
                  </p>
                )}
              </div>
            </div>

            {/* Quick KPI stats on banner */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3.5 self-start md:self-auto shrink-0">
              <div className="text-center px-3 border-r border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Items</p>
                <p className="text-xl font-black text-white">{selectedPod.items_count || 0}</p>
              </div>
              <div className="text-center px-3 border-r border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Power</p>
                <p className="text-xs font-bold text-emerald-400">{selectedPod.power_available ? 'Grid Connected' : 'No Grid'}</p>
              </div>
              <div className="text-center px-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Backup</p>
                <p className="text-xs font-bold text-amber-300">{selectedPod.backup_power_available ? (selectedPod.backup_power_type || 'UPS') : 'None'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Main Tabs Navigation */}
        <div className="border-b border-slate-200 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'items'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Items & Equipment</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
              {selectedPod.items_count || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History & Audit Trail</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 cols wide on large screens) */}
            <div className="lg:col-span-2 space-y-6">
              {/* House Owner Section */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">House Owner Information</h3>
                      <p className="text-[11px] text-slate-500">Owner of the property where the DC/POD is deployed</p>
                    </div>
                  </div>
                  {canEditPod && (
                    <button
                      onClick={() => openEditPodModal(selectedPod)}
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">House Owner Name</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {selectedPod.house_owner_name || <span className="text-slate-400 italic">Not specified</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Contact</span>
                    {selectedPod.house_owner_contact ? (
                      <a
                        href={`tel:${selectedPod.house_owner_contact}`}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-0.5 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selectedPod.house_owner_contact}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic mt-0.5 block">Not specified</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alternate Contact</span>
                    {selectedPod.house_owner_alt_contact ? (
                      <a
                        href={`tel:${selectedPod.house_owner_alt_contact}`}
                        className="text-xs font-bold text-slate-700 hover:text-indigo-600 mt-0.5 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPod.house_owner_alt_contact}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic mt-0.5 block">—</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Property Description</span>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {selectedPod.property_description || <span className="text-slate-400 italic">—</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Relative / Alternate Person */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Relative / Alternate Contact</h3>
                      <p className="text-[11px] text-slate-500">Contact person when house owner is unavailable</p>
                    </div>
                  </div>
                  {canEditPod && (
                    <button
                      onClick={() => openEditPodModal(selectedPod)}
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Person Name</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {selectedPod.relative_name || <span className="text-slate-400 italic">Not specified</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Relationship</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {selectedPod.relative_relationship || <span className="text-slate-400 italic">—</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Contact</span>
                    {selectedPod.relative_contact ? (
                      <a
                        href={`tel:${selectedPod.relative_contact}`}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-0.5 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selectedPod.relative_contact}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic mt-0.5 block">—</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alternate Contact</span>
                    {selectedPod.relative_alt_contact ? (
                      <a
                        href={`tel:${selectedPod.relative_alt_contact}`}
                        className="text-xs font-bold text-slate-700 hover:text-indigo-600 mt-0.5 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPod.relative_alt_contact}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic mt-0.5 block">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Access & Power Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Access Information */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
                      <Key className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Access & Key Holder</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Key Holder</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {selectedPod.key_holder || <span className="text-slate-400 italic">None registered</span>}
                      </p>
                    </div>

                    {selectedPod.key_holder_contact && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Key Holder Contact</span>
                        <a href={`tel:${selectedPod.key_holder_contact}`} className="font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {selectedPod.key_holder_contact}
                        </a>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Access Restrictions / Time</span>
                      <p className="text-slate-700 mt-0.5">
                        {selectedPod.access_restrictions || '24/7 access permitted with prior notification'}
                      </p>
                    </div>

                    {selectedPod.access_information && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Special Instructions</span>
                        <p className="text-slate-600 mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                          {selectedPod.access_information}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Power & Backup */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Power & Battery Backup</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Power Grid:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${selectedPod.power_available ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {selectedPod.power_available ? 'Connected (Active)' : 'Disconnected'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Backup Available:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${selectedPod.backup_power_available ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {selectedPod.backup_power_available ? 'Yes (Online)' : 'No Backup'}
                      </span>
                    </div>

                    {selectedPod.backup_power_available && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Backup Power Type</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedPod.backup_power_type || 'UPS'}</p>
                      </div>
                    )}

                    {selectedPod.power_remarks && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Power Remarks</span>
                        <p className="text-slate-600 mt-0.5 text-[11px]">{selectedPod.power_remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (1 col wide on large screens) */}
            <div className="space-y-6">
              {/* GPS Location Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">GPS Coordinates</h3>
                  </div>
                  {canEditPod && (
                    <button
                      onClick={openLocationModal}
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Pick / Edit
                    </button>
                  )}
                </div>

                {hasGps ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">Latitude:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedPod.latitude}</span>
                      </div>
                      <div className="flex justify-between py-1 border-t border-slate-200/50">
                        <span className="text-slate-500 font-medium">Longitude:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedPod.longitude}</span>
                      </div>
                    </div>

                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-indigo-200/60"
                    >
                      <Navigation className="w-4 h-4 text-indigo-600" />
                      <span>View Location on Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-600">No GPS Coordinates Set</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                      Save coordinates to enable field direction and map navigation.
                    </p>
                    {canEditPod && (
                      <button
                        onClick={openLocationModal}
                        className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        Add GPS Coordinates
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Equipment & Room Location */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                    <Building className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Physical Equipment Location</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipment / Rack Location</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {selectedPod.equipment_location || <span className="text-slate-400 italic">Not specified</span>}
                    </p>
                  </div>

                  {selectedPod.physical_location_description && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Physical Description</span>
                      <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                        {selectedPod.physical_location_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Summary Quick Preview Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Installed Items Summary</h3>
                      <p className="text-[10px] text-slate-400">Total: {selectedPod.items_count || 0} items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('items')}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {selectedPod.recent_items && selectedPod.recent_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPod.recent_items.map(it => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-bold text-slate-800 truncate max-w-[180px]">{it.item_name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono font-bold text-[11px]">
                          {it.quantity} {it.unit}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => setActiveTab('items')}
                      className="w-full mt-2 py-2 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition border border-indigo-100 cursor-pointer"
                    >
                      View All Items ({selectedPod.items_count || 0}) →
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    <p>No items registered for this POD yet.</p>
                    {canCreateItem && (
                      <button
                        onClick={openAddItemModal}
                        className="mt-2 text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        + Add First Item
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ITEMS */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search items in this POD..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>
                <span className="text-xs text-slate-500 font-bold hidden sm:inline">
                  {filteredItems.length} items found
                </span>
              </div>

              {canCreateItem && (
                <button
                  onClick={openAddItemModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              )}
            </div>

            {loadingItems ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Loading items for {selectedPod.name}...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-right">Quantity</th>
                        <th className="py-3 px-4">Unit</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.item_name}
                            {item.remarks && (
                              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                                Note: {item.remarks}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-800 text-sm">
                            {item.quantity}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                              {item.unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {item.description || <span className="text-slate-300 italic">—</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                item.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEditItem && (
                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                  title="Edit Item"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDeleteItem && (
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.item_name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No items found for this POD</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Each POD/DC has its own independent equipment list. Click below to register installed items.
                </p>
                {canCreateItem && (
                  <button
                    onClick={openAddItemModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    + Add Item
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Activity Log & Audit Trail for {selectedPod.name}</span>
            </h3>

            {loadingHistory ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Loading history...</p>
              </div>
            ) : history.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {history.map(entry => (
                  <div key={entry.id} className="relative group">
                    <div className="absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-2xs" />
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between gap-3 text-xs mb-1">
                        <span className="font-bold text-slate-900 flex items-center gap-2">
                          {entry.user_name || entry.user_username || 'System'}
                          {entry.user_role && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                              {entry.user_role}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {entry.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No recorded history events yet for this POD.
              </div>
            )}
          </div>
        )}

        {/* MODALS */}
        {/* EDIT POD MODAL */}
        <Modal
          isOpen={showEditPodModal}
          onClose={() => setShowEditPodModal(false)}
          title={`Edit POD / DC: ${selectedPod.name}`}
          maxWidth="4xl"
        >
          <form onSubmit={handleUpdatePod} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">POD/DC Name *</label>
                <input
                  type="text"
                  required
                  value={podForm.name}
                  onChange={e => setPodForm({ ...podForm, name: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={podForm.status}
                  onChange={e => setPodForm({ ...podForm, status: e.target.value as PodStatus })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Temporarily Unavailable">Temporarily Unavailable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">POD Type</label>
                <select
                  value={podForm.pod_type}
                  onChange={e => setPodForm({ ...podForm, pod_type: e.target.value as PodType })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* GPS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 27.671234"
                  value={podForm.latitude}
                  onChange={e => setPodForm({ ...podForm, latitude: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 85.321234"
                  value={podForm.longitude}
                  onChange={e => setPodForm({ ...podForm, longitude: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                />
              </div>
            </div>

            {/* House Owner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">House Owner</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ram Bahadur Thapa"
                    value={podForm.house_owner_name}
                    onChange={e => setPodForm({ ...podForm, house_owner_name: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Primary Contact</label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={podForm.house_owner_contact}
                    onChange={e => setPodForm({ ...podForm, house_owner_contact: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Alternate Contact</label>
                  <input
                    type="text"
                    placeholder="97XXXXXXXX"
                    value={podForm.house_owner_alt_contact}
                    onChange={e => setPodForm({ ...podForm, house_owner_alt_contact: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Pragatinagar, Nawalparasi"
                  value={podForm.address}
                  onChange={e => setPodForm({ ...podForm, address: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
            </div>

            {/* Relative */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Relative / Alternate Contact</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Person Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Hari Thapa"
                    value={podForm.relative_name}
                    onChange={e => setPodForm({ ...podForm, relative_name: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Son / Brother"
                    value={podForm.relative_relationship}
                    onChange={e => setPodForm({ ...podForm, relative_relationship: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Contact Number</label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={podForm.relative_contact}
                    onChange={e => setPodForm({ ...podForm, relative_contact: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Access & Power */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Access & Key</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Key Holder Name</label>
                  <input
                    type="text"
                    value={podForm.key_holder}
                    onChange={e => setPodForm({ ...podForm, key_holder: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Key Holder Contact</label>
                  <input
                    type="text"
                    value={podForm.key_holder_contact}
                    onChange={e => setPodForm({ ...podForm, key_holder_contact: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Access Restrictions</label>
                  <input
                    type="text"
                    value={podForm.access_restrictions}
                    onChange={e => setPodForm({ ...podForm, access_restrictions: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Power Details</h4>
                <div className="flex items-center gap-4 py-1">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={podForm.power_available}
                      onChange={e => setPodForm({ ...podForm, power_available: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Grid Power Available</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={podForm.backup_power_available}
                      onChange={e => setPodForm({ ...podForm, backup_power_available: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Backup Available</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Backup Type</label>
                  <input
                    type="text"
                    placeholder="e.g. UPS, Generator, Solar"
                    value={podForm.backup_power_type}
                    onChange={e => setPodForm({ ...podForm, backup_power_type: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Equipment Location / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor Server Room, Rack #2"
                    value={podForm.equipment_location}
                    onChange={e => setPodForm({ ...podForm, equipment_location: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditPodModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ADD ITEM MODAL */}
        <Modal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          title={`+ Add Item to ${selectedPod.name}`}
        >
          <form onSubmit={handleCreateItem} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Item Name * <span className="text-[10px] font-normal text-slate-400">(Flexible writable field)</span>
              </label>
              <input
                type="text"
                required
                list="item-suggestions"
                placeholder="e.g. WiFi Router, Fiber Cable, UPS, SFP, ONU..."
                value={itemForm.item_name}
                onChange={e => setItemForm({ ...itemForm, item_name: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-600"
              />
              <datalist id="item-suggestions">
                <option value="WiFi Router" />
                <option value="ONU" />
                <option value="Fiber Cable" />
                <option value="Fiber Closure" />
                <option value="SFP Module" />
                <option value="UPS" />
                <option value="Battery" />
                <option value="Switch" />
                <option value="Patch Cord" />
                <option value="Power Adapter" />
                <option value="Rack" />
                <option value="Key" />
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  placeholder="e.g. 2 or 50 or 2.5"
                  value={itemForm.quantity}
                  onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                <input
                  type="text"
                  required
                  list="unit-suggestions"
                  placeholder="e.g. PCS, Meter, KM..."
                  value={itemForm.unit}
                  onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                />
                <datalist id="unit-suggestions">
                  <option value="PCS" />
                  <option value="Meter" />
                  <option value="KM" />
                  <option value="Box" />
                  <option value="Roll" />
                  <option value="Pair" />
                  <option value="Set" />
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Installed primary router, backup battery for OLT, spare cable..."
                value={itemForm.description}
                onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={itemForm.status}
                onChange={e => setItemForm({ ...itemForm, status: e.target.value as any })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </form>
        </Modal>

        {/* EDIT ITEM MODAL */}
        <Modal
          isOpen={showEditItemModal}
          onClose={() => setShowEditItemModal(false)}
          title={`Edit Item: ${editingItem?.item_name || ''}`}
        >
          <form onSubmit={handleUpdateItem} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={itemForm.item_name}
                onChange={e => setItemForm({ ...itemForm, item_name: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={itemForm.quantity}
                  onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                <input
                  type="text"
                  required
                  value={itemForm.unit}
                  onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={itemForm.description}
                onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={itemForm.status}
                onChange={e => setItemForm({ ...itemForm, status: e.target.value as any })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditItemModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* PICK GPS LOCATION MODAL */}
        <Modal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          title={`GPS Coordinates for ${selectedPod.name}`}
        >
          <form onSubmit={handleSaveGps} className="space-y-4">
            <p className="text-xs text-slate-500">
              Enter high-precision latitude and longitude coordinates, or use your device's live GPS receiver.
            </p>

            <button
              type="button"
              onClick={handleDetectDeviceGps}
              disabled={detectingGps}
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer disabled:opacity-50"
            >
              <Navigation className="w-4 h-4 text-indigo-600" />
              <span>{detectingGps ? 'Detecting Location...' : 'Use Current Device GPS'}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="27.671234"
                  value={gpsForm.latitude}
                  onChange={e => setGpsForm({ ...gpsForm, latitude: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="85.321234"
                  value={gpsForm.longitude}
                  onChange={e => setGpsForm({ ...gpsForm, longitude: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                />
              </div>
            </div>

            {gpsForm.latitude && gpsForm.longitude && (
              <a
                href={`https://www.google.com/maps?q=${gpsForm.latitude},${gpsForm.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Verify coordinates on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Coordinates'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN PODS LIST VIEW
  // =========================================================================
  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PODs</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              DC Locations
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Distribution Center & Point of Delivery nodes, equipment inventory, GPS coordinates, and property contacts
          </p>
        </div>

        {canCreatePod && (
          <button
            onClick={openCreatePodModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add POD/DC</span>
          </button>
        )}
      </div>

      {/* 4 Summary KPI Cards (Clickable Filter Controls) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => { setStatusFilter('All'); setTypeFilter('All'); setSearch(''); }}
          className={`p-4 rounded-2xl border transition shadow-2xs cursor-pointer hover:border-indigo-400 hover:shadow-sm ${
            statusFilter === 'All' ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200/80'
          }`}
          title="Click to reset filters and view all PODs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total POD/DCs</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalPods}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Configured DC nodes</span>
        </div>

        <div
          onClick={() => setStatusFilter('Active')}
          className={`p-4 rounded-2xl border transition shadow-2xs cursor-pointer hover:border-emerald-400 hover:shadow-sm ${
            statusFilter === 'Active' ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200/80'
          }`}
          title="Click to filter Active PODs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{stats.active}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Operational & healthy</span>
        </div>

        <div
          onClick={() => setStatusFilter('Maintenance')}
          className={`p-4 rounded-2xl border transition shadow-2xs cursor-pointer hover:border-amber-400 hover:shadow-sm ${
            statusFilter === 'Maintenance' ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500/20' : 'bg-white border-slate-200/80'
          }`}
          title="Click to filter Maintenance PODs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Maintenance</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{stats.maintenance}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Under service</span>
        </div>

        <div
          onClick={() => setStatusFilter('Inactive')}
          className={`p-4 rounded-2xl border transition shadow-2xs cursor-pointer hover:border-slate-400 hover:shadow-sm ${
            statusFilter === 'Inactive' ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20' : 'bg-white border-slate-200/80'
          }`}
          title="Click to filter Inactive/Offline PODs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactive / Offline</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{stats.inactive + stats.unavailable}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Archived or offline</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by POD/DC name, house owner, phone, or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
            <option value="Temporarily Unavailable">Temporarily Unavailable</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="Commercial">Commercial</option>
            <option value="Residential">Residential</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-semibold">Loading POD / DC locations...</p>
          </div>
        ) : pods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">POD / DC</th>
                  <th className="py-3 px-4">House Owner</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4">Location / GPS</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pods.map(pod => {
                  const hasGps = Boolean(
                    pod.latitude !== null &&
                    pod.latitude !== undefined &&
                    String(pod.latitude).trim() !== '' &&
                    pod.longitude !== null &&
                    pod.longitude !== undefined &&
                    String(pod.longitude).trim() !== ''
                  );
                  return (
                    <tr
                      key={pod.id}
                      onClick={() => setSelectedPodId(pod.id)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="py-4 px-4 font-black text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                            <Server className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition block">
                              {pod.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              {pod.pod_type}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-700">
                        {pod.house_owner_name || <span className="text-slate-300 italic">—</span>}
                      </td>

                      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                        {pod.house_owner_contact ? (
                          <a
                            href={`tel:${pod.house_owner_contact}`}
                            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {pod.house_owner_contact}
                          </a>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${getStatusBadge(pod.status)}`}>
                          {getStatusIcon(pod.status)}
                          {pod.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                          {pod.items_count || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                        {hasGps ? (
                          <a
                            href={`https://www.google.com/maps?q=${pod.latitude},${pod.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1"
                            title="Open in Google Maps"
                          >
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{formatCoord(pod.latitude)}, {formatCoord(pod.longitude)}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPodId(pod.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            View
                          </button>
                          {canEditPod && (
                            <button
                              onClick={() => openEditPodModal(pod)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit POD"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <Server className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No POD / DC locations found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              {search || statusFilter !== 'All' ? 'Try adjusting your search or filters.' : 'Click "+ Add POD/DC" to create your first distribution center.'}
            </p>
            {canCreatePod && (
              <button
                onClick={openCreatePodModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add POD/DC</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CREATE POD MODAL */}
      <Modal
        isOpen={showAddPodModal}
        onClose={() => setShowAddPodModal(false)}
        title="+ Create New POD / DC Location"
        maxWidth="4xl"
      >
        <form onSubmit={handleCreatePod} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">POD / DC Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. BUTWAL DC"
                value={podForm.name}
                onChange={e => setPodForm({ ...podForm, name: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={podForm.status}
                onChange={e => setPodForm({ ...podForm, status: e.target.value as PodStatus })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
                <option value="Temporarily Unavailable">Temporarily Unavailable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">POD Type</label>
              <select
                value={podForm.pod_type}
                onChange={e => setPodForm({ ...podForm, pod_type: e.target.value as PodType })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="Commercial">Commercial</option>
                <option value="Residential">Residential</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 27.671234"
                value={podForm.latitude}
                onChange={e => setPodForm({ ...podForm, latitude: e.target.value })}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 85.321234"
                value={podForm.longitude}
                onChange={e => setPodForm({ ...podForm, longitude: e.target.value })}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
              />
            </div>
          </div>

          {/* House Owner */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">House Owner Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Owner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ram Bahadur Thapa"
                  value={podForm.house_owner_name}
                  onChange={e => setPodForm({ ...podForm, house_owner_name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Primary Contact</label>
                <input
                  type="text"
                  placeholder="98XXXXXXXX"
                  value={podForm.house_owner_contact}
                  onChange={e => setPodForm({ ...podForm, house_owner_contact: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Alternate Contact</label>
                <input
                  type="text"
                  placeholder="97XXXXXXXX"
                  value={podForm.house_owner_alt_contact}
                  onChange={e => setPodForm({ ...podForm, house_owner_alt_contact: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Address / Property Location</label>
              <input
                type="text"
                placeholder="e.g. Pragatinagar, Nawalparasi"
                value={podForm.address}
                onChange={e => setPodForm({ ...podForm, address: e.target.value })}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
              />
            </div>
          </div>

          {/* Relative */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Relative / Alternate Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hari Thapa"
                  value={podForm.relative_name}
                  onChange={e => setPodForm({ ...podForm, relative_name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Relationship</label>
                <input
                  type="text"
                  placeholder="e.g. Son / Brother"
                  value={podForm.relative_relationship}
                  onChange={e => setPodForm({ ...podForm, relative_relationship: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Contact Number</label>
                <input
                  type="text"
                  placeholder="98XXXXXXXX"
                  value={podForm.relative_contact}
                  onChange={e => setPodForm({ ...podForm, relative_contact: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Access & Power */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Access Information</h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Key Holder Name</label>
                <input
                  type="text"
                  value={podForm.key_holder}
                  onChange={e => setPodForm({ ...podForm, key_holder: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Key Holder Contact</label>
                <input
                  type="text"
                  value={podForm.key_holder_contact}
                  onChange={e => setPodForm({ ...podForm, key_holder_contact: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Power & Backup</h4>
              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={podForm.power_available}
                    onChange={e => setPodForm({ ...podForm, power_available: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Power Available</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={podForm.backup_power_available}
                    onChange={e => setPodForm({ ...podForm, backup_power_available: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Backup Available</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Equipment / Room Location</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Floor Server Rack"
                  value={podForm.equipment_location}
                  onChange={e => setPodForm({ ...podForm, equipment_location: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddPodModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create POD / DC'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Pods;
