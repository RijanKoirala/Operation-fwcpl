import React, { useState, useEffect, useRef } from 'react';
import {
  MessagesSquare,
  Plus,
  Search,
  Send,
  Image as ImageIcon,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Building2,
  User,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  Paperclip,
  Check,
  ZoomIn,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DiscussionTopic, DiscussionMessage, Branch } from '../types';
import { Modal } from '../components/common/Modal';

export const Discussions: React.FC = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // New Topic Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Operational Issue');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [newBranchId, setNewBranchId] = useState<number | string>(user?.branchId || 1);
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const newTopicFileInputRef = useRef<HTMLInputElement>(null);

  const isBranchScoped = Boolean(
    user?.branchId &&
    user?.role !== 'SUPER_ADMIN' &&
    (user as any)?.roleName !== 'Super Admin' &&
    user?.departmentCode !== 'EXEC' &&
    user?.departmentCode !== 'OPS' &&
    user?.role !== 'MANAGEMENT'
  );

  // Fetch branches for admin filter & modal
  useEffect(() => {
    if (!isBranchScoped) {
      api.branches.getAll().then(res => {
        if (res.success) setBranches(res.branches || []);
      }).catch(() => {});
    }
  }, [isBranchScoped]);

  // Fetch topics
  const fetchTopics = async (selectTopicId?: number) => {
    setLoadingTopics(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (branchFilter !== 'ALL') params.branchId = branchFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.discussions.getAll(params);
      if (res.success) {
        setTopics(res.topics || []);
        if (selectTopicId) {
          const found = (res.topics || []).find((t: DiscussionTopic) => t.id === selectTopicId);
          if (found) setSelectedTopic(found);
        } else if (!selectedTopic && res.topics && res.topics.length > 0) {
          setSelectedTopic(res.topics[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch discussion topics:', err);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [statusFilter, branchFilter, searchQuery]);

  // Fetch single topic messages when selectedTopic changes
  const fetchTopicMessages = async (id: number) => {
    setLoadingMessages(true);
    try {
      const res = await api.discussions.getById(id);
      if (res.success) {
        setSelectedTopic(res.topic);
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch topic details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedTopic?.id) {
      fetchTopicMessages(selectedTopic.id);
    } else {
      setMessages([]);
    }
  }, [selectedTopic?.id]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle image selection for reply
  const handleReplyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplyImage(file);
      setReplyImagePreview(URL.createObjectURL(file));
    }
  };

  const removeReplyImage = () => {
    setReplyImage(null);
    if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    setReplyImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle image selection for new topic
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setNewImagePreview(URL.createObjectURL(file));
    }
  };

  const removeNewImage = () => {
    setNewImage(null);
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImagePreview(null);
    if (newTopicFileInputRef.current) newTopicFileInputRef.current.value = '';
  };

  // Send reply message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTopic || (!replyText.trim() && !replyImage)) return;

    setSendingMessage(true);
    try {
      const formData = new FormData();
      if (replyText.trim()) formData.append('message', replyText.trim());
      if (replyImage) formData.append('image', replyImage);

      const res = await api.discussions.sendMessage(selectedTopic.id, formData);
      if (res.success) {
        setMessages(prev => [...prev, res.message]);
        setReplyText('');
        removeReplyImage();
        // Refresh topics in background to update last_message_at
        fetchTopics(selectedTopic.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Create new topic
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      alert('Please provide both a topic title and a description message.');
      return;
    }

    setCreatingTopic(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim());
      formData.append('category', newCategory);
      formData.append('priority', newPriority);
      formData.append('message', newMessage.trim());
      if (newBranchId) formData.append('branchId', String(newBranchId));
      if (newImage) formData.append('image', newImage);

      const res = await api.discussions.createTopic(formData);
      if (res.success) {
        setShowNewTopicModal(false);
        setNewTitle('');
        setNewMessage('');
        removeNewImage();
        fetchTopics(res.topic.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create discussion topic');
    } finally {
      setCreatingTopic(false);
    }
  };

  // Close or Re-open topic
  const handleToggleStatus = async (newStatus: 'OPEN' | 'CLOSED') => {
    if (!selectedTopic) return;
    try {
      const res = await api.discussions.updateStatus(selectedTopic.id, {
        status: newStatus,
        closure_reason: newStatus === 'CLOSED' ? closureReason : undefined,
      });
      if (res.success) {
        setShowCloseModal(false);
        setClosureReason('');
        setSelectedTopic(res.topic);
        fetchTopicMessages(selectedTopic.id);
        fetchTopics(selectedTopic.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update topic status');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <MessagesSquare className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Discussion Box
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Branch ↔ Operations Desk
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Topic-wise real-time coordination, incident discussions, photo evidence, and operational resolutions
          </p>
        </div>

        <button
          onClick={() => setShowNewTopicModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Discussion</span>
        </button>
      </div>

      {/* Main Dual-Pane Discussion Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[750px] max-h-[850px]">
        {/* LEFT PANE: Topics List & Filters (40%) */}
        <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-slate-200 flex flex-col bg-slate-50/40">
          {/* Search & Filter Bar */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search topics, topic ID, or remarks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills: All / Open / Closed */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full">
                {(['ALL', 'OPEN', 'CLOSED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      statusFilter === st
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'OPEN' ? '🟢 Open' : '🔒 Closed'}
                  </button>
                ))}
              </div>

              {/* Branch Filter dropdown for Head Office / Super Admin */}
              {!isBranchScoped && (
                <select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                  className="text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2 py-1.5 focus:outline-none max-w-[130px] truncate"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Topics List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingTopics && (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading topics...
              </div>
            )}

            {!loadingTopics && topics.length === 0 && (
              <div className="py-16 px-4 text-center">
                <MessagesSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No discussion topics found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Start a new topic to coordinate with Operations.
                </p>
                <button
                  onClick={() => setShowNewTopicModal(true)}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition"
                >
                  + New Discussion
                </button>
              </div>
            )}

            {!loadingTopics && topics.map(topic => {
              const isSelected = selectedTopic?.id === topic.id;
              const isClosed = topic.status === 'CLOSED';

              return (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-white border border-indigo-100 px-1.5 py-0.5 rounded shadow-2xs">
                      {topic.topic_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityBadge(topic.priority)}`}>
                        {topic.priority}
                      </span>
                      {isClosed ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          Closed
                        </span>
                      ) : (
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                    {topic.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                    {topic.last_message?.message || topic.initial_message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-600 flex items-center gap-1 truncate max-w-[160px]">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      {topic.branch_name || 'Branch'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {topic.image_url && (
                        <span title="Has attachment" className="text-indigo-500">
                          📷
                        </span>
                      )}
                      <span className="bg-slate-200/80 font-bold px-1.5 py-0.5 rounded text-slate-600">
                        💬 {topic.message_count || 1}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Chat Conversation Stream (60%) */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {!selectedTopic ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
                <MessagesSquare className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Select a Discussion Topic</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Choose a discussion from the left list to view the message history, respond to Operations, or start a new topic.
              </p>
              <button
                onClick={() => setShowNewTopicModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-xs transition"
              >
                Start New Topic
              </button>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                      {selectedTopic.topic_number}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getPriorityBadge(selectedTopic.priority)}`}>
                      {selectedTopic.priority}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {selectedTopic.category}
                    </span>
                    {selectedTopic.status === 'CLOSED' ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Closed
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Open Discussion
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    {selectedTopic.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedTopic.branch_name} ({selectedTopic.branch_code})
                    </span>
                    <span>•</span>
                    <span>Started by: <b>{selectedTopic.created_by_name || 'Staff'}</b></span>
                    <span>•</span>
                    <span>{new Date(selectedTopic.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Status Toggle Button (Close / Reopen) */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTopic.status === 'OPEN' ? (
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Close and resolve this discussion topic"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Close Topic</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus('OPEN')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Re-open this topic"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Re-open Topic</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
                {/* Initial Topic Description Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {(selectedTopic.created_by_name || 'B').slice(0, 1)}
                      </div>
                      {selectedTopic.created_by_name}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({selectedTopic.created_by_role || 'Branch Staff'})
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(selectedTopic.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                    {selectedTopic.initial_message}
                  </p>

                  {/* Photo Evidence if uploaded at creation */}
                  {selectedTopic.image_url && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                        📷 Attached Photo Evidence
                      </p>
                      <div
                        onClick={() => setLightboxImage(selectedTopic.image_url!)}
                        className="relative inline-block rounded-xl overflow-hidden border border-slate-200 shadow-2xs group cursor-pointer"
                      >
                        <img
                          src={selectedTopic.image_url}
                          alt="Discussion Attachment"
                          className="max-h-56 max-w-full rounded-xl object-cover group-hover:opacity-90 transition"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ZoomIn className="w-4 h-4" /> Click to Zoom
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conversation History */}
                {messages.slice(1).map((msg, idx) => {
                  const isSystem = Boolean(msg.is_internal);
                  const isBranchSender = Boolean(
                    msg.sender_department_code === 'BRANCHES' ||
                    (msg.sender_branch_id && !['EXEC', 'OPS'].includes(msg.sender_department_code || ''))
                  );

                  if (isSystem) {
                    return (
                      <div key={msg.id || idx} className="flex justify-center my-3">
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200/80 text-slate-600 border border-slate-300/60 shadow-2xs">
                          {msg.message} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex gap-3 max-w-2xl ${
                        isBranchSender ? 'mr-auto' : 'ml-auto flex-row-reverse'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                          isBranchSender ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}
                      >
                        {(msg.sender_name || 'U').slice(0, 1).toUpperCase()}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl shadow-2xs space-y-1.5 border ${
                          isBranchSender
                            ? 'bg-white border-slate-200 text-slate-800'
                            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            {msg.sender_name}
                            <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                              isBranchSender ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-200 text-emerald-900'
                            }`}>
                              {isBranchSender ? 'Branch Desk' : 'Operations HQ'}
                            </span>
                          </span>
                          <span className="text-slate-400">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {msg.message && (
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                        )}

                        {/* Image inside message */}
                        {msg.image_url && (
                          <div className="pt-1">
                            <div
                              onClick={() => setLightboxImage(msg.image_url!)}
                              className="relative inline-block rounded-xl overflow-hidden border border-slate-200 group cursor-pointer"
                            >
                              <img
                                src={msg.image_url}
                                alt="Message Photo Attachment"
                                className="max-h-52 max-w-full rounded-xl object-cover group-hover:opacity-90 transition"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                <ZoomIn className="w-4 h-4" /> Click to Zoom
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Reply Bar */}
              {selectedTopic.status === 'CLOSED' ? (
                <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>
                      This discussion was closed by <b>{selectedTopic.closed_by_name || 'Staff'}</b>
                      {selectedTopic.closure_reason && ` (${selectedTopic.closure_reason})`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleStatus('OPEN')}
                    className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Re-open Topic to Reply</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-white border-t border-slate-200">
                  {/* Image Attachment Preview before sending */}
                  {replyImagePreview && (
                    <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between w-max max-w-full gap-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={replyImagePreview}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                        />
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                          {replyImage?.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeReplyImage}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    {/* Hidden file input for reply image */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleReplyImageChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Camera / Image picker button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition shadow-2xs"
                      title="Attach photo or screenshot"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    {/* Reply Textarea */}
                    <div className="flex-1 relative">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type reply to Operations (Ctrl+Enter to send)..."
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white resize-none text-slate-900 placeholder-slate-400 font-medium"
                      />
                    </div>

                    {/* Send button */}
                    <button
                      type="submit"
                      disabled={sendingMessage || (!replyText.trim() && !replyImage)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {sendingMessage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* NEW TOPIC MODAL */}
      <Modal
        isOpen={showNewTopicModal}
        onClose={() => setShowNewTopicModal(false)}
        title="Start New Discussion Topic with Operations"
      >
        <form onSubmit={handleCreateTopic} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Discussion Topic Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Main Ring OLT Fiber degradation in Sector 3"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none"
              >
                <option value="Operational Issue">Operational Issue</option>
                <option value="Technical / Network Support">Technical / Network Support</option>
                <option value="Hardware & Material Inquiry">Hardware & Material Inquiry</option>
                <option value="Billing & Account">Billing & Account</option>
                <option value="Customer Complaint">Customer Complaint</option>
                <option value="General">General Inquiries</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Branch selector for Admins */}
          {!isBranchScoped && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Branch</label>
              <select
                value={newBranchId}
                onChange={e => setNewBranchId(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Message / Issue Description *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe the issue, customer impact, or questions for Operations..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
            />
          </div>

          {/* Photo Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attach Issue Photo / Screenshot (Optional)
            </label>
            <input
              type="file"
              ref={newTopicFileInputRef}
              onChange={handleNewImageChange}
              accept="image/*"
              className="hidden"
            />

            {!newImagePreview ? (
              <div
                onClick={() => newTopicFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-indigo-50/30"
              >
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Click to upload photo or screenshot</p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG up to 10MB</p>
              </div>
            ) : (
              <div className="relative p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={newImagePreview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                      {newImage?.name}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Ready to upload</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeNewImage}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNewTopicModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTopic}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {creatingTopic ? 'Creating...' : 'Start Discussion'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CLOSE TOPIC MODAL */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Discussion Topic"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to close this discussion topic? Closing marks the issue as resolved or addressed.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Resolution Remarks / Reason (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Issue resolved by central NOC engineer. Fiber splicing restored."
              value={closureReason}
              onChange={e => setClosureReason(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowCloseModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => handleToggleStatus('CLOSED')}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Confirm & Close Topic</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* LIGHTBOX MODAL FOR IMAGES */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-800 hover:bg-slate-100 shadow-xl z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default Discussions;
