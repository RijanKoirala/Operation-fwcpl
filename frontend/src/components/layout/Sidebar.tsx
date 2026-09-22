import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CheckSquare,
  Plug,
  CalendarClock,
  FileText,
  Target,
  BarChart3,
  Bell,
  History,
  Settings,
  UserCheck,
  Radio,
  X,
  ShieldCheck,
  PackageCheck,
  MessagesSquare,
  Server,
  Zap,
  Megaphone,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentPage?: string;
  currentPath?: string;
  onNavigate: (path: string) => void;
  isOpen?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage = 'dashboard',
  currentPath = '',
  onNavigate,
  isOpen = false,
  mobileOpen = false,
  onClose,
  onCloseMobile,
}) => {
  const { user, hasPermission } = useAuth();
  const activePath = (currentPath || currentPage || 'dashboard').replace(/^\//, '');
  const showMobile = isOpen || mobileOpen;
  const handleClose = onClose || onCloseMobile || (() => {});

  const navItems = [
    {
      label: 'Dashboard',
      path: 'dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
    },
    {
      label: 'Branches',
      path: 'branches',
      icon: <Building2 className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'],
      permissionKey: 'branches',
    },
    {
      label: 'Staff',
      path: 'staff',
      icon: <Users className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'],
      permissionKey: 'staff',
    },
    {
      label: 'Tasks',
      path: 'tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'tasks',
    },
    {
      label: 'Tickets',
      path: 'tickets',
      icon: <Ticket className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'tickets',
    },
    {
      label: 'Follow-ups',
      path: 'followups',
      icon: <CalendarClock className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'followups',
    },
    {
      label: 'Instructions',
      path: 'instructions',
      icon: <FileText className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'instructions',
    },
    {
      label: 'Discussion Box',
      path: 'discussions',
      icon: <MessagesSquare className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'discussions',
    },
    {
      label: 'NOC Issues',
      path: 'noc',
      icon: <Radio className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'noc',
      branchHidden: true,
    },
    {
      label: 'PODs',
      path: 'pods',
      icon: <Server className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'pods',
    },
    {
      label: 'Request Goods',
      path: 'request-goods',
      icon: <PackageCheck className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'goods_requests',
    },
    {
      label: 'Electricity Meter',
      path: 'electricity',
      icon: <Zap className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'electricity',
    },
    {
      label: 'Share Information',
      path: 'share-information',
      icon: <Megaphone className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'information',
    },
    {
      label: 'Targets / KPI',
      path: 'targets',
      icon: <Target className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'targets',
    },
    {
      label: 'New Connections',
      path: 'connections',
      icon: <Plug className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
      permissionKey: 'connections',
    },
    {
      label: 'Reports',
      path: 'reports',
      icon: <BarChart3 className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'],
      permissionKey: 'reports',
    },
    {
      label: 'Notifications',
      path: 'notifications',
      icon: <Bell className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
    },
    {
      label: 'Administration',
      path: 'administration',
      icon: <ShieldCheck className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT'],
      permissionKey: 'admins',
    },
    {
      label: 'Activity Log',
      path: 'audit',
      icon: <History className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT'],
      permissionKey: 'audit',
    },
    {
      label: 'Settings',
      path: 'settings',
      icon: <Settings className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN'],
    },
    {
      label: 'Profile',
      path: 'profile',
      icon: <UserCheck className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'],
    },
  ];

  const userRole = (user?.role || 'STAFF').toUpperCase().replace(/\s+/g, '_');
  const roleNameUpper = ((user as any)?.roleName || (user as any)?.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const userDept = (user?.departmentCode || user?.department_code || '').toUpperCase();
  const isBranchScoped = Boolean(
    (user?.branchId || user?.branch_id) &&
    userRole !== 'SUPER_ADMIN' &&
    roleNameUpper !== 'SUPER_ADMIN' &&
    userRole !== 'MANAGEMENT' &&
    roleNameUpper !== 'MANAGEMENT' &&
    userDept !== 'EXEC' &&
    userDept !== 'OPS' &&
    userDept !== 'NOC'
  );

  const filteredNav = navItems.filter(item => {
    if ((item as any).branchHidden && isBranchScoped) {
      return false;
    }
    const roleAllowed = item.allowedRoles.map(r => r.toUpperCase().replace(/\s+/g, '_')).includes(userRole);
    if (!roleAllowed) return false;
    if (item.permissionKey && !hasPermission(item.permissionKey)) {
      if (
        item.permissionKey === 'discussions' ||
        item.permissionKey === 'pods' ||
        item.permissionKey === 'electricity' ||
        item.permissionKey === 'information'
      ) {
        return true;
      }
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {showMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={handleClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          showMobile ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between border-r border-slate-800 shadow-xl`}
      >
        {/* Top: Brand & Close */}
        <div>
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white block">FWCPL OPS</span>
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block -mt-1">
                  20+ Branches
                </span>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {filteredNav.map(item => {
              const isActive =
                activePath === item.path ||
                (activePath && activePath.startsWith(`${item.path}/`)) ||
                (item.path === 'branches' && (activePath === 'branch-dashboard' || activePath.startsWith('branches')));
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    onNavigate(item.path);
                    handleClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs">
              {(user?.fullName || user?.name || 'FW').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.fullName || user?.name || user?.username}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.branchName || user?.branch_name || 'Headquarters'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
