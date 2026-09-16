import React, { useState } from 'react';
import {
  Bell,
  Search,
  Menu,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { GlobalSearchModal } from './GlobalSearchModal';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onNavigate?: (path: string) => void;
  currentPage?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenSearch,
  onNavigate = () => {},
  currentPage,
}) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleToggle = onToggleSidebar || onOpenMobileMenu || (() => {});
  const handleSearch = onOpenSearch || (() => setShowSearch(true));

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md">
        {/* Left: Mobile menu & Quick Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Omni Search Button */}
          <button
            onClick={handleSearch}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors w-44 sm:w-72 text-left"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500">Quick search...</span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-100 shadow-xl z-50 overflow-hidden text-left">
                <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-900">Notifications ({unreadCount})</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) onNavigate(n.link.replace(/^\//, ''));
                        setShowNotifs(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">No notifications</div>
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 text-center bg-slate-50/50">
                  <button
                    onClick={() => {
                      onNavigate('notifications');
                      setShowNotifs(false);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    View notification center →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Chip */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 text-left p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {(user?.fullName || user?.name || 'FW').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <span className="block text-xs font-bold text-slate-900 line-clamp-1">
                  {user?.fullName || user?.name || user?.username}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {user?.branchName || user?.branch_name || 'Headquarters'}
                </span>
              </div>
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
export default Navbar;
