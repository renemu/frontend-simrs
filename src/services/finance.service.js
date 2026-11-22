import { apiRequest } from "./api";

export const NODE_API_BASE_URL = (
  process.env.REACT_APP_NODE_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export const billingService = {
  list(params = {}) {
    return apiRequest("/api/invoices", { method: "GET", params });
  },
  getById(id) {
    return apiRequest(`/api/invoices/${id}`, { method: "GET" });
  },
  generateForVisit(visitId, notes = "") {
    return apiRequest(`/api/visits/${visitId}/invoices`, {
      method: "POST",
      body: { notes: notes || null },
    });
  },
  revise(invoiceId, reason = "") {
    return apiRequest(`/api/invoices/${invoiceId}/revise`, {
      method: "POST",
      body: { reason: reason || null },
    });
  },
};

export const paymentService = {
  list(params = {}) {
    return apiRequest("/api/payments", { method: "GET", params });
  },
  record(invoiceId, payload, idempotencyKey) {
    return apiRequest(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      body: {
        ...payload,
        idempotency_key: idempotencyKey,
      },
    });
  },
};

export const dashboardService = {
  /**
   * Fetches aggregated dashboard metrics via Node.js supporting service first (FR-08 / FR-10),
   * falling back cleanly to Yii2 /api/dashboard/metrics if backend-node is offline.
   */
  async getSummary(params = {}) {
    try {
      const nodeRes = await apiRequest(
        `${NODE_API_BASE_URL}/node-api/dashboard/summary`,
        {
          method: "GET",
          params,
        }
      );
      return { ...nodeRes, via: "node-service" };
    } catch {
      const yiiRes = await apiRequest("/api/dashboard/metrics", {
        method: "GET",
        params,
      });
      return { ...yiiRes, via: "yii2-direct" };
    }
  },
};
