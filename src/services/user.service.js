import { apiRequest } from "./api";

/**
 * Users Service integrated with backend-yii2 (`/api/users/*` — Module Code: `users-list`)
 */
export const userService = {
  /**
   * GET /api/users
   * Query: search, role_id, is_active, include_deleted, page, per_page
   */
  list(params = {}) {
    return apiRequest("/api/users", {
      method: "GET",
      params,
    });
  },

  /**
   * GET /api/users/{id}
   */
  getById(id) {
    return apiRequest(`/api/users/${id}`, {
      method: "GET",
    });
  },

  /**
   * POST /api/users
   */
  create(payload) {
    return apiRequest("/api/users", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PUT /api/users/{id}
   */
  update(id, payload) {
    return apiRequest(`/api/users/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  /**
   * DELETE /api/users/{id}
   * Always performs soft delete (deactivation + audit log preservation).
   */
  remove(id) {
    return apiRequest(`/api/users/${id}`, {
      method: "DELETE",
    });
  },
};
