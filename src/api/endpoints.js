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

// ── Engagement / events analytics ────────────────────────────────────────────
export const getEventStats = (params) => client.get("/admin/events/stats", { params });
export const getEventsList = (params) => client.get("/admin/events", { params });
export const getFunnelNames = () => client.get("/admin/events/funnels");
export const getFunnel = (params) => client.get("/admin/events/funnel", { params });
export const getStuckPoints = (params) => client.get("/admin/events/stuck", { params });
export const getUserTimeline = (params) => client.get("/admin/events/timeline", { params });

// ── Employees (job-seeker users) ─────────────────────────────────────────────
export const getEmployees = (params) => client.get("/admin/UsersListPaginated", { params });
export const getUserDetails = (id) => client.get("/admin/userDetails", { params: { id } });
export const updateBasicDetails = (payload) => client.post("/admin/updateBasicDetails", payload);
export const updateWorkPreference = (payload) => client.post("/admin/workPreferenceDetails", payload);

export const getEmployeeFull = (id) => client.get(`/admin/employee/${id}/full`);
export const terminateEmployee = (payload) => client.post("/admin/employee/terminate", payload);

// ── Employers (business owners) ──────────────────────────────────────────────
export const getEmployers = (params) =>
  client.get("/admin/businessOwnerListPaginated", { params });
export const getEmployerFull = (id) => client.get(`/admin/employer/${id}/full`);
export const getCompanyFull = (id) => client.get(`/admin/company/${id}/full`);
export const getBranchFull = (id) => client.get(`/admin/branch/${id}/full`);
export const getCompaniesList = (params) => client.get("/admin/companies-list", { params });
export const getBranchesList = (params) => client.get("/admin/branches-list", { params });

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
export const setEmployerVerified = (id, isVerified, msg = {}) =>
  client.post(`/admin/verification/employer/${id}/status`, { isVerified, ...msg });
export const reviewBusinessDocument = (type, id, action, remarks, msg = {}) =>
  client.patch(`/admin/verification/document/${type}/${id}`, { action, remarks, ...msg });

// ── Verifications ────────────────────────────────────────────────────────────
export const getPendingVerifications = (params) =>
  client.get("/admin/pendingVerifications", { params });
export const approveVerification = (userId, msg = {}) =>
  client.post("/admin/verify-user", { userId, ...msg });
export const rejectVerification = (userId, reason, msg = {}) =>
  client.post("/admin/reject-verification", { userId, reason, ...msg });

export const getEmployerDocuments = (params) =>
  client.get("/admin/employer-documents", { params });
export const approveEmployerDocument = (id, remarks) =>
  client.patch(`/admin/employer-document/${id}/approve`, { remarks });
export const rejectEmployerDocument = (id, remarks) =>
  client.patch(`/admin/employer-document/${id}/reject`, { remarks });

// ── Point rewards ────────────────────────────────────────────────────────────
export const getPointRewards = () => client.get("/admin/point-rewards");
export const upsertPointReward = (payload) => client.post("/admin/point-rewards", payload);

// ── Coupons ──────────────────────────────────────────────────────────────────
export const getCoupons = (params) => client.get("/admin/coupons", { params });
export const getCouponDetail = (id) => client.get(`/admin/coupons/${id}`);
export const createCoupon = (payload) => client.post("/admin/coupons", payload);
export const updateCoupon = (id, payload) => client.patch(`/admin/coupons/${id}`, payload);
export const deleteCoupon = (id) => client.delete(`/admin/coupons/${id}`);
export const getCouponRedemptions = (id, params) =>
  client.get(`/admin/coupons/${id}/redemptions`, { params });
export const searchCouponUsers = (params) => client.get("/admin/coupon-helpers/users", { params });
export const getCouponAssociations = () => client.get("/admin/coupon-helpers/associations");

// ── Notifications (admin-composed push + in-app) ─────────────────────────────
export const sendAdminNotification = (payload) => client.post("/admin/notifications/send", payload);
export const getNotificationCampaigns = (params) => client.get("/admin/notifications/campaigns", { params });
export const searchNotificationUsers = (params) => client.get("/admin/notification-helpers/users", { params });

// Notification templates (DB-managed copy, B2B/B2C variants)
export const getNotificationTemplates = () => client.get("/admin/notification-templates");
export const upsertNotificationTemplate = (payload) => client.post("/admin/notification-templates", payload);
export const deleteNotificationTemplate = (id) => client.delete(`/admin/notification-templates/${id}`);

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
