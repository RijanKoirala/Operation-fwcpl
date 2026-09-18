const BASE_URL = '/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('fwcpl_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('fwcpl_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('fwcpl_token');
};

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (netErr.name === 'AbortError') {
      throw new Error('Server request timed out. Please check server status.');
    }
    throw netErr;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    removeAuthToken();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.error && data.error !== data.message ? ` (${data.error})` : '';
    throw new Error((data.message || `Request failed with status ${response.status}`) + detail);
  }

  return data;
}

export const toQueryString = (params?: Record<string, any>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null') {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
};

export const api = {
  // Generic HTTP methods
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  downloadCsv: async (reportType: string, params: Record<string, string> = {}) => {
    const token = getAuthToken();
    const query = new URLSearchParams({ ...params, exportFormat: 'csv' }).toString();
    const response = await fetch(`${BASE_URL}/reports/${reportType}?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to download report');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FWCPL_${reportType}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Auth
  auth: {
    login: (body: any) => api.post('/auth/login', body),
    me: () => api.get('/auth/me'),
    updatePassword: (body: any) => api.post('/auth/password', body),
    getDemoUsers: () => api.get('/auth/demo-users'),
  },

  // Branches
  branches: {
    getAll: (params?: any) => api.get(`/branches${toQueryString(params)}`),
    getById: (id: number) => api.get(`/branches/${id}`),
    create: (data: any) => api.post('/branches', data),
    update: (id: number, data: any) => api.put(`/branches/${id}`, data),
    delete: (id: number) => api.delete(`/branches/${id}`),
    getDashboard: (id: number) => api.get(`/branches/${id}/dashboard`),
  },

  // Staff
  staff: {
    getAll: (params?: any) => api.get(`/staff${toQueryString(params)}`),
    getById: (id: number) => api.get(`/staff/${id}`),
    create: (data: any) => api.post('/staff', data),
    update: (id: number, data: any) => api.put(`/staff/${id}`, data),
    getDesignations: () => api.get('/staff/meta/designations'),
    getDepartments: () => api.get('/staff/meta/departments'),
  },

  // Tasks
  tasks: {
    getAll: (params?: any) => api.get(`/tasks${toQueryString(params)}`),
    getById: (id: number) => api.get(`/tasks/${id}`),
    create: (data: any) => api.post('/tasks', data),
    updateStatus: (id: number, status: string, remarks?: string) =>
      api.put(`/tasks/${id}/status`, { status, remarks }),
    reassign: (id: number, assigned_to: number) =>
      api.put(`/tasks/${id}/reassign`, { assigned_to }),
    addComment: (id: number, comment: string) =>
      api.post(`/tasks/${id}/comments`, { comment }),
  },

  // Instructions
  instructions: {
    getAll: (params?: any) => api.get(`/instructions${toQueryString(params)}`),
    getById: (id: number) => api.get(`/instructions/${id}`),
    create: (data: any) => api.post('/instructions', data),
    acknowledge: (id: number) => api.put(`/instructions/${id}/ack`),
    complete: (id: number, completion_remarks: string) =>
      api.put(`/instructions/${id}/complete`, { completion_remarks }),
    addComment: (id: number, comment: string) =>
      api.post(`/instructions/${id}/comments`, { comment }),
  },

  // Targets
  targets: {
    getAll: (params?: any) => api.get(`/targets${toQueryString(params)}`),
    create: (data: any) => api.post('/targets', data),
    updateProgress: (id: number, achieved_value: number) =>
      api.put(`/targets/${id}/progress`, { achieved_value }),
    getContributingConnections: (id: number) =>
      api.get(`/targets/${id}/connections`),
  },

  // Connections
  connections: {
    getAll: (params?: any) => api.get(`/connections${toQueryString(params)}`),
    getById: (id: number) => api.get(`/connections/${id}`),
    create: (data: any) => api.post('/connections', data),
    update: (id: number, data: any) => api.put(`/connections/${id}`, data),
    getTargetContribution: (id: number) => api.get(`/connections/${id}/target-contribution`),
  },

  // Reports
  reports: {
    get: (type: string, params?: any) => api.get(`/reports/${type}${toQueryString(params)}`),
    exportCsv: async (type: string, params?: any): Promise<Blob> => {
      const token = getAuthToken();
      const q = toQueryString(params);
      const response = await fetch(`${BASE_URL}/reports/${type}/csv${q}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to export CSV');
      return response.blob();
    },
  },

  // Audit
  audit: {
    getAll: (params?: any) => api.get(`/audit${toQueryString(params)}`),
  },

  // Settings
  settings: {
    get: () => api.get('/settings'),
    updateWeights: (weights: any) => api.put('/settings/weights', weights),
    updateCompany: (company: any) => api.put('/settings/company', company),
    resetDemo: () => api.post('/settings/reset-demo'),
  },

  // Dashboard & Performance
  dashboard: {
    getExecutive: () => api.get('/dashboard/executive'),
    getBranch: (branchId: number) => api.get(`/dashboard/branch/${branchId}`),
    getStaff: () => api.get('/dashboard/staff'),
  },

  performance: {
    getTaskPodium: (params?: any) => api.get(`/performance/podium/tasks${toQueryString(params)}`),
    getBranchPodium: () => api.get('/performance/podium/branches'),
    getStaffLeaderboard: () => api.get('/performance/leaderboard/staff'),
    getBranchLeaderboard: () => api.get('/performance/leaderboard/branches'),
  },

  // NOC Incidents & Operations Escalations
  noc: {
    getAll: (params?: any) => api.get(`/noc${toQueryString(params)}`),
    getById: (id: string | number) => api.get(`/noc/${id}`),
    create: (data: any) => api.post('/noc', data),
    updateStatus: (id: string | number, data: any) => api.put(`/noc/${id}/status`, data),
    addUpdate: (id: string | number, data: { update_text: string }) => api.post(`/noc/${id}/updates`, data),
  },

  // Administration, RBAC & Roles/Permissions
  admin: {
    // Admins CRUD & Operations
    getAdmins: (params?: any) => api.get(`/admin/admins${toQueryString(params)}`),
    getAdminById: (id: number) => api.get(`/admin/admins/${id}`),
    createAdmin: (data: any) => api.post('/admin/admins', data),
    updateAdmin: (id: number, data: any) => api.put(`/admin/admins/${id}`, data),
    toggleAdminStatus: (id: number, status: 'Active' | 'Disabled') =>
      api.put(`/admin/admins/${id}/status`, { status }),
    resetAdminPassword: (id: number, newPassword: string) =>
      api.post(`/admin/admins/${id}/reset-password`, { newPassword }),
    deleteAdmin: (id: number) => api.delete(`/admin/admins/${id}`),

    // Roles CRUD & Permissions
    getRoles: () => api.get('/admin/roles'),
    getRoleById: (id: number) => api.get(`/admin/roles/${id}`),
    createRole: (data: any) => api.post('/admin/roles', data),
    updateRole: (id: number, data: any) => api.put(`/admin/roles/${id}`, data),
    deleteRole: (id: number) => api.delete(`/admin/roles/${id}`),

    // Permissions & Matrix
    getPermissions: () => api.get('/admin/permissions'),
    createPermission: (data: any) => api.post('/admin/permissions', data),
    getMatrix: () => api.get('/admin/permissions/matrix'),
    updateMatrix: (updates: { roleId: number; permissionId: number; allowed: boolean }[]) =>
      api.put('/admin/permissions/matrix', { updates }),
    updateUserOverrides: (userId: number, overrides: { permissionId: number; allowed: boolean | null }[]) =>
      api.put(`/admin/permissions/overrides/${userId}`, { overrides }),

    // Departments
    getDepartments: () => api.get('/admin/departments'),
  },

  // Goods Items Catalog
  goodsItems: {
    getAll: (params?: any) => api.get(`/goods-items${toQueryString(params)}`),
    create: (data: any) => api.post('/goods-items', data),
    update: (id: number, data: any) => api.put(`/goods-items/${id}`, data),
    toggleStatus: (id: number, active: boolean) => api.put(`/goods-items/${id}/status`, { active }),
  },

  // Goods Requests & Requisitions
  goodsRequests: {
    getAll: (params?: any) => api.get(`/goods-requests${toQueryString(params)}`),
    getById: (id: number) => api.get(`/goods-requests/${id}`),
    getStats: () => api.get('/goods-requests/stats/summary'),
    create: (data: any) => api.post('/goods-requests', data),
    update: (id: number, data: any) => api.put(`/goods-requests/${id}`, data),
    cancel: (id: number, reason?: string) => api.put(`/goods-requests/${id}/cancel`, { reason }),
    review: (id: number, data: { action: 'ACCEPT_ALL' | 'PARTIAL_ACCEPT' | 'DENY'; approvalRemarks?: string; denialReason?: string; itemDecisions?: any[] }) =>
      api.put(`/goods-requests/${id}/review`, data),
    dispatch: (id: number, data: { deliveredItems?: any[]; completionRemarks?: string }) =>
      api.put(`/goods-requests/${id}/dispatch`, data),
  },

  // Discussions & Topic-wise Chat with Operations
  discussions: {
    getAll: (params?: any) => api.get(`/discussions${toQueryString(params)}`),
    getById: (id: number) => api.get(`/discussions/${id}`),
    createTopic: (formData: FormData) => api.post('/discussions', formData),
    sendMessage: (topicId: number, formData: FormData) => api.post(`/discussions/${topicId}/messages`, formData),
    updateStatus: (topicId: number, data: { status: 'OPEN' | 'CLOSED'; closure_reason?: string }) =>
      api.put(`/discussions/${topicId}/status`, data),
  },

  // PODs (POD = DC Locations & Independent Equipment/Items)
  pods: {
    getAll: (params?: any) => api.get(`/pods${toQueryString(params)}`),
    getById: (id: number) => api.get(`/pods/${id}`),
    create: (data: any) => api.post('/pods', data),
    update: (id: number, data: any) => api.put(`/pods/${id}`, data),
    delete: (id: number) => api.delete(`/pods/${id}`),

    // Items
    getItems: (podId: number) => api.get(`/pods/${podId}/items`),
    createItem: (podId: number, data: any) => api.post(`/pods/${podId}/items`, data),
    updateItem: (podId: number, itemId: number, data: any) => api.put(`/pods/${podId}/items/${itemId}`, data),
    deleteItem: (podId: number, itemId: number) => api.delete(`/pods/${podId}/items/${itemId}`),

    // History
    getHistory: (podId: number) => api.get(`/pods/${podId}/history`),
  },
};

