import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Pin,
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Building2,
  Sparkles,
  Download,
  X,
  Send,
  FileText,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// Category color mappings
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  RULE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  HOLIDAY: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PACKAGE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PLAN: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  MEETING: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  NOTICE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  INSTRUCTION: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  MAINTENANCE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  GENERAL: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export const ShareInformation: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const roleNameUpper = (user?.role || '').toUpperCase();
  const deptUpper = ((user as any)?.department_code || '').toUpperCase();
  const isOps =
    roleNameUpper === 'SUPER_ADMIN' ||
    roleNameUpper === 'MANAGEMENT' ||
    deptUpper === 'OPERATION' ||
    deptUpper === 'OPS';

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Carousel index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInfo, setEditingInfo] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'NOTICE',
    priority: 'Medium',
    status: 'PUBLISHED',
    target_type: 'ALL_BRANCHES',
    is_pinned: false,
    content: '',
    publish_at: new Date().toISOString().slice(0, 16),
    expires_at: '',
    selected_branches: [] as number[],
    image: null as File | null,
    attachment: null as File | null,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [activeCategory, priorityFilter, statusFilter]);

  const fetchBranches = async () => {
    try {
      const res = await api.branches.getAll();
      setBranches(res.branches || []);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeCategory !== 'ALL') params.type = activeCategory;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (statusFilter !== 'ALL' && isOps) params.status = statusFilter;

      const res = await api.information.getAll(params);
      setAnnouncements(res.information || []);
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Detail & Auto Mark Read
  const openDetail = async (item: any) => {
    try {
      const res = await api.information.getById(item.id);
      setDetailItem(res.information);
      // Update local unread state
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
      );
    } catch (err: any) {
      console.error('Failed to fetch detail:', err);
      setDetailItem(item);
    }
  };

  // Pinned items for carousel
  const pinnedItems = useMemo(() => {
    return announcements.filter((a) => a.is_pinned);
  }, [announcements]);

  // Carousel controls
  const handlePrevCarousel = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : pinnedItems.length - 1));
  };

  const handleNextCarousel = () => {
    setCarouselIndex((prev) => (prev < pinnedItems.length - 1 ? prev + 1 : 0));
  };

  // Open Create/Edit Modal
  const openCreateModal = (item?: any) => {
    setEditingInfo(item || null);
    setFormError(null);
    if (item) {
      const bIds = item.target_branches ? item.target_branches.map((b: any) => b.id) : [];
      setFormData({
        title: item.title,
        type: item.type || 'NOTICE',
        priority: item.priority || 'Medium',
        status: item.status || 'PUBLISHED',
        target_type: item.target_type || 'ALL_BRANCHES',
        is_pinned: !!item.is_pinned,
        content: item.content || '',
        publish_at: item.publish_at ? item.publish_at.slice(0, 16) : '',
        expires_at: item.expires_at ? item.expires_at.slice(0, 16) : '',
        selected_branches: bIds,
        image: null,
        attachment: null,
      });
    } else {
      setFormData({
        title: '',
        type: 'NOTICE',
        priority: 'Medium',
        status: 'PUBLISHED',
        target_type: 'ALL_BRANCHES',
        is_pinned: false,
        content: '',
        publish_at: new Date().toISOString().slice(0, 16),
        expires_at: '',
        selected_branches: [],
        image: null,
        attachment: null,
      });
    }
    setShowCreateModal(true);
  };

  // Save Announcement
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('type', formData.type);
      data.append('priority', formData.priority);
      data.append('status', formData.status);
      data.append('target_type', formData.target_type);
      data.append('is_pinned', String(formData.is_pinned));
      data.append('content', formData.content);
      if (formData.publish_at) data.append('publish_at', formData.publish_at);
      if (formData.expires_at) data.append('expires_at', formData.expires_at);

      if (formData.target_type === 'SELECTED_BRANCHES') {
        data.append('branch_ids', JSON.stringify(formData.selected_branches));
      }

      if (formData.image) data.append('image', formData.image);
      if (formData.attachment) data.append('attachment', formData.attachment);

      if (editingInfo) {
        await api.information.update(editingInfo.id, data);
      } else {
        await api.information.create(data);
      }

      setShowCreateModal(false);
      setEditingInfo(null);
      fetchAnnouncements();
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish announcement.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (item: any) => {
    try {
      await api.information.togglePin(item.id);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pin state.');
    }
  };

  // Delete Announcement
  const handleDelete = async (item: any) => {
    if (!window.confirm(`Are you sure you want to remove announcement: "${item.title}"?`)) {
      return;
    }
    try {
      await api.information.delete(item.id);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement.');
    }
  };

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        a.title?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q)
      );
    });
  }, [announcements, searchQuery]);

  const categories = [
    { key: 'ALL', label: 'All Updates' },
    { key: 'NOTICE', label: 'Notices' },
    { key: 'RULE', label: 'Rules & HR' },
    { key: 'HOLIDAY', label: 'Holidays' },
    { key: 'PACKAGE', label: 'Packages' },
    { key: 'PLAN', label: 'Plans' },
    { key: 'MEETING', label: 'Meetings' },
    { key: 'INSTRUCTION', label: 'Instructions' },
    { key: 'MAINTENANCE', label: 'Maintenance' },
    { key: 'GENERAL', label: 'General' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-2xl">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Share Information Hub</h1>
            <p className="text-xs text-slate-500">Official circulars, operational notices, policies, and company updates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('information.create') && (
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Publish Information
            </button>
          )}

          <button
            onClick={fetchAnnouncements}
            className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP PINNED CAROUSEL (IF ANY PINNED ITEMS) */}
      {pinnedItems.length > 0 && (
        <div className="relative bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Carousel slide */}
          {pinnedItems[carouselIndex] && (
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-slate-950" /> Featured Notice
                  </span>
                  <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-semibold rounded-md uppercase">
                    {pinnedItems[carouselIndex].type}
                  </span>
                  <span className="text-xs text-indigo-200">
                    {new Date(pinnedItems[carouselIndex].publish_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                  {pinnedItems[carouselIndex].title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                  {pinnedItems[carouselIndex].content}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => openDetail(pinnedItems[carouselIndex])}
                    className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    Read Full Circular <ChevronRight className="w-4 h-4" />
                  </button>

                  <span className="text-xs text-indigo-200 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {pinnedItems[carouselIndex].target_type === 'ALL_BRANCHES'
                      ? 'Broadcast to All Branches'
                      : `${pinnedItems[carouselIndex].target_branches?.length || 0} Targeted Branches`}
                  </span>
                </div>
              </div>

              {pinnedItems[carouselIndex].image_url && (
                <div className="hidden md:block w-48 h-32 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
                  <img
                    src={pinnedItems[carouselIndex].image_url}
                    alt="Featured"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Carousel navigation controls */}
          {pinnedItems.length > 1 && (
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
              <span>
                {carouselIndex + 1} of {pinnedItems.length} announcements
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevCarousel}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextCarousel}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === c.key
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars, rules, notices..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Priority</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {isOps && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          )}
        </div>
      </div>

      {/* Announcements Feed Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading announcements...</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No announcements found</p>
          <p className="text-xs text-slate-400 mt-0.5">There are currently no active notices in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAnnouncements.map((item) => {
            const catStyle = CATEGORY_STYLES[item.type] || CATEGORY_STYLES['GENERAL'];
            const isUnread = !item.is_read;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  isUnread ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200/80'
                }`}
              >
                <div>
                  {/* Image header if available */}
                  {item.image_url && (
                    <div className="h-36 w-full bg-slate-100 overflow-hidden relative border-b border-slate-100">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => openDetail(item)}
                      />
                      {item.is_pinned && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-amber-400 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-amber-400" /> Pinned
                        </span>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {item.type}
                        </span>

                        {item.priority === 'Urgent' && (
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold rounded uppercase">
                            Urgent
                          </span>
                        )}

                        {isUnread && (
                          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded uppercase animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {new Date(item.publish_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3
                      onClick={() => openDetail(item)}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                    >
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>

                    {/* Metadata pill & attachments */}
                    <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {item.target_type === 'ALL_BRANCHES' ? 'All Branches' : `${item.target_branches?.length || 0} Branches`}
                      </span>

                      {item.attachment_url && (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 font-medium">
                          <Paperclip className="w-3 h-3" /> File Attached
                        </span>
                      )}

                      {isOps && item.status !== 'PUBLISHED' && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px]">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openDetail(item)}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> Read Notice
                  </button>

                  {hasPermission('information.pin') && (
                    <button
                      onClick={() => handleTogglePin(item)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        item.is_pinned
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200'
                      }`}
                      title={item.is_pinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${item.is_pinned ? 'fill-amber-600' : ''}`} />
                    </button>
                  )}

                  {hasPermission('information.edit') && (
                    <button
                      onClick={() => openCreateModal(item)}
                      className="p-1.5 bg-white text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {hasPermission('information.delete') && (
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
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

      {/* DETAIL MODAL */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      (CATEGORY_STYLES[detailItem.type] || CATEGORY_STYLES['GENERAL']).bg
                    } ${(CATEGORY_STYLES[detailItem.type] || CATEGORY_STYLES['GENERAL']).text}`}
                  >
                    {detailItem.type}
                  </span>
                  <span className="text-xs text-slate-400">
                    Published on {new Date(detailItem.publish_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{detailItem.title}</h2>
              </div>

              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailItem.image_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-80 bg-slate-50 flex items-center justify-center">
                <img src={detailItem.image_url} alt={detailItem.title} className="w-full h-auto object-contain" />
              </div>
            )}

            {/* Content Body */}
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed py-2">
              {detailItem.content}
            </div>

            {/* Attachment Download */}
            {detailItem.attachment_url && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Official Attachment / Document</span>
                    <span className="text-[11px] text-slate-500">Download for full review</span>
                  </div>
                </div>
                <a
                  href={detailItem.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            )}

            {/* Audience & Metadata Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                <span className="font-semibold text-slate-700">Target Audience: </span>
                {detailItem.target_type === 'ALL_BRANCHES' ? (
                  <span>All Regional Branches</span>
                ) : (
                  <span>
                    {detailItem.target_branches?.map((b: any) => b.name).join(', ') || 'Selected Branches'}
                  </span>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-700">Posted by: </span>
                {detailItem.created_by_name || 'Central Operations'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingInfo ? 'Edit Information Announcement' : 'Broadcast New Information / Notice'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleSaveAnnouncement} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title / Headline *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Revised Incentive Structure & Dashain Festival Support Schedule"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="NOTICE">NOTICE</option>
                    <option value="RULE">RULE / POLICY</option>
                    <option value="HOLIDAY">HOLIDAY</option>
                    <option value="PACKAGE">PACKAGE / SPEED</option>
                    <option value="PLAN">PLAN / TARGET</option>
                    <option value="MEETING">MEETING</option>
                    <option value="INSTRUCTION">INSTRUCTION</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="PUBLISHED">Publish Now</option>
                    <option value="DRAFT">Save as Draft</option>
                    <option value="SCHEDULED">Schedule for Later</option>
                  </select>
                </div>
              </div>

              {/* Audience Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Target Audience *</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="target_type"
                      checked={formData.target_type === 'ALL_BRANCHES'}
                      onChange={() => setFormData({ ...formData, target_type: 'ALL_BRANCHES' })}
                      className="text-indigo-600"
                    />
                    All Regional Branches
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="target_type"
                      checked={formData.target_type === 'SELECTED_BRANCHES'}
                      onChange={() => setFormData({ ...formData, target_type: 'SELECTED_BRANCHES' })}
                      className="text-indigo-600"
                    />
                    Specific Branches
                  </label>
                </div>

                {formData.target_type === 'SELECTED_BRANCHES' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {branches.map((b) => {
                      const isChecked = formData.selected_branches.includes(b.id);
                      return (
                        <label key={b.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, selected_branches: [...formData.selected_branches, b.id] });
                              } else {
                                setFormData({
                                  ...formData,
                                  selected_branches: formData.selected_branches.filter((id) => id !== b.id),
                                });
                              }
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span className="truncate">{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Content text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content / Message Body *</label>
                <textarea
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed guidelines, dates, instructions, or meeting links..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
                  required
                />
              </div>

              {/* Uploads: Image & Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Feature / Banner Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFormData({ ...formData, image: e.target.files[0] });
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Attachment (PDF, Doc)</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFormData({ ...formData, attachment: e.target.files[0] });
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700"
                  />
                </div>
              </div>

              {/* Pin to highlights */}
              <div>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Pin announcement to top featured highlight carousel</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {formSubmitting ? 'Broadcasting...' : editingInfo ? 'Update Notice' : 'Publish to Branches'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
