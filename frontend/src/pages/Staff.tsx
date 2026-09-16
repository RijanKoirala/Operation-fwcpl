import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Briefcase,
  Building,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Key,
  Lock,
  Check,
  Edit2,
  Globe,
  Radio,
  FileText,
  Plug,
  PackageCheck,
  CalendarClock,
  Target,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User, Designation, Department } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface StaffPageProps {
  onNavigate?: (path: string) => void;
}

export const Staff: React.FC<StaffPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'admins' | 'designations' | 'departments'>('staff');
  const [staffList, setStaffList] = useState<User[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddDesigModal, setShowAddDesigModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [selectedStaffProfile, setSelectedStaffProfile] = useState<any>(null);

  // Admins & Access Control State
  const [adminsList, setAdminsList] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const defaultPermissions: Record<string, boolean> = {
    tasks: true,
    connections: true,
    request_goods: true,
    followups: true,
    staff: true,
    instructions: true,
    targets: true,
    noc: true,
    reports: true,
  };

  const permissionModules = [
    { key: 'tasks', label: 'Tasks Management', desc: 'Create, assign, complete operational tasks', icon: CheckSquare },
    { key: 'connections', label: 'Customer Connections', desc: 'Fiber rollout, site surveys, installation', icon: Plug },
    { key: 'request_goods', label: 'Request Goods', desc: 'Fiber, routers, and equipment requisitions', icon: PackageCheck },
    { key: 'followups', label: 'Customer Follow-ups', desc: 'Customer retention & satisfaction calls', icon: CalendarClock },
    { key: 'staff', label: 'Staff Management', desc: 'Branch employee directory & oversight', icon: Users },
    { key: 'instructions', label: 'Office Instructions', desc: 'Directives, operational memos & orders', icon: FileText },
    { key: 'targets', label: 'Targets & KPI', desc: 'Sales, connections & collection metrics', icon: Target },
    { key: 'noc', label: 'NOC Network Outages', desc: 'Raise fiber breaks & NOC escalations', icon: Radio },
    { key: 'reports', label: 'Reports & Audit Logs', desc: 'Branch performance analytics and logs', icon: BarChart3 },
  ];

  const [adminForm, setAdminForm] = useState({
    id: 0,
    employeeId: '',
    username: '',
    email: '',
    fullName: '',
    phone: '',
    password: '',
    role: 'BRANCH_MANAGER',
    branchScope: 'SPECIFIC', // 'ALL' or 'SPECIFIC'
    branchId: '',
    status: 'Active',
    permissions: { ...defaultPermissions },
  });

  const [staffForm, setStaffForm] = useState({
    employeeId: '',
    username: '',
    email: '',
    fullName: '',
    phone: '',
    branchId: '',
    designationId: '',
    departmentId: '',
    role: 'STAFF',
    status: 'Active',
    notes: '',
  });

  const [desigForm, setDesigForm] = useState({ name: '', code: '', departmentId: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        branchId: branchFilter,
        status: statusFilter,
      }).toString();
      const res = await api.get(`/staff?${q}`);
      if (res.success) setStaffList(res.staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [desRes, depRes, brRes] = await Promise.all([
        api.get('/staff/meta/designations'),
        api.get('/staff/meta/departments'),
        api.get('/branches'),
      ]);
      if (desRes.success) setDesignations(desRes.designations);
      if (depRes.success) setDepartments(depRes.departments);
      if (brRes.success) setBranches(brRes.branches);
    } catch {}
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.get('/staff/admins/list');
      if (res.success) {
        setAdminsList(res.admins || []);
      }
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleOpenCreateAdmin = () => {
    setEditingAdmin(null);
    setAdminForm({
      id: 0,
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      username: '',
      email: '',
      fullName: '',
      phone: '',
      password: 'Password123!',
      role: 'BRANCH_MANAGER',
      branchScope: 'SPECIFIC',
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      status: 'Active',
      permissions: { ...defaultPermissions },
    });
    setShowAdminModal(true);
  };

  const handleOpenEditAdmin = (admin: User) => {
    setEditingAdmin(admin);
    let userPerms = { ...defaultPermissions };
    if (admin.permissions) {
      if (typeof admin.permissions === 'string') {
        try { userPerms = { ...userPerms, ...JSON.parse(admin.permissions) }; } catch {}
      } else if (typeof admin.permissions === 'object') {
        userPerms = { ...userPerms, ...admin.permissions };
      }
    }
    const isGlobal = admin.allowed_branches === 'ALL' || admin.allowedBranches === 'ALL' || (!admin.branch_id && !admin.branchId);

    setAdminForm({
      id: admin.id,
      employeeId: admin.employeeId || admin.employee_id || '',
      username: admin.username || '',
      email: admin.email || '',
      fullName: admin.fullName || admin.full_name || admin.name || '',
      phone: admin.phone || '',
      password: '',
      role: admin.role || 'BRANCH_MANAGER',
      branchScope: isGlobal ? 'ALL' : 'SPECIFIC',
      branchId: String(admin.branchId || admin.branch_id || (branches[0]?.id || '')),
      status: admin.status || 'Active',
      permissions: userPerms,
    });
    setShowAdminModal(true);
  };

  const togglePermission = (key: string) => {
    setAdminForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const toggleAllPermissions = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    permissionModules.forEach(m => {
      updated[m.key] = enable;
    });
    setAdminForm(prev => ({
      ...prev,
      permissions: updated,
    }));
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username.trim() || !adminForm.fullName.trim() || !adminForm.email.trim()) {
      alert('Please fill out all required fields: Name, Username, and Email.');
      return;
    }

    setSavingAdmin(true);
    try {
      const payload: any = {
        employeeId: adminForm.employeeId.trim(),
        username: adminForm.username.trim(),
        email: adminForm.email.trim(),
        fullName: adminForm.fullName.trim(),
        phone: adminForm.phone.trim() || null,
        role: adminForm.role,
        status: adminForm.status,
        branchId: adminForm.branchScope === 'SPECIFIC' && adminForm.branchId ? parseInt(adminForm.branchId, 10) : null,
        allowedBranches: adminForm.branchScope === 'ALL' ? 'ALL' : (adminForm.branchId ? String(adminForm.branchId) : 'ALL'),
        permissions: adminForm.permissions,
      };

      if (editingAdmin) {
        if (adminForm.password.trim()) {
          payload.password = adminForm.password.trim();
        }
        const res = await api.put(`/staff/${adminForm.id}`, payload);
        if (res.success) {
          setShowAdminModal(false);
          fetchAdmins();
          fetchStaff();
          alert('Admin access and permissions updated successfully!');
        }
      } else {
        payload.password = adminForm.password.trim() || 'Password123!';
        const res = await api.post('/staff', payload);
        if (res.success) {
          setShowAdminModal(false);
          fetchAdmins();
          fetchStaff();
          alert('New administrator created successfully!');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save admin user.');
    } finally {
      setSavingAdmin(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [search, branchFilter, statusFilter]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff', staffForm);
      if (res.success) {
        setShowAddStaffModal(false);
        setStaffForm({
          employeeId: '',
          username: '',
          email: '',
          fullName: '',
          phone: '',
          branchId: '',
          designationId: '',
          departmentId: '',
          role: 'STAFF',
          status: 'Active',
          notes: '',
        });
        fetchStaff();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create staff');
    }
  };

  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff/meta/designations', desigForm);
      if (res.success) {
        setShowAddDesigModal(false);
        setDesigForm({ name: '', code: '', departmentId: '' });
        fetchMeta();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create designation');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff/meta/departments', deptForm);
      if (res.success) {
        setShowAddDeptModal(false);
        setDeptForm({ name: '', code: '', description: '' });
        fetchMeta();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  };

  const viewStaffDetails = async (id: number) => {
    try {
      const res = await api.get(`/staff/${id}`);
      if (res.success) {
        setSelectedStaffProfile(res);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load staff details');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Employee Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational personnel, roles, designations, and individual performance records
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'SUPER_ADMIN' && activeTab === 'admins' && (
            <button
              onClick={handleOpenCreateAdmin}
              className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> + Create Admin / Manager
            </button>
          )}

          {user?.role === 'SUPER_ADMIN' && activeTab === 'designations' && (
            <button
              onClick={() => setShowAddDesigModal(true)}
              className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Designation
            </button>
          )}

          {user?.role === 'SUPER_ADMIN' && activeTab === 'departments' && (
            <button
              onClick={() => setShowAddDeptModal(true)}
              className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}

          {['SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'].includes(user?.role || '') && activeTab === 'staff' && (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'staff' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff Directory ({staffList.length})
        </button>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admins' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admins & Access Control ({adminsList.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('designations')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'designations' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Designations ({designations.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'departments' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Departments ({departments.length})
        </button>
      </div>

      {/* Staff Directory Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff name, username, ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Name / Username</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{s.employeeId}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {s.fullName}
                      <span className="block text-xs font-normal text-slate-400">@{s.username} • {s.email}</span>
                    </td>
                    <td className="py-3.5 px-4">{s.branchName || 'Unassigned'}</td>
                    <td className="py-3.5 px-4 font-medium">{s.designationName || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{s.departmentName || '-'}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-brand-700">{s.role}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => viewStaffDetails(s.id)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Profile & Stats
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admins & Access Control Tab */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          {/* Link to Dedicated Administration Module */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">Full Administration & RBAC Control Center Available</h4>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Dynamic roles, live Role-Permission Matrix, 3 core departments, and individual permission overrides are available in the Administration center.
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('administration')}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Open Administration →
              </button>
            )}
          </div>

          {/* Summary & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search admin name, username, email..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={adminRoleFilter}
                onChange={e => setAdminRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                <option value="">All Admin Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="MANAGEMENT">Management / Regional</option>
                <option value="BRANCH_MANAGER">Branch Manager</option>
              </select>

              <button
                onClick={handleOpenCreateAdmin}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-4 h-4" /> + Create Admin
              </button>
            </div>
          </div>

          {/* Admins Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingAdmins ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs font-medium text-slate-500">Loading administrators and access permissions...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Admin / Manager</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Branch Access Scope</th>
                      <th className="py-3.5 px-4">Active Module Permissions</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminsList
                      .filter(adm => {
                        const s = adminSearch.toLowerCase();
                        const matchesSearch = !s ||
                          (adm.fullName && adm.fullName.toLowerCase().includes(s)) ||
                          (adm.full_name && adm.full_name.toLowerCase().includes(s)) ||
                          (adm.username && adm.username.toLowerCase().includes(s)) ||
                          (adm.email && adm.email.toLowerCase().includes(s));
                        const matchesRole = !adminRoleFilter || adm.role === adminRoleFilter;
                        return matchesSearch && matchesRole;
                      })
                      .map(adm => {
                        let perms: Record<string, boolean> = { ...defaultPermissions };
                        if (adm.permissions) {
                          if (typeof adm.permissions === 'string') {
                            try { perms = { ...perms, ...JSON.parse(adm.permissions) }; } catch {}
                          } else if (typeof adm.permissions === 'object') {
                            perms = { ...perms, ...adm.permissions };
                          }
                        }

                        const isGlobal = adm.allowed_branches === 'ALL' || adm.allowedBranches === 'ALL' || (!adm.branch_id && !adm.branchId);
                        const activeCount = Object.values(perms).filter(Boolean).length;

                        return (
                          <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* User details */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                                  {(adm.fullName || adm.full_name || adm.username || 'A').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block">
                                    {adm.fullName || adm.full_name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono block">
                                    @{adm.username} • {adm.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4 font-semibold">
                              {adm.role === 'SUPER_ADMIN' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <Shield className="w-3 h-3 mr-1 text-rose-600" />
                                  Super Admin
                                </span>
                              ) : adm.role === 'MANAGEMENT' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  Management (Regional)
                                </span>
                              ) : adm.role === 'BRANCH_MANAGER' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Branch Manager
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Staff
                                </span>
                              )}
                            </td>

                            {/* Branch Scope */}
                            <td className="py-3.5 px-4">
                              {isGlobal ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                  All Branches (Global)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <Building className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                                  {adm.branch_name || adm.branchName || 'Assigned Branch'}
                                </span>
                              )}
                            </td>

                            {/* Permissions Badges */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-1 max-w-sm">
                                {adm.role === 'SUPER_ADMIN' ? (
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Full Access (All 9 Modules)
                                  </span>
                                ) : activeCount === 9 ? (
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    All 9 Modules Active
                                  </span>
                                ) : (
                                  permissionModules.filter(m => perms[m.key]).map(m => (
                                    <span
                                      key={m.key}
                                      className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                                    >
                                      {m.label.split(' ')[0]}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <StatusBadge status={adm.status || 'Active'} />
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleOpenEditAdmin(adm)}
                                className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer space-x-1"
                              >
                                <Edit2 className="w-3 h-3 text-slate-500" />
                                <span>Edit Access</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Designations Tab */}
      {activeTab === 'designations' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {designations.map(d => (
              <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{d.name}</h4>
                  <span className="text-xs text-slate-400 font-medium">Code: {d.code}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                  ID: {d.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map(dp => (
              <div key={dp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-base">{dp.name}</h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                    {dp.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{dp.description || 'Department scope'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={showAddStaffModal} onClose={() => setShowAddStaffModal(false)} title="Add Staff Member">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID *</label>
              <input
                type="text"
                required
                placeholder="EMP-1025"
                value={staffForm.employeeId}
                onChange={e => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Poudel"
                value={staffForm.fullName}
                onChange={e => setStaffForm({ ...staffForm, fullName: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                placeholder="ramesh.tech"
                value={staffForm.username}
                onChange={e => setStaffForm({ ...staffForm, username: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="ramesh@fiberworld.net.np"
                value={staffForm.email}
                onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch *</label>
              <select
                required
                value={staffForm.branchId}
                onChange={e => setStaffForm({ ...staffForm, branchId: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
              <select
                value={staffForm.designationId}
                onChange={e => setStaffForm({ ...staffForm, designationId: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="">Select Designation</option>
                {designations.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={staffForm.departmentId}
                onChange={e => setStaffForm({ ...staffForm, departmentId: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="">Select Dept</option>
                {departments.map(dp => (
                  <option key={dp.id} value={dp.id}>{dp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
              <select
                value={staffForm.role}
                onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="STAFF">Staff Member</option>
                <option value="BRANCH_MANAGER">Branch Manager</option>
                <option value="MANAGEMENT">Management</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+977-98..."
                value={staffForm.phone}
                onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddStaffModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Admin Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title={editingAdmin ? `Edit Admin Access: ${editingAdmin.fullName || editingAdmin.full_name || editingAdmin.username}` : 'Create New Administrator'}
        subtitle="Manage user credentials, branch scope assignment, and module permissions"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveAdmin} className="space-y-5">
          {/* Section 1: Basic Information & Role */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              Account & Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Birat Branch Manager"
                  value={adminForm.fullName}
                  onChange={e => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP-XXXX"
                  value={adminForm.employeeId}
                  onChange={e => setAdminForm({ ...adminForm, employeeId: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingAdmin}
                  placeholder="admin.biratnagar"
                  value={adminForm.username}
                  onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                />
                {editingAdmin && <span className="text-[10px] text-slate-400">Username cannot be altered</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="manager@fiberworld.net.np"
                  value={adminForm.email}
                  onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingAdmin ? 'New Password (leave blank to keep unchanged)' : 'Initial Password *'}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  placeholder={editingAdmin ? '••••••••' : 'Min 6 characters'}
                  value={adminForm.password}
                  onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+977-98..."
                  value={adminForm.phone}
                  onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Authority *</label>
                <select
                  value={adminForm.role}
                  onChange={e => setAdminForm({ ...adminForm, role: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="BRANCH_MANAGER">Branch Manager</option>
                  <option value="MANAGEMENT">Management (Regional / Area Head)</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="STAFF">Regular Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                <select
                  value={adminForm.status}
                  onChange={e => setAdminForm({ ...adminForm, status: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive / Suspended</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Branch-Wise Operational Access Scope */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              Branch Access Scope
            </h4>
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    adminForm.branchScope === 'ALL'
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="branchScope"
                    checked={adminForm.branchScope === 'ALL'}
                    onChange={() => setAdminForm({ ...adminForm, branchScope: 'ALL' })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">All Branches (Global Access)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      User can view, switch between, and manage data across all branches nationwide.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    adminForm.branchScope === 'SPECIFIC'
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="branchScope"
                    checked={adminForm.branchScope === 'SPECIFIC'}
                    onChange={() => setAdminForm({ ...adminForm, branchScope: 'SPECIFIC' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Specific Single Branch</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      User is strictly restricted to viewing and managing their assigned branch only.
                    </p>
                  </div>
                </label>
              </div>

              {adminForm.branchScope === 'SPECIFIC' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Select Assigned Branch *
                  </label>
                  <select
                    required={adminForm.branchScope === 'SPECIFIC'}
                    value={adminForm.branchId}
                    onChange={e => setAdminForm({ ...adminForm, branchId: e.target.value })}
                    className="w-full text-xs bg-white border border-indigo-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) - {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Granular Module Permissions */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Module Permissions
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAllPermissions(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => toggleAllPermissions(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Control which system modules and sidebar navigation links this user has access to.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {permissionModules.map(mod => {
                const isChecked = !!adminForm.permissions[mod.key];
                return (
                  <label
                    key={mod.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-white border-brand-300 ring-1 ring-brand-500/20 shadow-2xs'
                        : 'bg-white/60 border-slate-200 text-slate-400 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(mod.key)}
                      className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <div className="select-none">
                      <span className={`text-xs font-bold block ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                        {mod.label}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                        {mod.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAdminModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAdmin}
              className="px-6 py-2.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {savingAdmin ? 'Saving...' : editingAdmin ? 'Update Access & Permissions' : 'Create Administrator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Profile Inspection Modal */}
      {selectedStaffProfile && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStaffProfile(null)}
          title={`Staff Profile: ${selectedStaffProfile.staff.full_name}`}
          subtitle={`${selectedStaffProfile.staff.designation_name || 'Staff'} • ${selectedStaffProfile.staff.branch_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tasks Completed</span>
                <p className="text-xl font-black text-slate-900">{selectedStaffProfile.performance?.completedTasks || 0}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">On-Time SLA</span>
                <p className="text-xl font-black text-emerald-600">{selectedStaffProfile.performance?.onTimeRate || 0}%</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Target Achieved</span>
                <p className="text-xl font-black text-amber-600">{selectedStaffProfile.performance?.targetAchievementRate || 0}%</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Overall Score</span>
                <p className="text-xl font-black text-brand-700">{selectedStaffProfile.performance?.overallScore || 0}</p>
              </div>
            </div>

            {/* Assigned Tasks list */}
            <div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Assigned Tasks ({selectedStaffProfile.tasks.length})</h4>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50 text-xs">
                {selectedStaffProfile.tasks.map((t: any) => (
                  <div key={t.id} className="py-2 flex justify-between items-center px-2">
                    <div>
                      <span className="font-bold text-slate-800">{t.title}</span>
                      <span className="block text-[11px] text-slate-400">Due: {t.due_date}</span>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
                {selectedStaffProfile.tasks.length === 0 && <p className="text-center py-4 text-slate-400">No tasks assigned</p>}
              </div>
            </div>

            {/* Activity History */}
            <div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Recent Activity History</h4>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50 text-xs">
                {selectedStaffProfile.activityHistory.map((a: any) => (
                  <div key={a.id} className="py-1.5 px-2 flex justify-between text-slate-600">
                    <span>{a.action.replace(/_/g, ' ')} ({a.module})</span>
                    <span className="text-slate-400 text-[10px]">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
