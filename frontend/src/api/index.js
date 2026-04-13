import api from "./client";

// ── Auth ──────────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const passwordReset = (email) => api.post("/auth/password-reset", { email });

// ── Employees ─────────────────────────────────────────────
export const getMyProfile = () => api.get("/employees/me").then((r) => r.data);
export const listEmployees = (params) => api.get("/employees", { params }).then((r) => r.data);
export const createEmployee = (data) => api.post("/employees", data).then((r) => r.data);
export const updateEmployee = (id, data) => api.patch(`/employees/${id}`, data).then((r) => r.data);
export const deactivateEmployee = (id) => api.delete(`/employees/${id}`);

// ── Requests ──────────────────────────────────────────────
export const createRequest = (data) => api.post("/requests", data).then((r) => r.data);
export const submitRequest = (id) => api.post(`/requests/${id}/submit`).then((r) => r.data);
export const listRequests = (params) => api.get("/requests", { params }).then((r) => r.data);
export const getRequest = (id) => api.get(`/requests/${id}`).then((r) => r.data);
export const approveRequest = (id, data) => api.post(`/requests/${id}/approve`, data).then((r) => r.data);
export const rejectRequest = (id, data) => api.post(`/requests/${id}/reject`, data).then((r) => r.data);
export const getRequestLogs = (id) => api.get(`/requests/${id}/logs`).then((r) => r.data);

// ── Grievances ────────────────────────────────────────────
export const submitGrievance = (data) => api.post("/grievances", data).then((r) => r.data);
export const listGrievances = (params) => api.get("/grievances", { params }).then((r) => r.data);
export const getGrievance = (id) => api.get(`/grievances/${id}`).then((r) => r.data);
export const updateGrievance = (id, data) => api.patch(`/grievances/${id}`, data).then((r) => r.data);

// ── Disciplinary ──────────────────────────────────────────
export const createDisciplinaryCase = (data) => api.post("/disciplinary", data).then((r) => r.data);
export const listDisciplinaryCases = (params) => api.get("/disciplinary", { params }).then((r) => r.data);
export const getDisciplinaryCase = (id) => api.get(`/disciplinary/${id}`).then((r) => r.data);
export const updateDisciplinaryCase = (id, data) => api.patch(`/disciplinary/${id}`, data).then((r) => r.data);

// ── Acting MD ─────────────────────────────────────────────
export const assignActingMD = (data) => api.post("/acting-md", data).then((r) => r.data);
export const listActingMD = () => api.get("/acting-md").then((r) => r.data);
export const getActiveActingMD = () => api.get("/acting-md/active").then((r) => r.data);
export const expireActingMD = (id, data) => api.post(`/acting-md/${id}/expire`, data).then((r) => r.data);

// ── Suggestions ───────────────────────────────────────────
export const submitSuggestion = (data) => api.post("/suggestions", data).then((r) => r.data);
export const listSuggestions = (params) => api.get("/suggestions", { params }).then((r) => r.data);
export const updateSuggestion = (id, data) => api.patch(`/suggestions/${id}`, data).then((r) => r.data);
export const monthlyReview = (year, month) =>
  api.get("/suggestions/monthly-review", { params: { year, month } }).then((r) => r.data);

// ── AI Agent ──────────────────────────────────────────────
export const aiChat = (message, conversation_history = []) =>
  api.post("/ai/chat", { message, conversation_history }).then((r) => r.data);
