import { apiRequest } from "./api";
import { NODE_API_BASE_URL } from "./finance.service";

function isAuthoritativeHttpError(err) {
  const status = err?.status;
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 422;
}

export const reportService = {
  /**
   * Fetches aggregated SIMRS standard reports via Node.js supporting service first (FR-08 / FR-10),
   * falling back cleanly to Yii2 /api/reports/summary only when backend-node is unreachable.
   */
  async getSummary(params = {}) {
    try {
      const nodeRes = await apiRequest(
        `${NODE_API_BASE_URL}/node-api/reports/summary`,
        {
          method: "GET",
          params,
        }
      );
      return { ...nodeRes, via: "node-service" };
    } catch (err) {
      if (isAuthoritativeHttpError(err)) {
        throw err;
      }
      const yiiRes = await apiRequest("/api/reports/summary", {
        method: "GET",
        params,
      });
      return { ...yiiRes, via: "yii2-direct" };
    }
  },

  /**
   * Fetches paginated drill-down detail rows for the active SIMRS report type and filters.
   */
  async getDetails(params = {}) {
    try {
      const nodeRes = await apiRequest(
        `${NODE_API_BASE_URL}/node-api/reports/details`,
        {
          method: "GET",
          params,
        }
      );
      return { ...nodeRes, via: "node-service" };
    } catch (err) {
      if (isAuthoritativeHttpError(err)) {
        throw err;
      }
      const yiiRes = await apiRequest("/api/reports/details", {
        method: "GET",
        params,
      });
      return { ...yiiRes, via: "yii2-direct" };
    }
  },
};
