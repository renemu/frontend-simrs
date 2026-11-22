import { apiRequest } from "./api";

/**
 * Roles & Permissions Service integrated with backend-yii2 (`/api/roles/*` — Module Code: `users-roles`)
 */
export const roleService = {
  /**
   * GET /api/roles
   */
  list() {
    return apiRequest("/api/roles", {
      method: "GET",
    });
  },

  /**
   * GET /api/roles/{id}
   */
  getById(id) {
    return apiRequest(`/api/roles/${id}`, {
      method: "GET",
    });
  },

  /**
   * POST /api/roles
   */
  create(payload) {
    return apiRequest("/api/roles", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PUT /api/roles/{id}
   */
  update(id, payload) {
    return apiRequest(`/api/roles/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  /**
   * PUT /api/roles/{id}/permissions
   */
  updatePermissions(id, modulePermission) {
    return apiRequest(`/api/roles/${id}/permissions`, {
      method: "PUT",
      body: { module_permission: modulePermission },
    });
  },

  /**
   * DELETE /api/roles/{id}
   */
  remove(id) {
    return apiRequest(`/api/roles/${id}`, {
      method: "DELETE",
    });
  },
};
