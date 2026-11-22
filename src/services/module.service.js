import { apiRequest } from "./api";

/**
 * Modules Service integrated with backend-yii2 (`/api/modules/*` — Module Code: `settings-modules`)
 */
export const moduleService = {
  /**
   * GET /api/modules
   */
  list() {
    return apiRequest("/api/modules", {
      method: "GET",
    });
  },

  /**
   * GET /api/modules/tree
   */
  getTree() {
    return apiRequest("/api/modules/tree", {
      method: "GET",
    });
  },

  /**
   * GET /api/modules/{id}
   */
  getById(id) {
    return apiRequest(`/api/modules/${id}`, {
      method: "GET",
    });
  },

  /**
   * POST /api/modules
   */
  create(payload) {
    return apiRequest("/api/modules", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PUT /api/modules/{id}
   */
  update(id, payload) {
    return apiRequest(`/api/modules/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  /**
   * DELETE /api/modules/{id}
   */
  remove(id) {
    return apiRequest(`/api/modules/${id}`, {
      method: "DELETE",
    });
  },
};
