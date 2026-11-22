const STORAGE_TOKEN_KEY = "simrs_jwt_token";
const STORAGE_USER_KEY = "simrs_auth_user";

export const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");

export function getStoredToken() {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }
}

export function getStoredAuthData() {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuthData(data) {
  if (data) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

/**
 * Custom Error class that preserves Yii2 JSON API error fields (status, errors, message).
 */
export class ApiError extends Error {
  constructor(message, status = 500, errors = null, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.payload = payload;
  }
}

/**
 * Generic HTTP request wrapper for backend-yii2 REST API.
 * Automatically attaches `Authorization: Bearer <jwt_token>` and parses standard Yii2 JSON responses.
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = "GET",
    body,
    params,
    headers = {},
    skipAuth = false,
  } = options;

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params && typeof params === "object") {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += `${url.includes("?") ? "&" : "?"}${qs}`;
    }
  }

  const reqHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  const token = getStoredToken();
  if (token && !skipAuth) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
          ? body
          : JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new ApiError(
      `Tidak dapat terhubung ke server Backend Yii2 (${API_BASE_URL}). Pastikan server berjalan di port 8080.`,
      0,
      null,
      networkErr
    );
  }

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    const text = await response.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { success: response.ok, message: text };
    }
  }

  if (!response.ok || (payload && payload.success === false)) {
    const status = (payload && payload.status) || response.status || 500;
    const errors = (payload && payload.errors) || null;
    let message =
      (payload && payload.message) ||
      (payload && payload.error) ||
      `HTTP Error ${status}`;

    if (errors && typeof errors === "object") {
      const firstFieldErrors = Object.values(errors)[0];
      if (Array.isArray(firstFieldErrors) && firstFieldErrors[0]) {
        message = firstFieldErrors[0];
      }
    }

    if (status === 401 && !skipAuth) {
      window.dispatchEvent(new CustomEvent("simrs:unauthorized"));
    }

    throw new ApiError(message, status, errors, payload);
  }

  return payload;
}
