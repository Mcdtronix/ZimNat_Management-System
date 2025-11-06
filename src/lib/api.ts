// Centralized API client for the frontend
// Uses Vite env var VITE_BACKEND_URL, defaulting to https://localhost:8000 

// Use relative path in production (Vercel proxy), absolute path in development
export const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:8000";

export function getAuthToken() {
  return localStorage.getItem("access_token");
}

export function setAuthTokens(access: string, refresh?: string) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
  // Notify listeners that auth tokens changed
  window.dispatchEvent(new Event("storage"));
}

export function clearAuthTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("storage"));
}

// Optional: global logout notifier for consumers to hook into (e.g., redirect to login)
function notifyGlobalLogout(reason: string) {
  try {
    window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }));
  } catch {
    // no-op if CustomEvent isn't supported
  }
}

// Single-flight refresh guard so only one network request runs at a time
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/jwt/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newAccess = data?.access;
      if (typeof newAccess === "string") {
        setAuthTokens(newAccess, refresh);
        return newAccess;
      }
      return null;
    } catch {
      return null;
    } finally {
      // clear the single-flight latch
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  let data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    // Attempt single refresh on 401 then retry
    if (res.status === 401) {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        const retryHeaders: HeadersInit = {
          ...headers,
          Authorization: `Bearer ${newAccess}`,
        };
        res = await fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders });
        const retryIsJson = (res.headers.get("content-type") || "").includes("application/json");
        data = retryIsJson ? await res.json() : undefined;
        if (res.ok) {
          return data as T;
        }
      } else {
        // refresh failed; clear tokens and notify globally so UI can redirect
        clearAuthTokens();
        notifyGlobalLogout("refresh_failed");
      }
    }
    // Standardize error shape
    const error = new Error((data && (data.detail || data.error)) || `Request failed: ${res.status}`) as any;
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// Auth endpoints
export function loginApi(payload: { email: string; password: string }) {
  // Backend uses SimpleJWT token obtain view; assuming path below
  return apiFetch<{ access: string; refresh: string }>("/api/auth/jwt/token/", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
}

export function registerApi(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  address_no: string;
  street: string;
  town: string;
  phone_number?: string;
  national_id?: string;
}) {
  // Backend now returns message + user (no tokens) and optional otp_hint in DEBUG
  return apiFetch<{ message: string; user: any; otp_hint?: string }>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyRegistrationOtp(payload: { email: string; code: string }) {
  return apiFetch<{ message: string }>("/api/auth/verify-otp/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendRegistrationOtp(payload: { email: string }) {
  return apiFetch<{ message: string; otp_hint?: string }>("/api/auth/resend-otp/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getUserPermissions() {
  return apiFetch("/api/user-permissions/");
}

// Password reset
export function requestPasswordReset(payload: { email: string }) {
  return apiFetch<{ message: string }>("/api/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function confirmPasswordReset(payload: { uidb64: string; token: string; new_password: string }) {
  return apiFetch<{ message: string }>("/api/auth/password-reset-confirm/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Payment API functions
export function createPaymentIntent(payload: {
  amount: number;
  policy_id: string;
  currency: string;
}) {
  return apiFetch<{ client_secret: string; payment_intent_id: string }>("/api/payments/create-payment-intent/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function confirmPayment(payload: {
  payment_intent_id: string;
  policy_id: string;
}) {
  return apiFetch<{ message: string; payment_id: string }>("/api/payments/confirm/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPayments(filters?: {
  status?: string;
  payment_method?: string;
  policy?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.payment_method) params.append('payment_method', filters.payment_method);
  if (filters?.policy) params.append('policy', filters.policy);
  
  const queryString = params.toString();
  return apiFetch(`/api/payments/${queryString ? `?${queryString}` : ''}`);
}

export function getPaymentById(paymentId: string) {
  return apiFetch(`/api/payments/${paymentId}/`);
}

export function getAllPayments(filters?: {
  status?: string;
  payment_method?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.payment_method) params.append('payment_method', filters.payment_method);
  
  const queryString = params.toString();
  return apiFetch(`/api/payments/${queryString ? `?${queryString}` : ''}`);
}

export function verifyPayment(paymentId: string, paymentProof: File) {
  const formData = new FormData();
  formData.append('payment_proof', paymentProof);
  
  return apiFetch(`/api/payments/${paymentId}/verify/`, {
    method: 'POST',
    body: formData,
  });
}

export function rejectPayment(paymentId: string) {
  return apiFetch(`/api/payments/${paymentId}/reject/`, {
    method: 'POST',
  });
}

export function processClaim(claimId: number, data: {
  action: 'approve' | 'reject' | 'investigate' | 'under_review';
  approved_amount?: string;
  notes?: string;
  rejection_reason?: string;
  priority?: string;
  requires_investigation?: boolean;
  investigation_notes?: string;
}) {
  return apiFetch(`/api/claims/${claimId}/process_claim/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getClaimApprovalHistory(claimId: number) {
  return apiFetch(`/api/claims/${claimId}/approval_history/`);
}

// Excel Export functions
export async function exportToExcel(exportType: 'policies' | 'payments' | 'quotations' | 'claims' | 'vehicles' | 'dashboard') {
  const token = getAuthToken();
  const url = `${API_BASE}/api/export/${exportType}/`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `${exportType}_export.xlsx`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Create blob and download
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// Convenience functions for each export type
export function exportPolicies() {
  return exportToExcel('policies');
}

export function exportPayments() {
  return exportToExcel('payments');
}

export function exportQuotations() {
  return exportToExcel('quotations');
}

export function exportClaims() {
  return exportToExcel('claims');
}

export function exportVehicles() {
  return exportToExcel('vehicles');
}

export function exportDashboardReport() {
  return exportToExcel('dashboard');
}
