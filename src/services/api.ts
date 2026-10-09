import {
  AutomatedSummaryResponse,
  Campus,
  EmploymentReport,
  HistoricalImportRow,
  Qualification,
  ReportFilterState,
  ReportInputPayload,
  ReportTotals,
  TestScenarioResult,
  User,
} from '../types';
import {
  loadClientVaultSnapshot,
  saveClientVaultSnapshot,
  PersistentDbSnapshot,
} from '../utils/persistentVault';

const TOKEN_STORAGE_KEY = 'som_erms_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  accountNotFound?: boolean;
  hasAdmin?: boolean;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch {
    const netErr: ApiError = new Error(
      'Unable to connect to the server. Please check your network connection or wait a moment for the server to respond.'
    );
    netErr.status = 0;
    netErr.code = 'NETWORK_ERROR';
    throw netErr;
  }

  const data = await response.json().catch(() => ({}));

  if (data && data.dbSnapshot) {
    saveClientVaultSnapshot(data.dbSnapshot);
  }

  if (!response.ok) {
    const err: ApiError = new Error(
      data.message || `Server request failed with status ${response.status}`
    );
    err.status = response.status;
    err.code = data.error;
    err.accountNotFound = Boolean(data.accountNotFound);
    if (typeof data.hasAdmin === 'boolean') {
      err.hasAdmin = data.hasAdmin;
    }
    throw err;
  }

  return data as T;
}

