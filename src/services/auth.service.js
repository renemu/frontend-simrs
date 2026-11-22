import { apiRequest } from "./api";

/**
 * Auth & Health Service integrated with backend-yii2:
 * - GET /
 * - POST /api/auth/login
 * - GET /api/auth/me
 * - GET /api/auth/permissions
 * - PUT /api/auth/profile
 * - POST /api/auth/logout
 */
export const authService = {
  /**
   * GET / — Checks Backend Yii2 API health & application metadata (.env)
   */
  getHealthStatus() {
    return apiRequest("/", { method: "GET", skipAuth: true });
  },

  /**
   * POST /api/auth/login
   */
  login({ email, password, rememberMe = true }) {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password, rememberMe },
      skipAuth: true,
    });
  },

  /**
   * GET /api/auth/me
   */
  getMe() {
    return apiRequest("/api/auth/me", {
      method: "GET",
    });
  },

  /**
   * GET /api/auth/permissions
   */
  getPermissions(params = {}) {
    return apiRequest("/api/auth/permissions", {
      method: "GET",
      params,
    });
  },

  /**
   * PUT /api/auth/profile
   */
  updateProfile(payload) {
    return apiRequest("/api/auth/profile", {
      method: "PUT",
      body: payload,
    });
  },

  /**
   * POST /api/auth/logout
   */
  logout() {
    return apiRequest("/api/auth/logout", {
      method: "POST",
    });
  },
};
