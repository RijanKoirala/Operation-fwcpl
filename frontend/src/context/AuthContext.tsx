import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (username: string) => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res && res.user) {
        let parsedPerms = res.user.permissions;
        if (typeof parsedPerms === 'string') {
          try { parsedPerms = JSON.parse(parsedPerms); } catch {}
        }
        setUser({
          id: res.user.id,
          employeeId: res.user.employee_id || res.user.employeeId,
          employee_id: res.user.employee_id || res.user.employeeId,
          username: res.user.username,
          email: res.user.email,
          name: res.user.full_name || res.user.fullName || res.user.name || res.user.username,
          fullName: res.user.full_name || res.user.fullName || res.user.name || res.user.username,
          full_name: res.user.full_name || res.user.fullName || res.user.name || res.user.username,
          phone: res.user.phone,
          role: res.user.role || res.user.role_name || res.user.roleName || 'STAFF',
          roleId: res.user.role_id || res.user.roleId,
          role_id: res.user.role_id || res.user.roleId,
          roleName: res.user.role_name || res.user.roleName,
          role_name: res.user.role_name || res.user.roleName,
          status: res.user.status,
          branchId: res.user.branch_id || res.user.branchId,
          branch_id: res.user.branch_id || res.user.branchId,
          branchName: res.user.branch_name || res.user.branchName,
          branch_name: res.user.branch_name || res.user.branchName,
          branchCode: res.user.branch_code || res.user.branchCode,
          branch_code: res.user.branch_code || res.user.branchCode,
          designationId: res.user.designation_id || res.user.designationId,
          designation_id: res.user.designation_id || res.user.designationId,
          designation: res.user.designation_name || res.user.designationName,
          designationName: res.user.designation_name || res.user.designationName,
          designation_name: res.user.designation_name || res.user.designationName,
          departmentId: res.user.department_id || res.user.departmentId,
          department_id: res.user.department_id || res.user.departmentId,
          department: res.user.department_name || res.user.departmentName,
          departmentName: res.user.department_name || res.user.departmentName,
          department_name: res.user.department_name || res.user.departmentName,
          departmentCode: res.user.department_code || res.user.departmentCode,
          department_code: res.user.department_code || res.user.departmentCode,
          permissions: parsedPerms,
          assignedBranchIds: res.user.assigned_branch_ids || res.user.assignedBranchIds || [],
          assigned_branch_ids: res.user.assigned_branch_ids || res.user.assignedBranchIds || [],
          allowedBranches: res.user.allowed_branches || res.user.allowedBranches,
          allowed_branches: res.user.allowed_branches || res.user.allowedBranches,
        });
      }
    } catch (err: any) {
      console.warn('refreshUser error:', err?.message || err);
      // Only clear user and token if unauthorized (401)
      const msg = String(err?.message || '');
      if (msg.includes('401') || msg.includes('Authentication required') || msg.includes('Invalid or expired')) {
        setUser(null);
        removeAuthToken();
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = getAuthToken();
    if (savedToken) {
      refreshUser();
      // Safety fallback: Never keep user stuck on loading spinner for more than 4 seconds
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string = 'Password123!') => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res && res.success && res.token && res.user) {
        setAuthToken(res.token);
        setToken(res.token);
        let parsedPerms = res.user.permissions;
        if (typeof parsedPerms === 'string') {
          try { parsedPerms = JSON.parse(parsedPerms); } catch {}
        }
        setUser({
          ...res.user,
          employeeId: res.user.employee_id || res.user.employeeId,
          employee_id: res.user.employee_id || res.user.employeeId,
          fullName: res.user.full_name || res.user.fullName || res.user.name || res.user.username,
          full_name: res.user.full_name || res.user.fullName || res.user.name || res.user.username,
          roleId: res.user.role_id || res.user.roleId,
          role_id: res.user.role_id || res.user.roleId,
          roleName: res.user.role_name || res.user.roleName,
          role_name: res.user.role_name || res.user.roleName,
          departmentId: res.user.department_id || res.user.departmentId,
          department_id: res.user.department_id || res.user.departmentId,
          departmentName: res.user.department_name || res.user.departmentName,
          department_name: res.user.department_name || res.user.departmentName,
          departmentCode: res.user.department_code || res.user.departmentCode,
          department_code: res.user.department_code || res.user.departmentCode,
          permissions: parsedPerms,
          assignedBranchIds: res.user.assigned_branch_ids || res.user.assignedBranchIds || [],
          assigned_branch_ids: res.user.assigned_branch_ids || res.user.assignedBranchIds || [],
          allowedBranches: res.user.allowed_branches || res.user.allowedBranches,
          allowed_branches: res.user.allowed_branches || res.user.allowedBranches,
        });
      } else {
        throw new Error(res?.message || 'Login failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (username: string) => {
    await login(username, 'Password123!');
  };

  const logout = () => {
    try {
      api.post('/auth/logout', {}).catch(() => {});
    } catch {}
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    const roleUpper = (user.role || '').toUpperCase().replace(/\s+/g, '_');
    const roleNameUpper = (user.roleName || user.role_name || '').toUpperCase().replace(/\s+/g, '_');
    if (roleUpper === 'SUPER_ADMIN' || roleNameUpper === 'SUPER_ADMIN') return true;

    if (user.permissions && typeof user.permissions === 'object') {
      if (user.permissions[permissionKey] !== undefined) {
        return Boolean(user.permissions[permissionKey]);
      }
      // Module-level check: if checking 'tasks', check 'tasks.view' or any 'tasks.*'
      if (!permissionKey.includes('.')) {
        if (user.permissions[`${permissionKey}.view`] !== undefined) {
          return Boolean(user.permissions[`${permissionKey}.view`]);
        }
        const hasAnyModulePerm = Object.entries(user.permissions).some(
          ([k, v]) => k.startsWith(`${permissionKey}.`) && Boolean(v)
        );
        if (hasAnyModulePerm) return true;
      }
      return false;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchDemoRole,
        hasRole,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