export const api = {
  // Reconcile persistent browser vault with backend database
  async reconcileVaultWithServer(): Promise<{
    hasAdmin: boolean;
    campuses: Campus[];
    dbSnapshot?: PersistentDbSnapshot;
  } | null> {
    try {
      const localSnap = await loadClientVaultSnapshot();
      const res = await apiRequest<{
        hasAdmin: boolean;
        campuses: Campus[];
        dbSnapshot: PersistentDbSnapshot;
      }>('/api/db/reconcile', {
        method: 'POST',
        body: JSON.stringify({ snapshot: localSnap }),
      });
      return res;
    } catch {
      return null;
    }
  },

  // Auth & Setup
  async getSetupStatus(): Promise<{ hasAdmin: boolean; campuses: Campus[] }> {
    const reconciled = await this.reconcileVaultWithServer();
    if (reconciled) {
      return {
        hasAdmin: reconciled.hasAdmin,
        campuses: reconciled.campuses,
      };
    }
    return apiRequest<{ hasAdmin: boolean; campuses: Campus[] }>('/api/auth/setup-status');
  },

  async register(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'ADMIN' | 'CAMPUS_USER';
    campusId: string | null;
  }): Promise<{ token: string; user: User; message: string }> {
    const clientVaultSnapshot = await loadClientVaultSnapshot();
    const res = await apiRequest<{
      token: string;
      user: User;
      message: string;
      dbSnapshot?: PersistentDbSnapshot;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...payload, clientVaultSnapshot }),
    });
    setStoredToken(res.token);
    if (res.dbSnapshot) {
      await saveClientVaultSnapshot(res.dbSnapshot);
    }
    return res;
  },

  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    const clientVaultSnapshot = await loadClientVaultSnapshot();
    const res = await apiRequest<{
      token: string;
      user: User;
      dbSnapshot?: PersistentDbSnapshot;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, clientVaultSnapshot }),
    });
    setStoredToken(res.token);
    if (res.dbSnapshot) {
      await saveClientVaultSnapshot(res.dbSnapshot);
    }
    return res;
  },

  async recoverSavedAccount(payload: {
    identifier: string;
    password: string;
    fullName?: string;
    role: 'ADMIN' | 'CAMPUS_USER';
    campusId: string | null;
  }): Promise<{ token: string; user: User; message: string }> {
    const clientVaultSnapshot = await loadClientVaultSnapshot();
    const res = await apiRequest<{
      token: string;
      user: User;
      message: string;
      dbSnapshot?: PersistentDbSnapshot;
    }>('/api/auth/recover-account', {
      method: 'POST',
      body: JSON.stringify({ ...payload, clientVaultSnapshot }),
    });
    setStoredToken(res.token);
    if (res.dbSnapshot) {
      await saveClientVaultSnapshot(res.dbSnapshot);
    }
    return res;
  },

  async getCurrentUser(): Promise<{ user: User }> {
    await this.reconcileVaultWithServer();
    return apiRequest<{ user: User }>('/api/auth/me');
  },

  logout(): void {
    setStoredToken(null);
  },

  // Campuses
  async getCampuses(): Promise<{ campuses: Campus[] }> {
    return apiRequest<{ campuses: Campus[] }>('/api/campuses');
  },

  async updateCampus(
    id: string,
    payload: Partial<Pick<Campus, 'campusName' | 'location' | 'status'>>
  ): Promise<{ campus: Campus }> {
    return apiRequest<{ campus: Campus }>(`/api/campuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Qualifications
  async getQualifications(): Promise<{ qualifications: Qualification[] }> {
    return apiRequest<{ qualifications: Qualification[] }>('/api/qualifications');
  },

  async createQualification(payload: {
    code: string;
    qualificationName: string;
    description?: string;
  }): Promise<{ qualification: Qualification }> {
    return apiRequest<{ qualification: Qualification }>('/api/qualifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateQualification(
    id: string,
    payload: Partial<Pick<Qualification, 'code' | 'qualificationName' | 'description' | 'status'>>
  ): Promise<{ qualification: Qualification }> {
    return apiRequest<{ qualification: Qualification }>(`/api/qualifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Users (Admin only)
  async getUsers(): Promise<{ users: User[] }> {
    return apiRequest<{ users: User[] }>('/api/users');
  },

  async createUser(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'CAMPUS_USER';
    campusId: string | null;
  }): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(
    id: string,
    payload: {
      fullName?: string;
      email?: string;
      password?: string;
      role?: 'ADMIN' | 'CAMPUS_USER';
      campusId?: string | null;
      status?: 'ACTIVE' | 'INACTIVE';
    }
  ): Promise<{ user: User }> {
    return apiRequest<{ user: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Employment Reports
  buildFilterQueryString(filters: Partial<ReportFilterState>): string {
    const params = new URLSearchParams();
    if (filters.campusId) params.set('campusId', filters.campusId);
    if (filters.yearMode) params.set('yearMode', filters.yearMode);
    if (filters.year) params.set('year', filters.year);
    if (filters.startYear !== undefined) params.set('startYear', String(filters.startYear));
    if (filters.endYear !== undefined) params.set('endYear', String(filters.endYear));
    if (filters.qualificationId) params.set('qualificationId', filters.qualificationId);
    if (filters.searchQuery) params.set('search', filters.searchQuery);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  },

  async getReports(filters: Partial<ReportFilterState> = {}): Promise<{
    reports: EmploymentReport[];
    totals: ReportTotals;
    effectiveCampusId: string;
  }> {
    const qs = this.buildFilterQueryString(filters);
    return apiRequest(`/api/reports${qs}`);
  },

  async getReportById(id: string): Promise<{ report: EmploymentReport }> {
    return apiRequest(`/api/reports/${encodeURIComponent(id)}`);
  },

  async createReport(payload: ReportInputPayload): Promise<{ report: EmploymentReport; message: string }> {
    return apiRequest('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateReport(
    id: string,
    payload: Partial<ReportInputPayload>
  ): Promise<{ report: EmploymentReport; message: string }> {
    return apiRequest(`/api/reports/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteReport(id: string): Promise<{ message: string }> {
    return apiRequest(`/api/reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async importHistoricalReports(
    records: HistoricalImportRow[]
  ): Promise<{ importedCount: number; message: string; reports: EmploymentReport[] }> {
    return apiRequest('/api/reports/import', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  // Automated Summaries & Dashboard Data
  async getAutomatedSummary(filters: Partial<ReportFilterState> = {}): Promise<AutomatedSummaryResponse> {
    const qs = this.buildFilterQueryString(filters);
    return apiRequest<AutomatedSummaryResponse>(`/api/summary${qs}`);
  },

  // System Verification & Reset
  async runVerificationTests(): Promise<{ results: TestScenarioResult[] }> {
    return apiRequest<{ results: TestScenarioResult[] }>('/api/verify-tests', {
      method: 'POST',
    });
  },

  async resetDatabase(): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/api/reset-demo', {
      method: 'POST',
    });
  },

  // Original Background Photographs (Exact Raw-Byte Preservation)
  async getBackgroundsStatus(): Promise<{
    slots: {
      slot: 'ADMIN' | 'BIGA' | 'ADLAS' | 'TALISAY' | 'MINGLANILLA';
      label: string;
      imageUrl: string;
      aliasUrl: string;
      version: number;
      sizeBytes: number;
    }[];
  }> {
    return apiRequest('/api/backgrounds/status');
  },

  async uploadOriginalBackground(payload: {
    slot: 'ADMIN' | 'BIGA' | 'ADLAS' | 'TALISAY' | 'MINGLANILLA';
    base64Data: string;
    fileName: string;
  }): Promise<{
    message: string;
    slot: string;
    version: number;
    sizeBytes: number;
  }> {
    return apiRequest('/api/backgrounds/upload-original', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
