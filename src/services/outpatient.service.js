import { apiRequest } from "./api";
import { NODE_API_BASE_URL } from "./finance.service";

export const visitService = {
  list(params = {}) {
    return apiRequest("/api/visits", { method: "GET", params });
  },
  getById(id) {
    return apiRequest(`/api/visits/${id}`, { method: "GET" });
  },
  create(payload) {
    return apiRequest("/api/visits", { method: "POST", body: payload });
  },
  updateQueueStatus(id, queueStatus) {
    return apiRequest(`/api/visits/${id}/queue-status`, {
      method: "PATCH",
      body: { queue_status: queueStatus },
    });
  },
  cancel(id) {
    return apiRequest(`/api/visits/${id}/cancel`, { method: "PATCH" });
  },
};

export const medicalRecordService = {
  getByVisit(visitId) {
    return apiRequest(`/api/visits/${visitId}/medical-record`, { method: "GET" });
  },
  upsert(visitId, payload) {
    return apiRequest(`/api/visits/${visitId}/medical-record`, {
      method: "PUT",
      body: payload,
    });
  },
  addProcedure(visitId, payload) {
    return apiRequest(`/api/visits/${visitId}/procedures`, {
      method: "POST",
      body: payload,
    });
  },
  cancelProcedure(visitProcedureId) {
    return apiRequest(`/api/visit-procedures/${visitProcedureId}/cancel`, {
      method: "PATCH",
    });
  },
};

export const prescriptionService = {
  list(params = {}) {
    return apiRequest("/api/prescriptions", { method: "GET", params });
  },
  getById(id) {
    return apiRequest(`/api/prescriptions/${id}`, { method: "GET" });
  },
  createForVisit(visitId, payload) {
    return apiRequest(`/api/visits/${visitId}/prescriptions`, {
      method: "POST",
      body: payload,
    });
  },
  dispense(id) {
    return apiRequest(`/api/prescriptions/${id}/dispense`, {
      method: "POST",
    });
  },
  cancel(id) {
    return apiRequest(`/api/prescriptions/${id}/cancel`, {
      method: "PATCH",
    });
  },
  stockMovements(params = {}) {
    return apiRequest("/api/medicine-stock-movements", {
      method: "GET",
      params,
    });
  },
};

export const labOrderService = {
  list(params = {}) {
    return apiRequest("/api/lab-orders", { method: "GET", params });
  },
  getById(id) {
    return apiRequest(`/api/lab-orders/${id}`, { method: "GET" });
  },
  createForVisit(visitId, payload) {
    return apiRequest(`/api/visits/${visitId}/lab-orders`, {
      method: "POST",
      body: payload,
    });
  },
  updateStatus(id, status) {
    return apiRequest(`/api/lab-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  saveResult(id, payload) {
    return apiRequest(`/api/lab-orders/${id}/result`, {
      method: "POST",
      body: payload,
    });
  },
};

/**
 * Node.js External Modality & Laboratory Integration Gateway service (CT-Scan, X-Ray, MRI, USG, EKG, LIS).
 */
export const labGatewayService = {
  listModalities() {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/modalities`, {
      method: "GET",
    });
  },
  checkModalityHealth(modality, params = {}) {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/modalities/${modality}/health`, {
      method: "GET",
      params,
    });
  },
  dispatchOrder(orderId, payload = {}, params = {}) {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/lab/orders/${orderId}/dispatch`, {
      method: "POST",
      body: payload,
      params,
    });
  },
  dispatchCtScan(orderId, payload = {}, params = {}) {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/lab/orders/${orderId}/ct-scan/dispatch`, {
      method: "POST",
      body: payload,
      params,
    });
  },
  syncCtScanResult(orderId, payload = {}, params = {}) {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/lab/orders/${orderId}/ct-scan/sync-result`, {
      method: "POST",
      body: payload,
      params,
    });
  },
  syncExternalResult(orderId, payload = {}, params = {}) {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/lab/orders/${orderId}/sync-external-result`, {
      method: "POST",
      body: payload,
      params,
    });
  },
  getExternalStatus(orderId) {
    return apiRequest(`${NODE_API_BASE_URL}/node-api/lab/orders/${orderId}/external-status`, {
      method: "GET",
    });
  },
};
