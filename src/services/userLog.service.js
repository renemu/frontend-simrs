import { apiRequest } from "./api";

/**
 * Audit Trail / User Logs Service integrated with backend-yii2 (`/api/user-logs/*` — Module Code: `users-logs`)
 */
export const userLogService = {
  /**
   * GET /api/user-logs
   * Query: search, module, action, user_id, page, per_page
   */
  list(params = {}) {
    return apiRequest("/api/user-logs", {
      method: "GET",
      params,
    });
  },

  /**
   * GET /api/user-logs/{id}
   */
  getById(id) {
    return apiRequest(`/api/user-logs/${id}`, {
      method: "GET",
    });
  },
};
