import client from "./client";

// ── Auth ─────────────────────────────────────────────────────────────────────
export const adminLogin = (phoneNumber, password) =>
  client.post("/admin/login", { phoneNumber, password });

// ── Access manager (RBAC) ────────────────────────────────────────────────────
export const getAccessMe = () => client.get("/admin/access/me");
export const getAdminAccounts = () => client.get("/admin/access/admins");
export const createAdminAccount = (payload) => client.post("/admin/access/admins", payload);
export const updateAdminAccount = (id, payload) => client.patch(`/admin/access/admins/${id}`, payload);
export const deleteAdminAccount = (id) => client.delete(`/admin/access/admins/${id}`);

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getAnalytics = (params) => client.get("/admin/UserAnalytics", { params });

// ── Employees (job-seeker users) ─────────────────────────────────────────────
export const getEmployees = (params) => client.get("/admin/UsersListPaginated", { params });
export const getUserDetails = (id) => client.get("/admin/userDetails", { params: { id } });
export const updateBasicDetails = (payload) => client.post("/admin/updateBasicDetails", payload);
export const updateWorkPreference = (payload) => client.post("/admin/workPreferenceDetails", payload);

// ── Employers (business owners) ──────────────────────────────────────────────
export const getEmployers = (params) =>
  client.get("/admin/businessOwnerListPaginated", { params });

// ── Job posts ────────────────────────────────────────────────────────────────
export const getJobPosts = (params) => client.get("/admin/jobPostList", { params });
export const editJobPost = (payload) => client.post("/admin/editJobPostManager", payload);
export const updatePostDate = (payload) => client.post("/admin/updatePostDate", payload);
export const toggleB2cCalls = (payload) => client.post("/admin/enableandDisableCalls", payload);
export const createPaymentLink = (payload) => client.post("/admin/jobPostPaymentLink", payload);

// ── Offer letters ────────────────────────────────────────────────────────────
export const getOfferLetters = (params) => client.get("/admin/getOfferLetter", { params });

// ── Payments ─────────────────────────────────────────────────────────────────
export const findPaymentDetails = (payload) => client.post("/admin/paymentDetailsFind", payload);

// ── Verification Center ──────────────────────────────────────────────────────
export const getUserVerifications = (params) =>
  client.get("/admin/verification/users", { params });
export const getEmployerVerifications = (params) =>
  client.get("/admin/verification/employers", { params });
export const setEmployerVerified = (id, isVerified) =>
  client.post(`/admin/verification/employer/${id}/status`, { isVerified });
export const reviewBusinessDocument = (type, id, action, remarks) =>
  client.patch(`/admin/verification/document/${type}/${id}`, { action, remarks });

// ── Verifications ────────────────────────────────────────────────────────────
export const getPendingVerifications = (params) =>
  client.get("/admin/pendingVerifications", { params });
export const approveVerification = (userId) => client.post("/admin/verify-user", { userId });
export const rejectVerification = (userId, reason) =>
  client.post("/admin/reject-verification", { userId, reason });

export const getEmployerDocuments = (params) =>
  client.get("/admin/employer-documents", { params });
export const approveEmployerDocument = (id, remarks) =>
  client.patch(`/admin/employer-document/${id}/approve`, { remarks });
export const rejectEmployerDocument = (id, remarks) =>
  client.patch(`/admin/employer-document/${id}/reject`, { remarks });

// ── Point rewards ────────────────────────────────────────────────────────────
export const getPointRewards = () => client.get("/admin/point-rewards");
export const upsertPointReward = (payload) => client.post("/admin/point-rewards", payload);

// ── API logs ─────────────────────────────────────────────────────────────────
export const getApiLogs = (params) => client.get("/admin/apiLogs", { params });

// ── Database manager (generic CRUD over all mongoose models) ────────────────
export const getCollections = () => client.get("/admin/db/collections");
export const getModelSchema = (model) => client.get(`/admin/db-schema/${model}`);
export const getDocuments = (model, params) => client.get(`/admin/db/${model}`, { params });
export const getDocument = (model, id) => client.get(`/admin/db/${model}/${id}`);
export const createDocument = (model, body) => client.post(`/admin/db/${model}`, body);
export const updateDocument = (model, id, body) => client.patch(`/admin/db/${model}/${id}`, body);
export const deleteDocument = (model, id, hard = false) =>
  client.delete(`/admin/db/${model}/${id}`, { params: hard ? { hard: "true" } : {} });
