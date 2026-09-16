import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Key,
  Lock,
  Unlock,
  Check,
  X,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  Radio,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  History,
  Grid,
  Layers,
  ChevronDown,
  ChevronRight,
  Sliders,
  Sparkles,
  Info,
  Server,
  Building,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import {
  AdminUser,
  RoleItem,
  PermissionItem,
  DepartmentItem,
  AdminDetailResponse,
  Branch,
} from '../types';

interface AdministrationProps {
  initialTab?: 'admins' | 'roles' | 'matrix' | 'departments' | 'audit';
  onNavigate?: (path: string) => void;
}

export const Administration: React.FC<AdministrationProps> = ({
  initialTab = 'admins',
  onNavigate,
}) => {
  const { user: currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'admins' | 'roles' | 'matrix' | 'departments' | 'audit'>(initialTab);

  // Common reference data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  // -------------------------------------------------------------
  // TAB 1: ADMINS STATE
  // -------------------------------------------------------------
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminDeptFilter, setAdminDeptFilter] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');
  const [adminBranchFilter, setAdminBranchFilter] = useState('');

  // Modals for Admins
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<'create' | 'edit'>('create');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Form fields for Admin
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState<string>('');
  const [formRoleId, setFormRoleId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Disabled'>('Active');
  const [formBranchScope, setFormBranchScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [formAssignedBranchIds, setFormAssignedBranchIds] = useState<number[]>([]);

  // Admin Detail & Permissions Inspector Modal
  const [selectedAdminDetail, setSelectedAdminDetail] = useState<AdminDetailResponse | null>(null);
  const [loadingAdminDetail, setLoadingAdminDetail] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailModuleFilter, setDetailModuleFilter] = useState('');
  const [detailOverrides, setDetailOverrides] = useState<Record<string, { permissionId: number; allowed: boolean | null }>>({});
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Reset Password Modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetTargetAdmin, setResetTargetAdmin] = useState<AdminUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [savingResetPassword, setSavingResetPassword] = useState(false);

  // Delete Admin Confirmation Modal
  const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(false);
  const [deleteTargetAdmin, setDeleteTargetAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: ROLES STATE
  // -------------------------------------------------------------
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDescription, setRoleFormDescription] = useState('');
  const [roleFormDepartmentId, setRoleFormDepartmentId] = useState<string>('');
  const [roleFormStatus, setRoleFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [roleFormPermissions, setRoleFormPermissions] = useState<string[]>([]);
  const [allPermissionsList, setAllPermissionsList] = useState<PermissionItem[]>([]);
  const [savingRole, setSavingRole] = useState(false);
  const [roleSearchFilter, setRoleSearchFilter] = useState('');

  // Delete Role Confirmation
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [deleteTargetRole, setDeleteTargetRole] = useState<RoleItem | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: MATRIX STATE
  // -------------------------------------------------------------
  const [matrixRoles, setMatrixRoles] = useState<RoleItem[]>([]);
  const [matrixPermissions, setMatrixPermissions] = useState<PermissionItem[]>([]);
  const [matrixData, setMatrixData] = useState<Record<number, Set<number>>>({});
  const [initialMatrixData, setInitialMatrixData] = useState<Record<number, Set<number>>>({});
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixModuleFilter, setMatrixModuleFilter] = useState('');
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixSaveSuccess, setMatrixSaveSuccess] = useState(false);

  // -------------------------------------------------------------
  // TAB 4: DEPARTMENTS STATE
  // -------------------------------------------------------------
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // -------------------------------------------------------------
  // TAB 5: AUDIT LOGS STATE
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // INITIAL DATA FETCH
  // -------------------------------------------------------------
  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (activeTab === 'admins') loadAdmins();
    else if (activeTab === 'roles') loadRoles();
    else if (activeTab === 'matrix') loadMatrix();
    else if (activeTab === 'departments') loadDepartments();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  const loadReferenceData = async () => {
    try {
      const [branchesRes, deptsRes, rolesRes, permsRes] = await Promise.all([
        api.branches.getAll().catch(() => ({ branches: [] })),
        api.admin.getDepartments().catch(() => ({ departments: [] })),
        api.admin.getRoles().catch(() => ({ roles: [] })),
        api.admin.getPermissions().catch(() => ({ permissions: [] })),
      ]);

      setBranches(branchesRes.branches || []);
      setDepartments(deptsRes.departments || []);
      setRoles(rolesRes.roles || []);
      setAllPermissionsList(permsRes.permissions || []);
    } catch (err: any) {
      console.error('Failed to load reference data:', err);
    }
  };

  // -------------------------------------------------------------
  // LOAD ADMINS
  // -------------------------------------------------------------
  const loadAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const params: any = { limit: 100 };
      if (adminSearch) params.search = adminSearch;
      if (adminDeptFilter) params.departmentId = adminDeptFilter;
      if (adminRoleFilter) params.roleId = adminRoleFilter;
      if (adminStatusFilter) params.status = adminStatusFilter;
      if (adminBranchFilter) params.branchId = adminBranchFilter;

      const res = await api.admin.getAdmins(params);
      if (res.success) {
        setAdmins(res.admins || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load administrators.', 'error');
    } finally {
      setLoadingAdmins(false);
    }
  };

  // -------------------------------------------------------------
  // LOAD ROLES
  // -------------------------------------------------------------
  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await api.admin.getRoles();
      if (res.success) {
        setRoles(res.roles || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load roles.', 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  // -------------------------------------------------------------
  // LOAD MATRIX
  // -------------------------------------------------------------
  const loadMatrix = async () => {
    try {
      setLoadingMatrix(true);
      const res = await api.admin.getMatrix();
      if (res.success) {
        setMatrixRoles(res.roles || []);
        setMatrixPermissions(res.permissions || []);

        const map: Record<number, Set<number>> = {};
        for (const [rId, pIds] of Object.entries(res.matrix || {})) {
          map[Number(rId)] = new Set(pIds as number[]);
        }
        setMatrixData(map);
        // Deep copy for diff checking
        const initialMap: Record<number, Set<number>> = {};
        for (const [rId, set] of Object.entries(map)) {
          initialMap[Number(rId)] = new Set(set);
        }
        setInitialMatrixData(initialMap);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load permission matrix.', 'error');
    } finally {
      setLoadingMatrix(false);
    }
  };

  // -------------------------------------------------------------
  // LOAD DEPARTMENTS
  // -------------------------------------------------------------
  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const res = await api.admin.getDepartments();
      if (res.success) {
        setDepartments(res.departments || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load departments.', 'error');
    } finally {
      setLoadingDepartments(false);
    }
  };

  // -------------------------------------------------------------
  // LOAD AUDIT LOGS
  // -------------------------------------------------------------
  const loadAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.audit.getAll({ limit: 100 });
      if (res.logs) {
        // Filter logs related to admin actions or show all
        setAuditLogs(res.logs);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit logs.', 'error');
    } finally {
      setLoadingAudit(false);
    }
  };

  // -------------------------------------------------------------
  // ADMIN ACTIONS (CRUD, STATUS, PASSWORD, DELETE)
  // -------------------------------------------------------------
  const handleOpenCreateAdmin = () => {
    setAdminModalMode('create');
    setEditingAdmin(null);
    setFormFullName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('Password123!');
    setFormDepartmentId(departments.length > 0 ? String(departments[0].id) : '');
    setFormRoleId(roles.length > 0 ? String(roles[0].id) : '');
    setFormStatus('Active');
    setFormBranchScope('ALL');
    setFormAssignedBranchIds([]);
    setAdminError(null);
    setShowAdminModal(true);
  };

  const handleOpenEditAdmin = (admin: AdminUser) => {
    setAdminModalMode('edit');
    setEditingAdmin(admin);
    setFormFullName(admin.full_name || '');
    setFormUsername(admin.username || '');
    setFormEmail(admin.email || '');
    setFormPhone(admin.phone || '');
    setFormPassword('');
    setFormDepartmentId(admin.department_id ? String(admin.department_id) : '');
    setFormRoleId(admin.role_id ? String(admin.role_id) : '');
    setFormStatus(admin.status === 'Active' ? 'Active' : 'Disabled');

    const isAll = admin.allowed_branches === 'ALL' || !admin.allowed_branches;
    setFormBranchScope(isAll ? 'ALL' : 'SPECIFIC');

    const assignedIds = (admin.assigned_branches || []).map(b => b.id);
    if (assignedIds.length === 0 && admin.branch_id) assignedIds.push(admin.branch_id);
    setFormAssignedBranchIds(assignedIds);

    setAdminError(null);
    setShowAdminModal(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formUsername.trim() || !formEmail.trim()) {
      setAdminError('Full Name, Username, and Email are required.');
      return;
    }

    try {
      setSavingAdmin(true);
      setAdminError(null);

      const payload: any = {
        fullName: formFullName.trim(),
        username: formUsername.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim() || undefined,
        departmentId: formDepartmentId ? parseInt(formDepartmentId, 10) : null,
        roleId: formRoleId ? parseInt(formRoleId, 10) : null,
        status: formStatus,
        branchScope: formBranchScope,
        assignedBranchIds: formBranchScope === 'ALL' ? [] : formAssignedBranchIds,
      };

      if (adminModalMode === 'create') {
        payload.password = formPassword || 'Password123!';
        await api.admin.createAdmin(payload);
        showToast('Administrator created successfully.', 'success');
      } else if (editingAdmin) {
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }
        await api.admin.updateAdmin(editingAdmin.id, payload);
        showToast('Administrator updated successfully.', 'success');
      }

      setShowAdminModal(false);
      loadAdmins();
    } catch (err: any) {
      setAdminError(err.message || 'Operation failed.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (admin: AdminUser) => {
    const nextStatus = admin.status === 'Active' ? 'Disabled' : 'Active';
    try {
      await api.admin.toggleAdminStatus(admin.id, nextStatus);
      showToast(`Admin account ${nextStatus.toLowerCase()} successfully.`, 'success');
      loadAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to change admin status.', 'error');
    }
  };

  const handleOpenResetPassword = (admin: AdminUser) => {
    setResetTargetAdmin(admin);
    setNewPasswordValue('Password123!');
    setShowResetPasswordModal(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetTargetAdmin || !newPasswordValue.trim()) return;
    try {
      setSavingResetPassword(true);
      await api.admin.resetAdminPassword(resetTargetAdmin.id, newPasswordValue.trim());
      showToast(`Password for ${resetTargetAdmin.full_name} reset successfully.`, 'success');
      setShowResetPasswordModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setSavingResetPassword(false);
    }
  };

  const handleOpenDeleteAdmin = (admin: AdminUser) => {
    setDeleteTargetAdmin(admin);
    setShowDeleteAdminModal(true);
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!deleteTargetAdmin) return;
    try {
      setDeletingAdmin(true);
      await api.admin.deleteAdmin(deleteTargetAdmin.id);
      showToast(`Admin account ${deleteTargetAdmin.full_name} deleted permanently.`, 'success');
      setShowDeleteAdminModal(false);
      loadAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete admin.', 'error');
    } finally {
      setDeletingAdmin(false);
    }
  };

  // -------------------------------------------------------------
  // ADMIN PERMISSION INSPECTOR & OVERRIDES MODAL
  // -------------------------------------------------------------
  const handleOpenAdminDetail = async (admin: AdminUser) => {
    try {
      setLoadingAdminDetail(true);
      setSelectedAdminDetail(null);
      setDetailOverrides({});
      setDetailSearch('');
      setDetailModuleFilter('');

      const res = await api.admin.getAdminById(admin.id);
      if (res.success) {
        setSelectedAdminDetail(res);
        // Prepopulate overrides state
        const initialOverrides: Record<string, { permissionId: number; allowed: boolean | null }> = {};
        for (const [key, ov] of Object.entries(res.individualOverrides || {})) {
          const perm = res.allPermissions.find((p: PermissionItem) => p.permission_key === key);
          if (perm) {
            initialOverrides[key] = {
              permissionId: perm.id,
              allowed: (ov as any).allowed,
            };
          }
        }
        setDetailOverrides(initialOverrides);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load administrator details.', 'error');
    } finally {
      setLoadingAdminDetail(false);
    }
  };

  const handleSetOverride = (perm: PermissionItem, mode: 'INHERIT' | 'ALLOW' | 'DENY') => {
    setDetailOverrides(prev => {
      const next = { ...prev };
      if (mode === 'INHERIT') {
        next[perm.permission_key] = {
          permissionId: perm.id,
          allowed: null, // null removes override
        };
      } else {
        next[perm.permission_key] = {
          permissionId: perm.id,
          allowed: mode === 'ALLOW',
        };
      }
      return next;
    });
  };

  const handleSaveDetailOverrides = async () => {
    if (!selectedAdminDetail) return;
    try {
      setSavingOverrides(true);
      const overridesArray = Object.values(detailOverrides);
      await api.admin.updateUserOverrides(selectedAdminDetail.admin.id, overridesArray);
      showToast('Individual permission overrides updated successfully.', 'success');
      // Refresh detail modal
      handleOpenAdminDetail(selectedAdminDetail.admin);
    } catch (err: any) {
      showToast(err.message || 'Failed to save overrides.', 'error');
    } finally {
      setSavingOverrides(false);
    }
  };

  // -------------------------------------------------------------
  // ROLES ACTIONS (CRUD)
  // -------------------------------------------------------------
  const handleOpenCreateRole = () => {
    setRoleModalMode('create');
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormDescription('');
    setRoleFormDepartmentId('');
    setRoleFormStatus('Active');
    setRoleFormPermissions([]);
    setShowRoleModal(true);
  };

  const handleOpenEditRole = async (role: RoleItem) => {
    try {
      setRoleModalMode('edit');
      setEditingRole(role);
      setRoleFormName(role.name);
      setRoleFormDescription(role.description || '');
      setRoleFormDepartmentId(role.department_id ? String(role.department_id) : '');
      setRoleFormStatus(role.status);

      const res = await api.admin.getRoleById(role.id);
      if (res.success) {
        setRoleFormPermissions(res.permissionKeys || []);
      }
      setShowRoleModal(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load role details.', 'error');
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      showToast('Role name is required.', 'error');
      return;
    }

    try {
      setSavingRole(true);
      const payload = {
        name: roleFormName.trim(),
        description: roleFormDescription.trim() || undefined,
        departmentId: roleFormDepartmentId ? parseInt(roleFormDepartmentId, 10) : null,
        status: roleFormStatus,
        permissionKeys: roleFormPermissions,
      };

      if (roleModalMode === 'create') {
        await api.admin.createRole(payload);
        showToast('Role created successfully.', 'success');
      } else if (editingRole) {
        await api.admin.updateRole(editingRole.id, payload);
        showToast('Role updated successfully.', 'success');
      }

      setShowRoleModal(false);
      loadRoles();
      if (activeTab === 'matrix') loadMatrix();
    } catch (err: any) {
      showToast(err.message || 'Failed to save role.', 'error');
    } finally {
      setSavingRole(false);
    }
  };

  const handleOpenDeleteRole = (role: RoleItem) => {
    setDeleteTargetRole(role);
    setShowDeleteRoleModal(true);
  };

  const handleConfirmDeleteRole = async () => {
    if (!deleteTargetRole) return;
    try {
      setDeletingRole(true);
      await api.admin.deleteRole(deleteTargetRole.id);
      showToast(`Role ${deleteTargetRole.name} deleted successfully.`, 'success');
      setShowDeleteRoleModal(false);
      loadRoles();
      if (activeTab === 'matrix') loadMatrix();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role.', 'error');
    } finally {
      setDeletingRole(false);
    }
  };

  // -------------------------------------------------------------
  // MATRIX INTERACTIONS
  // -------------------------------------------------------------
  const toggleMatrixCell = (roleId: number, permissionId: number) => {
    // Check if Super Admin
    const role = matrixRoles.find(r => r.id === roleId);
    if (role?.name === 'Super Admin') return; // locked

    setMatrixData(prev => {
      const currentRolePerms = new Set(prev[roleId] || []);
      if (currentRolePerms.has(permissionId)) {
        currentRolePerms.delete(permissionId);
      } else {
        currentRolePerms.add(permissionId);
      }
      return {
        ...prev,
        [roleId]: currentRolePerms,
      };
    });
  };

  // Calculate pending changes for Matrix
  const pendingMatrixChangesCount = useMemo(() => {
    let count = 0;
    for (const role of matrixRoles) {
      if (role.name === 'Super Admin') continue;
      const initialSet = initialMatrixData[role.id] || new Set();
      const currentSet = matrixData[role.id] || new Set();

      for (const p of matrixPermissions) {
        const wasIn = initialSet.has(p.id);
        const isIn = currentSet.has(p.id);
        if (wasIn !== isIn) count++;
      }
    }
    return count;
  }, [matrixRoles, matrixPermissions, matrixData, initialMatrixData]);

  const handleSaveMatrix = async () => {
    try {
      setSavingMatrix(true);
      const updates: { roleId: number; permissionId: number; allowed: boolean }[] = [];

      for (const role of matrixRoles) {
        if (role.name === 'Super Admin') continue;
        const initialSet = initialMatrixData[role.id] || new Set();
        const currentSet = matrixData[role.id] || new Set();

        for (const p of matrixPermissions) {
          const wasIn = initialSet.has(p.id);
          const isIn = currentSet.has(p.id);
          if (wasIn !== isIn) {
            updates.push({
              roleId: role.id,
              permissionId: p.id,
              allowed: isIn,
            });
          }
        }
      }

      if (updates.length === 0) {
        showToast('No changes detected in matrix.', 'info');
        return;
      }

      await api.admin.updateMatrix(updates);
      setMatrixSaveSuccess(true);
      setTimeout(() => setMatrixSaveSuccess(false), 3000);
      showToast(`Updated ${updates.length} permission assignments across roles.`, 'success');
      loadMatrix();
    } catch (err: any) {
      showToast(err.message || 'Failed to save matrix.', 'error');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleDiscardMatrixChanges = () => {
    const rollbackMap: Record<number, Set<number>> = {};
    for (const [rId, set] of Object.entries(initialMatrixData)) {
      rollbackMap[Number(rId)] = new Set(set);
    }
    setMatrixData(rollbackMap);
    showToast('Matrix changes discarded.', 'info');
  };

  // -------------------------------------------------------------
  // GROUPING PERMISSIONS BY MODULE
  // -------------------------------------------------------------
  const groupedMatrixPermissions = useMemo(() => {
    const filtered = matrixPermissions.filter(p => {
      const matchSearch =
        !matrixSearch ||
        p.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        p.permission_key.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        p.module.toLowerCase().includes(matrixSearch.toLowerCase());
      const matchModule = !matrixModuleFilter || p.module === matrixModuleFilter;
      return matchSearch && matchModule;
    });

    const groups: Record<string, PermissionItem[]> = {};
    for (const p of filtered) {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    }
    return groups;
  }, [matrixPermissions, matrixSearch, matrixModuleFilter]);

  const allModulesList = useMemo(() => {
    const set = new Set<string>();
    matrixPermissions.forEach(p => set.add(p.module));
    return Array.from(set).sort();
  }, [matrixPermissions]);

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">System Administration & Access Control</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage administrators, departmental access scopes, dynamic RBAC roles, live permission matrix, and system audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action / Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadReferenceData();
              if (activeTab === 'admins') loadAdmins();
              if (activeTab === 'roles') loadRoles();
              if (activeTab === 'matrix') loadMatrix();
              if (activeTab === 'departments') loadDepartments();
              if (activeTab === 'audit') loadAuditLogs();
              showToast('System data refreshed.', 'info');
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>

          {activeTab === 'admins' && hasPermission('admins.create') && (
            <button
              onClick={handleOpenCreateAdmin}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Administrator</span>
            </button>
          )}

          {activeTab === 'roles' && hasPermission('roles.create') && (
            <button
              onClick={handleOpenCreateRole}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'admins'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Administrators & Users</span>
          <span className="ml-1.5 px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-700">
            {admins.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Dynamic Roles</span>
          <span className="ml-1.5 px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-700">
            {roles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Role-Permission Matrix</span>
          {pendingMatrixChangesCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-amber-500 text-white animate-pulse">
              {pendingMatrixChangesCount} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departments</span>
          <span className="ml-1.5 px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-700">
            {departments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ADMINISTRATORS MANAGEMENT                          */}
      {/* ========================================================= */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Admins</p>
                <h3 className="text-xl font-black text-slate-900">{admins.length}</h3>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Admins</p>
                <h3 className="text-xl font-black text-slate-900">
                  {admins.filter(a => a.status === 'Active').length}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Super Admins</p>
                <h3 className="text-xl font-black text-slate-900">
                  {admins.filter(a => a.role === 'SUPER_ADMIN' || a.role_name === 'Super Admin').length}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Branch Scoped</p>
                <h3 className="text-xl font-black text-slate-900">
                  {admins.filter(a => a.allowed_branches !== 'ALL').length}
                </h3>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by full name, username, email, or employee ID..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadAdmins()}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Department Filter */}
            <select
              value={adminDeptFilter}
              onChange={e => {
                setAdminDeptFilter(e.target.value);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={adminRoleFilter}
              onChange={e => {
                setAdminRoleFilter(e.target.value);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Roles</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={adminStatusFilter}
              onChange={e => {
                setAdminStatusFilter(e.target.value);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>

            {/* Branch Filter */}
            <select
              value={adminBranchFilter}
              onChange={e => {
                setAdminBranchFilter(e.target.value);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={loadAdmins}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
            >
              Filter
            </button>
          </div>

          {/* Admins Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Admin / User</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Branch Access</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Login</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingAdmins ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span>Loading administrators...</span>
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <span>No administrators found matching current filters.</span>
                      </td>
                    </tr>
                  ) : (
                    admins.map(admin => {
                      const isSuper = admin.role === 'SUPER_ADMIN' || admin.role_name === 'Super Admin';
                      const isSelf = currentUser?.id === admin.id;

                      // Department badge color
                      let deptColor = 'bg-slate-100 text-slate-700';
                      if (admin.department_code === 'OPERATION') deptColor = 'bg-blue-100 text-blue-800 border-blue-200';
                      else if (admin.department_code === 'NOC') deptColor = 'bg-purple-100 text-purple-800 border-purple-200';
                      else if (admin.department_code === 'BRANCHES') deptColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                      // Role badge color
                      let roleBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700">
                          {admin.role_name || admin.role}
                        </span>
                      );
                      if (isSuper) {
                        roleBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                            <Shield className="w-3 h-3 text-amber-600" />
                            <span>Super Admin</span>
                          </span>
                        );
                      } else if (admin.role_name === 'Operation Manager') {
                        roleBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Briefcase className="w-3 h-3" />
                            <span>Operation Manager</span>
                          </span>
                        );
                      } else if (admin.role_name === 'NOC Manager') {
                        roleBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Radio className="w-3 h-3" />
                            <span>NOC Manager</span>
                          </span>
                        );
                      } else if (admin.role_name === 'Branch Manager') {
                        roleBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Building2 className="w-3 h-3" />
                            <span>Branch Manager</span>
                          </span>
                        );
                      }

                      return (
                        <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Name & Username */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {admin.full_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{admin.full_name}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-indigo-100 text-indigo-700 uppercase">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">@{admin.username}</span>
                                {admin.employee_id && (
                                  <span className="text-[10px] text-slate-400 ml-2">({admin.employee_id})</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-700">{admin.email}</p>
                            <p className="text-[11px] text-slate-400">{admin.phone || '—'}</p>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${deptColor}`}>
                              {admin.department_name || admin.department_code || 'Unassigned'}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">{roleBadge}</td>

                          {/* Branch Scope */}
                          <td className="py-3.5 px-4">
                            {admin.allowed_branches === 'ALL' || isSuper ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                🌐 All Branches
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                {(admin.assigned_branches || []).length > 0 ? (
                                  admin.assigned_branches?.map(b => (
                                    <span
                                      key={b.id}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[120px]"
                                    >
                                      {b.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px]">No branches assigned</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <button
                              disabled={!hasPermission('admins.disable') || isSelf}
                              onClick={() => handleToggleAdminStatus(admin)}
                              title={
                                isSelf
                                  ? 'You cannot disable yourself'
                                  : 'Click to toggle Active / Disabled'
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all ${
                                admin.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              } ${!hasPermission('admins.disable') || isSelf ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  admin.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{admin.status}</span>
                            </button>
                          </td>

                          {/* Last Login */}
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {admin.last_login ? (
                              new Date(admin.last_login).toLocaleString()
                            ) : (
                              <span className="text-slate-400 italic">Never logged in</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Permissions */}
                              <button
                                onClick={() => handleOpenAdminDetail(admin)}
                                title="Inspect & Override Effective Permissions"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>

                              {/* Edit Admin */}
                              {hasPermission('admins.edit') && (
                                <button
                                  onClick={() => handleOpenEditAdmin(admin)}
                                  title="Edit Admin"
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Reset Password */}
                              {hasPermission('admins.edit') && (
                                <button
                                  onClick={() => handleOpenResetPassword(admin)}
                                  title="Reset Password"
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Admin */}
                              {hasPermission('admins.delete') && (
                                <button
                                  disabled={isSelf}
                                  onClick={() => handleOpenDeleteAdmin(admin)}
                                  title={isSelf ? 'Cannot delete self' : 'Delete Administrator'}
                                  className={`p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${
                                    isSelf ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DYNAMIC ROLES MANAGEMENT                           */}
      {/* ========================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configured System & Custom Roles</h3>
              <p className="text-xs text-slate-500">
                Roles define default functional permissions across all operational modules.
              </p>
            </div>
            {hasPermission('roles.create') && (
              <button
                onClick={handleOpenCreateRole}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Role</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map(role => {
              const isSuper = role.name === 'Super Admin';
              return (
                <div
                  key={role.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">{role.name}</h4>
                          {role.is_system && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              System
                            </span>
                          )}
                        </div>
                        {role.department_name && (
                          <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                            {role.department_name}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          role.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {role.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 min-h-[36px] line-clamp-2 mb-4 leading-relaxed">
                      {role.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl mb-4 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Assigned Users
                        </span>
                        <span className="text-sm font-black text-slate-800">{role.users_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Permissions
                        </span>
                        <span className="text-sm font-black text-indigo-600">
                          {isSuper ? 'ALL (~40)' : role.permissions_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveTab('matrix');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View in Matrix</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {hasPermission('roles.edit') && (
                        <button
                          onClick={() => handleOpenEditRole(role)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Role & Permissions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {!role.is_system && hasPermission('roles.delete') && (
                        <button
                          onClick={() => handleOpenDeleteRole(role)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ROLE-PERMISSION MATRIX                             */}
      {/* ========================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Matrix Controls & Pending Save Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter permissions by name, key, or module..."
                  value={matrixSearch}
                  onChange={e => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={matrixModuleFilter}
                onChange={e => setMatrixModuleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white cursor-pointer"
              >
                <option value="">All Functional Modules</option>
                {allModulesList.map(mod => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>

              <span className="text-xs text-slate-400 font-medium">
                Showing {Object.values(groupedMatrixPermissions).flat().length} permissions across {matrixRoles.length} roles
              </span>
            </div>

            {/* Matrix Action Bar */}
            <div className="flex items-center gap-2">
              {pendingMatrixChangesCount > 0 && (
                <>
                  <span className="text-xs font-bold text-amber-600 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 animate-pulse">
                    {pendingMatrixChangesCount} Unsaved Changes
                  </span>
                  <button
                    onClick={handleDiscardMatrixChanges}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Discard
                  </button>
                </>
              )}

              {hasPermission('permissions.assign') && (
                <button
                  disabled={savingMatrix || pendingMatrixChangesCount === 0}
                  onClick={handleSaveMatrix}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl shadow-xs transition-all ${
                    pendingMatrixChangesCount > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-600/30'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {savingMatrix ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Matrix Assignments</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-md">
                  <tr className="text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-3 px-4 w-80 sticky left-0 z-30 bg-slate-900 border-r border-slate-800">
                      Module & Permission
                    </th>
                    {matrixRoles.map(role => {
                      const isSuper = role.name === 'Super Admin';
                      return (
                        <th
                          key={role.id}
                          className="py-3 px-4 text-center min-w-[140px] border-r border-slate-800/80"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-extrabold text-white text-xs">{role.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {isSuper ? 'Locked (All Access)' : `${(matrixData[role.id] || new Set()).size} perms`}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingMatrix ? (
                    <tr>
                      <td colSpan={matrixRoles.length + 1} className="py-16 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span>Loading matrix data...</span>
                      </td>
                    </tr>
                  ) : Object.keys(groupedMatrixPermissions).length === 0 ? (
                    <tr>
                      <td colSpan={matrixRoles.length + 1} className="py-12 text-center text-slate-400">
                        No permissions found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedMatrixPermissions).map(([moduleName, perms]) => (
                      <React.Fragment key={moduleName}>
                        {/* Module Header Bar */}
                        <tr className="bg-slate-100/90 font-black text-slate-800 text-[11px] tracking-wide uppercase border-y border-slate-200">
                          <td className="py-2.5 px-4 sticky left-0 z-10 bg-slate-100 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                              <span>{moduleName}</span>
                              <span className="text-[10px] text-slate-500 font-normal lowercase">
                                ({perms.length} actions)
                              </span>
                            </div>
                          </td>
                          {matrixRoles.map(role => (
                            <td key={role.id} className="py-2 px-2 text-center border-r border-slate-200">
                              {role.name !== 'Super Admin' && hasPermission('permissions.assign') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allChecked = perms.every(p => matrixData[role.id]?.has(p.id));
                                    setMatrixData(prev => {
                                      const nextSet = new Set(prev[role.id] || []);
                                      perms.forEach(p => {
                                        if (allChecked) nextSet.delete(p.id);
                                        else nextSet.add(p.id);
                                      });
                                      return { ...prev, [role.id]: nextSet };
                                    });
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                >
                                  {perms.every(p => matrixData[role.id]?.has(p.id)) ? 'Clear' : 'Check All'}
                                </button>
                              )}
                            </td>
                          ))}
                        </tr>

                        {/* Module Permissions Rows */}
                        {perms.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 sticky left-0 z-10 bg-white border-r border-slate-200">
                              <div>
                                <span className="font-bold text-slate-900 block">{p.name}</span>
                                <span className="text-[10px] font-mono text-slate-400 block">{p.permission_key}</span>
                                {p.description && (
                                  <span className="text-[10px] text-slate-500 block line-clamp-1">{p.description}</span>
                                )}
                              </div>
                            </td>

                            {matrixRoles.map(role => {
                              const isSuper = role.name === 'Super Admin';
                              const isChecked = isSuper ? true : matrixData[role.id]?.has(p.id);
                              const wasChecked = isSuper ? true : initialMatrixData[role.id]?.has(p.id);
                              const isDirty = !isSuper && isChecked !== wasChecked;

                              return (
                                <td
                                  key={role.id}
                                  className={`py-2 px-4 text-center border-r border-slate-100 ${
                                    isDirty ? 'bg-amber-50/60' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-center">
                                    {isSuper ? (
                                      <div
                                        title="Super Admin has immutable full access"
                                        className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center cursor-not-allowed"
                                      >
                                        <Lock className="w-3.5 h-3.5" />
                                      </div>
                                    ) : (
                                      <button
                                        disabled={!hasPermission('permissions.assign')}
                                        onClick={() => toggleMatrixCell(role.id, p.id)}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-transparent hover:bg-slate-200 border border-slate-200'
                                        }`}
                                      >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DEPARTMENTS VIEW                                   */}
      {/* ========================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Organizational Departmental Scopes</h3>
            <p className="text-xs text-slate-500">
              The platform operates across three primary functional pillars. Administrators are scoped to these core departments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {departments.map(dept => {
              let icon = <Briefcase className="w-6 h-6 text-blue-600" />;
              let gradient = 'from-blue-600 to-indigo-600';
              let badgeText = 'Headquarters Operations';

              if (dept.code === 'NOC') {
                icon = <Server className="w-6 h-6 text-purple-600" />;
                gradient = 'from-purple-600 to-violet-600';
                badgeText = 'Network & Infrastructure';
              } else if (dept.code === 'BRANCHES') {
                icon = <Building2 className="w-6 h-6 text-emerald-600" />;
                gradient = 'from-emerald-600 to-teal-600';
                badgeText = '20+ Physical Branches';
              }

              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`} />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-xs">
                        {icon}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                        {dept.code}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-slate-900 mb-1">{dept.name}</h4>
                    <p className="text-xs font-semibold text-indigo-600 mb-3">{badgeText}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                      {dept.description ||
                        (dept.code === 'OPERATION'
                          ? 'Oversees central tasks, directives, executive instructions, podiums, and KPI targets across the company.'
                          : dept.code === 'NOC'
                          ? 'Monitors telecommunications health, manages network incident escalations, and resolves customer connectivity problems.'
                          : 'Manages physical branch counters, staff attendance, customer onboarding, and local follow-ups.')}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Staff & Admins
                      </span>
                      <span className="text-base font-black text-slate-900">{dept.active_users_count || 0}</span>
                    </div>

                    <button
                      onClick={() => {
                        setAdminDeptFilter(String(dept.id));
                        setActiveTab('admins');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                    >
                      View Members →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: SECURITY AUDIT TRAIL                               */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by user, action, or details..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              onClick={loadAuditLogs}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Module</th>
                    <th className="py-3.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span>Loading audit logs...</span>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs
                      .filter(l => {
                        if (!auditSearch) return true;
                        const s = auditSearch.toLowerCase();
                        return (
                          (l.user_name && l.user_name.toLowerCase().includes(s)) ||
                          (l.action && l.action.toLowerCase().includes(s)) ||
                          (l.module && l.module.toLowerCase().includes(s)) ||
                          (l.details && JSON.stringify(l.details).toLowerCase().includes(s))
                        );
                      })
                      .map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {log.user_name || log.username || `User #${log.user_id}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-600">{log.module}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] max-w-md truncate">
                            {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE / EDIT ADMIN                              */}
      {/* ========================================================= */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title={adminModalMode === 'create' ? 'Create Administrator' : `Edit Administrator: ${editingAdmin?.full_name}`}
        subtitle="Configure profile details, assigned department, dynamic role, and branch scoping."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveAdmin} className="space-y-5">
          {adminError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{adminError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formFullName}
                onChange={e => setFormFullName(e.target.value)}
                placeholder="e.g. Ramesh Thapa"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={adminModalMode === 'edit'}
                value={formUsername}
                onChange={e => setFormUsername(e.target.value)}
                placeholder="e.g. ramesh.thapa"
                className={`w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 ${
                  adminModalMode === 'edit' ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="ramesh@fiberworld.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
              <input
                type="text"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="+977 9801234567"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Department (Required: exactly 3 choices) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formDepartmentId}
                onChange={e => setFormDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Assignment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Role <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formRoleId}
                onChange={e => setFormRoleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="">Select Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.is_system ? '(System)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>

            {/* Initial Password (if create mode) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {adminModalMode === 'create' ? 'Initial Password' : 'Change Password (leave empty to keep current)'}
              </label>
              <input
                type="text"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder={adminModalMode === 'create' ? 'Password123!' : 'Enter new password if changing'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Branch-Level Scoping Control */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-900 mb-0.5">
                Branch Access Scope
              </label>
              <p className="text-[11px] text-slate-500">
                Determine whether this administrator has global oversight across all branches or is restricted to specific locations.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="branchScope"
                  checked={formBranchScope === 'ALL'}
                  onChange={() => setFormBranchScope('ALL')}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>🌐 All Branches (Global Access)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="branchScope"
                  checked={formBranchScope === 'SPECIFIC'}
                  onChange={() => setFormBranchScope('SPECIFIC')}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>🏢 Specific Branches (Restricted)</span>
              </label>
            </div>

            {formBranchScope === 'SPECIFIC' && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    Selected Branches ({formAssignedBranchIds.length} of {branches.length}):
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFormAssignedBranchIds(branches.map(b => b.id))}
                      className="text-indigo-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setFormAssignedBranchIds([])}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                  {branches.map(branch => {
                    const isSelected = formAssignedBranchIds.includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                            : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setFormAssignedBranchIds(prev => prev.filter(id => id !== branch.id));
                            } else {
                              setFormAssignedBranchIds(prev => [...prev, branch.id]);
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className="truncate">{branch.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdminModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAdmin}
              className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {savingAdmin && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{adminModalMode === 'create' ? 'Create Admin Account' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: ADMIN DETAIL & PERMISSION OVERRIDES INSPECTOR   */}
      {/* ========================================================= */}
      <Modal
        isOpen={Boolean(selectedAdminDetail)}
        onClose={() => setSelectedAdminDetail(null)}
        title={`Access Breakdown: ${selectedAdminDetail?.admin.full_name}`}
        subtitle={`Role: ${selectedAdminDetail?.admin.role_name || selectedAdminDetail?.admin.role} | Department: ${selectedAdminDetail?.admin.department_name || 'Unassigned'}`}
        maxWidth="4xl"
      >
        {selectedAdminDetail && (
          <div className="space-y-5">
            {/* Overview Banner */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                  {selectedAdminDetail.admin.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {selectedAdminDetail.admin.full_name}{' '}
                    <span className="text-slate-400 font-mono text-xs">(@{selectedAdminDetail.admin.username})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedAdminDetail.admin.email} • {selectedAdminDetail.admin.phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedAdminDetail.admin.allowed_branches === 'ALL'
                    ? '🌐 All Branches'
                    : `🏢 ${selectedAdminDetail.admin.assigned_branches?.length || 0} Branches`}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    selectedAdminDetail.admin.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedAdminDetail.admin.status}
                </span>
              </div>
            </div>

            {/* Explanatory Note */}
            <div className="flex items-center gap-3 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900">
              <Info className="w-4 h-4 shrink-0 text-indigo-600" />
              <span>
                <strong>Effective Permissions Calculation:</strong> Starts with permissions inherited from the user's role.
                Individual overrides can explicitly <strong>ALLOW</strong> or <strong>DENY</strong> specific capabilities,
                taking precedence over the role.
              </span>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={detailSearch}
                  onChange={e => setDetailSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <select
                value={detailModuleFilter}
                onChange={e => setDetailModuleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white cursor-pointer"
              >
                <option value="">All Modules</option>
                {Array.from(new Set(selectedAdminDetail.allPermissions.map(p => p.module))).sort().map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions Breakdown Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Module & Permission</th>
                    <th className="py-2.5 px-3 text-center">Role Default</th>
                    <th className="py-2.5 px-3 text-center">Override Setting</th>
                    <th className="py-2.5 px-3 text-center">Effective Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAdminDetail.allPermissions
                    .filter(p => {
                      const matchSearch =
                        !detailSearch ||
                        p.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
                        p.permission_key.toLowerCase().includes(detailSearch.toLowerCase()) ||
                        p.module.toLowerCase().includes(detailSearch.toLowerCase());
                      const matchModule = !detailModuleFilter || p.module === detailModuleFilter;
                      return matchSearch && matchModule;
                    })
                    .map(p => {
                      const roleAllowed = Boolean(selectedAdminDetail.rolePermissions[p.permission_key]);
                      const overrideObj = detailOverrides[p.permission_key];
                      const hasOverride = overrideObj && overrideObj.allowed !== null;
                      const overrideAllowed = hasOverride ? overrideObj.allowed : null;

                      // Effective allowed
                      const effectiveAllowed = hasOverride ? Boolean(overrideAllowed) : roleAllowed;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 block">{p.permission_key}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{p.module}</span>
                          </td>

                          {/* Role default */}
                          <td className="py-2.5 px-3 text-center">
                            {roleAllowed ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Granted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-500">
                                Denied
                              </span>
                            )}
                          </td>

                          {/* Override 3-way toggle */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleSetOverride(p, 'INHERIT')}
                                className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                                  !hasOverride ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Inherit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetOverride(p, 'ALLOW')}
                                className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                                  hasOverride && overrideAllowed === true
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-emerald-700'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetOverride(p, 'DENY')}
                                className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                                  hasOverride && overrideAllowed === false
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-rose-700'
                                }`}
                              >
                                Deny
                              </button>
                            </div>
                          </td>

                          {/* Effective result */}
                          <td className="py-2.5 px-3 text-center">
                            {effectiveAllowed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>ALLOWED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                                <X className="w-3 h-3 stroke-[3]" />
                                <span>DENIED</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                Changes to overrides will take effect immediately upon saving.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAdminDetail(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                {hasPermission('permissions.assign') && (
                  <button
                    type="button"
                    disabled={savingOverrides}
                    onClick={handleSaveDetailOverrides}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {savingOverrides && (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>Save Custom Overrides</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: RESET PASSWORD                                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title="Reset Administrator Password"
        subtitle={`User: ${resetTargetAdmin?.full_name} (@${resetTargetAdmin?.username})`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter a new password for this administrator. The password must be at least 6 characters long.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
            <input
              type="text"
              value={newPasswordValue}
              onChange={e => setNewPasswordValue(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowResetPasswordModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={savingResetPassword || newPasswordValue.length < 6}
              onClick={handleConfirmResetPassword}
              className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingResetPassword ? 'Resetting...' : 'Confirm Reset'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: DELETE ADMIN CONFIRMATION                        */}
      {/* ========================================================= */}
      <Modal
        isOpen={showDeleteAdminModal}
        onClose={() => setShowDeleteAdminModal(false)}
        title="Delete Administrator Account"
        subtitle={`Are you sure you want to permanently delete ${deleteTargetAdmin?.full_name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
            <strong>Warning:</strong> This action cannot be undone. All assigned branch bindings, custom overrides, and authentication credentials for <strong>@{deleteTargetAdmin?.username}</strong> will be permanently purged.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowDeleteAdminModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={deletingAdmin}
              onClick={handleConfirmDeleteAdmin}
              className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
            >
              {deletingAdmin ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 5: CREATE / EDIT ROLE                               */}
      {/* ========================================================= */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={roleModalMode === 'create' ? 'Create Custom Role' : `Edit Role: ${editingRole?.name}`}
        subtitle="Define role identity, operational department, and assign baseline functional permissions."
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={editingRole?.is_system && editingRole?.name === 'Super Admin'}
                value={roleFormName}
                onChange={e => setRoleFormName(e.target.value)}
                placeholder="e.g. Field Supervisor"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Associated Department</label>
              <select
                value={roleFormDepartmentId}
                onChange={e => setRoleFormDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="">Cross-Departmental / None</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={roleFormStatus}
                onChange={e => setRoleFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={roleFormDescription}
              onChange={e => setRoleFormDescription(e.target.value)}
              placeholder="Describe the operational responsibilities of this role..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Module-by-Module Permission Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-900">
                Functional Permission Assignments ({roleFormPermissions.length} selected)
              </label>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setRoleFormPermissions(allPermissionsList.map(p => p.permission_key))}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setRoleFormPermissions([])}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              {allModulesList.map(modName => {
                const modPerms = allPermissionsList.filter(p => p.module === modName);
                const allModChecked = modPerms.every(p => roleFormPermissions.includes(p.permission_key));

                return (
                  <div key={modName} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        {modName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (allModChecked) {
                            setRoleFormPermissions(prev =>
                              prev.filter(k => !modPerms.some(p => p.permission_key === k))
                            );
                          } else {
                            const newKeys = modPerms.map(p => p.permission_key);
                            setRoleFormPermissions(prev => Array.from(new Set([...prev, ...newKeys])));
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {allModChecked ? 'Deselect Module' : 'Select All Module'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modPerms.map(p => {
                        const isChecked = roleFormPermissions.includes(p.permission_key);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
                              isChecked
                                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-semibold'
                                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setRoleFormPermissions(prev => prev.filter(k => k !== p.permission_key));
                                } else {
                                  setRoleFormPermissions(prev => [...prev, p.permission_key]);
                                }
                              }}
                              className="mt-0.5 w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <div className="min-w-0">
                              <span className="block leading-tight">{p.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 block">{p.permission_key}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRole}
              className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {savingRole && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{roleModalMode === 'create' ? 'Create Role' : 'Save Role'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 6: DELETE ROLE CONFIRMATION                         */}
      {/* ========================================================= */}
      <Modal
        isOpen={showDeleteRoleModal}
        onClose={() => setShowDeleteRoleModal(false)}
        title="Delete Custom Role"
        subtitle={`Are you sure you want to delete ${deleteTargetRole?.name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deleting this role will remove all of its default permissions mappings. System roles cannot be deleted.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowDeleteRoleModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={deletingRole}
              onClick={handleConfirmDeleteRole}
              className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
            >
              {deletingRole ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Administration;
