import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, Check, CheckCheck, Trash2, Filter, 
  AlertTriangle, CheckCircle2, Clock, Megaphone, Info
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const getNotificationIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('task') || t.includes('assign')) return <Clock className="w-5 h-5 text-blue-500" />;
    if (t.includes('directive') || t.includes('instruction')) return <Megaphone className="w-5 h-5 text-purple-500" />;
    if (t.includes('ticket') || t.includes('sla')) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    if (t.includes('complete') || t.includes('achieve')) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    return <Info className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-indigo-600" />
            Notifications Center
          </h1>
          <p className="text-gray-500 text-sm">
            Stay updated with real-time operational alerts, assignments, approvals, and reminders.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition"
          >
            <CheckCheck className="w-4 h-4" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            filter === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            filter === 'unread'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            filter === 'read'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white p-16 rounded-xl border border-gray-100 text-center text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-400" />
            <p className="font-semibold text-gray-700">No notifications in this folder</p>
            <p className="text-xs text-gray-500 mt-1">You are all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                !n.is_read
                  ? 'bg-indigo-50/40 border-indigo-100 shadow-sm'
                  : 'bg-white border-gray-100 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  !n.is_read ? 'bg-white shadow-xs' : 'bg-gray-100'
                }`}>
                  {getNotificationIcon(n.title)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm ${!n.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {n.title}
                    </h3>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">{n.message}</p>
                  <span className="text-[11px] text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    title="Mark as read"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
