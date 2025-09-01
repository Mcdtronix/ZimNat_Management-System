// Centralized API client for the frontend
// Uses Vite env var VITE_BACKEND_URL, defaulting to http://localhost:8000

export const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

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
