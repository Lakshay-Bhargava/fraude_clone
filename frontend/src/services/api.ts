import {
  DashboardStats,
  DashboardActivity,
  AdvertisementDetail,
  AdvertisementSummary,
  ThreatNetworkData,
  CaseItem,
  AlertItem,
  SystemSettings
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; database: string }>('/api/health'),

  // Dashboard
  getStats: () => request<DashboardStats>('/api/dashboard/stats'),
  getActivity: () => request<DashboardActivity[]>('/api/dashboard/activity'),

  // Advertisements & Scanner
  analyzeAd: (content: string, sourceType: string = 'text', submittedUrl?: string) =>
    request<AdvertisementDetail>('/api/ads/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, source_type: sourceType, submitted_url: submittedUrl || null }),
    }),

  uploadOcrImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/api/ads/ocr-upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'OCR upload failed' }));
      throw new Error(err.detail || 'OCR upload failed');
    }
    return response.json() as Promise<{
      success: boolean;
      extracted_text: string;
      filename: string;
      message: string;
    }>;
  },

  bulkAnalyze: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/api/ads/bulk-analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Bulk CSV analysis failed' }));
      throw new Error(err.detail || 'Bulk CSV analysis failed');
    }
    return response.json() as Promise<{
      total_submitted: number;
      successful_count: number;
      failed_count: number;
      results: Array<{ row: number; id: number; custom_id: string; risk_score: number; risk_level: string; preview: string }>;
      errors: Array<{ row: number; error: string }>;
    }>;
  },

  listAds: (params: {
    page?: number;
    limit?: number;
    search?: string;
    risk_level?: string;
    review_status?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.risk_level) query.set('risk_level', params.risk_level);
    if (params.review_status) query.set('review_status', params.review_status);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);

    return request<{
      items: AdvertisementSummary[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>(`/api/ads?${query.toString()}`);
  },

  getAdDetail: (id: number) => request<AdvertisementDetail>(`/api/ads/${id}`),

  updateAdStatus: (id: number, reviewStatus: string, notes?: string, actor?: string) =>
    request<{ message: string; old_status: string; new_status: string }>(`/api/ads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status: reviewStatus, notes, actor: actor || 'Analyst Alpha' }),
    }),

  deleteAd: (id: number) =>
    request<{ message: string }>(`/api/ads/${id}`, {
      method: 'DELETE',
    }),

  // Threat Network
  getThreatNetwork: () => request<ThreatNetworkData>('/api/network'),

  // Case Management
  listCases: (params: { status?: string; priority?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    return request<CaseItem[]>(`/api/cases?${query.toString()}`);
  },

  createCase: (payload: { title: string; description?: string; priority?: string; ad_ids?: number[]; assigned_to?: string }) =>
    request<CaseItem>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCaseDetail: (id: number) => request<CaseItem>(`/api/cases/${id}`),

  updateCase: (id: number, payload: { title?: string; description?: string; priority?: string; status?: string; assigned_to?: string; add_ad_ids?: number[] }) =>
    request<CaseItem>(`/api/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  addCaseNote: (id: number, note: string, actor?: string) =>
    request<{ id: number; case_id: number; note: string; actor: string; created_at: string }>(`/api/cases/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note, actor: actor || 'Analyst Alpha' }),
    }),

  // Alerts
  listAlerts: (params: { reviewed?: boolean; severity?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.reviewed !== undefined) query.set('reviewed', String(params.reviewed));
    if (params.severity) query.set('severity', params.severity);
    return request<AlertItem[]>(`/api/alerts?${query.toString()}`);
  },

  updateAlert: (id: number, reviewed: boolean) =>
    request<AlertItem>(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewed }),
    }),

  // Reports
  getReportsSummary: () =>
    request<{
      report_id: string;
      generated_at: string;
      classification: string;
      metrics: any;
      disclaimer: string;
    }>('/api/reports/summary'),

  getExportCsvUrl: () => `${BASE_URL}/api/reports/export`,

  // Settings
  getSettings: () => request<SystemSettings>('/api/settings'),
  updateSettings: (payload: { risk_threshold_low: number; risk_threshold_high: number; similarity_threshold: number; demo_mode: boolean }) =>
    request<{ message: string }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
