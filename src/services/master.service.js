import { apiRequest } from "./api";

function buildCrudService(basePath) {
  return {
    list(params = {}) {
      return apiRequest(basePath, { method: "GET", params });
    },
    getById(id) {
      return apiRequest(`${basePath}/${id}`, { method: "GET" });
    },
    create(payload) {
      return apiRequest(basePath, { method: "POST", body: payload });
    },
    update(id, payload) {
      return apiRequest(`${basePath}/${id}`, { method: "PUT", body: payload });
    },
    remove(id) {
      return apiRequest(`${basePath}/${id}`, { method: "DELETE" });
    },
  };
}

export const patientService = buildCrudService("/api/patients");
export const departmentService = buildCrudService("/api/departments");
export const doctorService = buildCrudService("/api/doctors");
export const scheduleService = buildCrudService("/api/doctor-schedules");
export const procedureService = buildCrudService("/api/procedures");
export const medicineService = buildCrudService("/api/medicines");
