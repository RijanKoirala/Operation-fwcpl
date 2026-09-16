import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { BranchDashboard } from './pages/BranchDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { Branches } from './pages/Branches';
import { Staff } from './pages/Staff';
import { Tasks } from './pages/Tasks';
import { NocIssues } from './pages/NocIssues';
import { Connections } from './pages/Connections';
import { FollowUps } from './pages/FollowUps';
import { Instructions } from './pages/Instructions';
import { Targets } from './pages/Targets';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Administration } from './pages/Administration';
import { RequestGoods } from './pages/RequestGoods';
import { Discussions } from './pages/Discussions';
import { Pods } from './pages/Pods';

export const App: React.FC = () => {
  const { user, isLoading, hasPermission } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [selectedPodId, setSelectedPodId] = useState<number | undefined>(undefined);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide text-indigo-200">
          Loading Fiber World Operations Platform...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const userRole = (user?.role || '').toUpperCase().replace(/\s+/g, '_');
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

  const handleNavigate = (page: string) => {
    const clean = page.replace(/^\//, '');
    if (clean === 'noc' && isBranchScoped) {
      setCurrentPage('discussions');
      return;
    }
    if (clean === 'follow-ups') {
      setCurrentPage('followups');
    } else if (clean === 'activity') {
      setCurrentPage('audit');
    } else if (clean.startsWith('branches/')) {
      const parts = clean.split('/');
      const id = parseInt(parts[1], 10);
      if (!isNaN(id)) {
        setSelectedBranchId(id);
        setCurrentPage('branch-dashboard');
      } else {
        setCurrentPage('branches');
      }
    } else if (clean === 'branch-dashboard') {
      setCurrentPage('branch-dashboard');
    } else if (clean.startsWith('pods/')) {
      const parts = clean.split('/');
      const id = parseInt(parts[1], 10);
      if (!isNaN(id)) {
        setSelectedPodId(id);
      }
      setCurrentPage('pods');
    } else if (clean === 'pods') {
      setSelectedPodId(undefined);
      setCurrentPage('pods');
    } else {
      setCurrentPage(clean);
    }
  };

  const renderContent = () => {
    // If a branch-scoped user somehow hits 'noc', render Discussions directly
    if (currentPage === 'noc' && isBranchScoped) {
      return <Discussions />;
    }

    // Route-level permission protection
    const permMap: Record<string, string> = {
      staff: 'staff',
      tasks: 'tasks',
      noc: 'noc',
      discussions: 'discussions',
      pods: 'pods',
      connections: 'connections',
      followups: 'followups',
      instructions: 'instructions',
      targets: 'targets',
      reports: 'reports',
      administration: 'admins',
      admins: 'admins',
      roles: 'roles',
      permissions: 'permissions',
      departments: 'departments',
      'request-goods': 'goods_requests',
    };

    const requiredPerm = permMap[currentPage];
    if (requiredPerm && requiredPerm !== 'discussions' && requiredPerm !== 'pods' && !hasPermission(requiredPerm)) {
      return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            🔒
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            You do not have permission to access the <span className="font-semibold text-slate-800 capitalize">{currentPage}</span> module. Please contact your Super Administrator.
          </p>
          <button
            onClick={() => handleNavigate('dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }
    switch (currentPage) {
      case 'dashboard':
        if (userRole === 'BRANCH_MANAGER') return <BranchDashboard branchId={user?.branchId || undefined} onNavigate={handleNavigate} />;
        if (userRole === 'STAFF') return <StaffDashboard onNavigate={handleNavigate} />;
        return <Dashboard onNavigate={handleNavigate} />;
      case 'branch-dashboard':
        return <BranchDashboard branchId={selectedBranchId} onNavigate={handleNavigate} />;
      case 'staff-dashboard':
        return <StaffDashboard onNavigate={handleNavigate} />;
      case 'branches':
        return <Branches onNavigate={handleNavigate} />;
      case 'staff':
        return <Staff onNavigate={handleNavigate} />;
      case 'tasks':
        return <Tasks />;
      case 'discussions':
        return <Discussions />;
      case 'noc':
        return isBranchScoped ? <Discussions /> : <NocIssues />;
      case 'pods':
        return <Pods onNavigate={handleNavigate} initialPodId={selectedPodId} />;
      case 'connections':
        return <Connections />;
      case 'followups':
        return <FollowUps />;
      case 'instructions':
        return <Instructions />;
      case 'targets':
        return <Targets />;
      case 'reports':
        return <Reports />;
      case 'notifications':
        return <Notifications />;
      case 'administration':
        return <Administration onNavigate={handleNavigate} initialTab="admins" />;
      case 'admins':
        return <Administration onNavigate={handleNavigate} initialTab="admins" />;
      case 'roles':
        return <Administration onNavigate={handleNavigate} initialTab="roles" />;
      case 'permissions':
        return <Administration onNavigate={handleNavigate} initialTab="matrix" />;
      case 'departments':
        return <Administration onNavigate={handleNavigate} initialTab="departments" />;
      case 'audit':
        return <AuditLogs />;
      case 'request-goods':
        return <RequestGoods onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Global Search Modal */}
      <GlobalSearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
        onNavigate={handleNavigate}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Navbar
          onOpenSearch={() => setShowSearchModal(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
