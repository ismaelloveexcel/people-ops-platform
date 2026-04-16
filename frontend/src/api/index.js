import api from "./client";

// ── Auth ──────────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const passwordReset = (email) => api.post("/auth/password-reset", { email });

// ── Employee Profile ──────────────────────────────────────
export const getMyProfile = () => api.get("/employees/me").then((r) => r.data);

// ── Requests ──────────────────────────────────────────────
export const createRequest = (data) => api.post("/requests", data).then((r) => r.data);
export const submitRequest = (id) => api.post(`/requests/${id}/submit`).then((r) => r.data);
export const listRequests = (params) => api.get("/requests", { params }).then((r) => r.data);
export const getRequest = (id) => api.get(`/requests/${id}`).then((r) => r.data);
export const getRequestLogs = (id) => api.get(`/requests/${id}/logs`).then((r) => r.data);

// ── Grievances (employee submission) ──────────────────────
export const submitGrievance = (data) => api.post("/grievances", data).then((r) => r.data);

// ── Suggestions ───────────────────────────────────────────
export const submitSuggestion = (data) => api.post("/suggestions", data).then((r) => r.data);
export const listSuggestions = (params) => api.get("/suggestions", { params }).then((r) => r.data);
